"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Receipt, type ReceiptData } from "@/components/receipt";
import { toTitleCase } from "@/lib/text";

type PaymentRef = {
  id: string;
  amount: number;
  payment_date: string;
  method: string | null;
  note: string | null;
};

export function ReceiptModal({
  subscriberId,
  payment,
  onClose,
}: {
  subscriberId: string;
  payment: PaymentRef;
  onClose: () => void;
}) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const [
        { data: subscriber, error: subscriberError },
        { data: allPayments, error: paymentsError },
        { data: balance, error: balanceError },
      ] = await Promise.all([
        supabase.from("subscribers").select("*").eq("id", subscriberId).single(),
        supabase
          .from("payments")
          .select("id, amount, payment_date, created_at")
          .eq("subscriber_id", subscriberId)
          .order("payment_date", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("subscriber_balances")
          .select("total_due, price_per_plot")
          .eq("subscriber_id", subscriberId)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (subscriberError || paymentsError || balanceError) {
        setLoading(false);
        setError(
          subscriberError?.message || paymentsError?.message || balanceError?.message || "Failed to load receipt."
        );
        return;
      }

      // Cumulative total paid up to and including this specific payment,
      // in chronological order (by payment_date, then created_at as tiebreaker).
      let cumulativePaid = 0;
      for (const p of allPayments ?? []) {
        cumulativePaid += Number(p.amount);
        if (p.id === payment.id) break;
      }

      let estateName: string | null = null;
      if (subscriber?.estate_id) {
        const { data: estate } = await supabase
          .from("estates")
          .select("name, location")
          .eq("id", subscriber.estate_id)
          .maybeSingle();
        if (estate) estateName = `${estate.name}, ${estate.location}`;
      }

      if (cancelled) return;

      const totalDue = balance?.total_due ?? null;

      setLoading(false);
      setData({
        receiptNo: payment.id.slice(0, 8).toUpperCase(),
        paymentDate: payment.payment_date,
        amount: payment.amount,
        method: payment.method,
        note: payment.note,
        subscriberName: `${subscriber.title ? subscriber.title + " " : ""}${toTitleCase(
          subscriber.surname
        )} ${toTitleCase(subscriber.other_names)}`,
        subscriberPhone: subscriber.phone,
        subscriberEmail: subscriber.email,
        estateName: estateName ?? subscriber.preferred_estate ?? null,
        numberOfPlots: subscriber.number_of_plots,
        pricePerPlot: balance?.price_per_plot ?? null,
        totalDue,
        totalPaid: cumulativePaid,
        balance: totalDue != null ? totalDue - cumulativePaid : null,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [subscriberId, payment.id, payment.amount, payment.payment_date, payment.method, payment.note]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 print:static print:bg-transparent print:p-0">
      <div className="w-full max-w-2xl print:max-w-none">
        <div className="mb-3 flex justify-end print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface p-2 text-muted-foreground shadow-md hover:bg-muted hover:text-navy"
            aria-label="Close receipt"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-surface p-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading receipt...
          </div>
        ) : error || !data ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error ?? "Receipt not found."}</span>
          </div>
        ) : (
          <Receipt data={data} />
        )}
      </div>
    </div>
  );
}