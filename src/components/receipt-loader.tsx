"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Receipt, type ReceiptData } from "@/components/receipt";
import { toTitleCase } from "@/lib/text";

export function ReceiptLoader({
  subscriberId,
  paymentId,
  showBackLink = true,
}: {
  subscriberId: string;
  paymentId: string;
  showBackLink?: boolean;
}) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const [
        { data: subscriberPayments, error: paymentsError },
        { data: subscriber, error: subscriberError },
        { data: balance, error: balanceError },
      ] = await Promise.all([
        // All payments for this subscriber, oldest first, so we can work out
        // how much had been paid as of THIS specific payment.
        supabase
          .from("payments")
          .select("*")
          .eq("subscriber_id", subscriberId)
          .order("payment_date", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("subscribers").select("*").eq("id", subscriberId).single(),
        supabase
          .from("subscriber_balances")
          .select("total_due, price_per_plot")
          .eq("subscriber_id", subscriberId)
          .maybeSingle(),
      ]);

      if (paymentsError || subscriberError || balanceError) {
        setLoading(false);
        setError(
          paymentsError?.message || subscriberError?.message || balanceError?.message || "Failed to load receipt."
        );
        return;
      }

      const payments = subscriberPayments ?? [];
      const paymentIndex = payments.findIndex((p) => p.id === paymentId);
      const payment = payments[paymentIndex];

      if (!payment) {
        setLoading(false);
        setError("Payment not found.");
        return;
      }

      // Total paid "as of" this receipt = every payment up to and including
      // this one, in chronological order — not the subscriber's current
      // running total, which would include payments made afterward.
      const totalPaidAtReceipt = payments
        .slice(0, paymentIndex + 1)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalDue = balance?.total_due ?? null;
      const balanceAtReceipt = totalDue != null ? totalDue - totalPaidAtReceipt : null;

      let estateName: string | null = null;
      if (subscriber?.estate_id) {
        const { data: estate } = await supabase
          .from("estates")
          .select("name, location")
          .eq("id", subscriber.estate_id)
          .maybeSingle();
        if (estate) estateName = `${estate.name}, ${estate.location}`;
      }

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
        totalPaid: totalPaidAtReceipt,
        balance: balanceAtReceipt,
      });
    }

    load();
  }, [subscriberId, paymentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading receipt...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error ?? "Receipt not found."}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showBackLink && (
        <Link
          href={`/subscribers/${subscriberId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy print:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to subscriber
        </Link>
      )}
      <Receipt data={data} />
    </div>
  );
}