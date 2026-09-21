"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Invoice, type InvoiceData } from "@/components/invoice";
import { toTitleCase } from "@/lib/text";

// Fixed subscription term used to compute the expiry date shown on the
// invoice. Change this in one place if BOD's standard term changes, or
// swap it for a per-subscriber/per-estate value once that's tracked.
const DEFAULT_TERM_MONTHS = 12;

function addMonths(dateString: string, months: number) {
  const d = new Date(dateString);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function InvoiceLoader({
  subscriberId,
  showBackLink = true,
}: {
  subscriberId: string;
  showBackLink?: boolean;
}) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data: subscriber, error: subscriberError } = await supabase
        .from("subscribers")
        .select("*")
        .eq("id", subscriberId)
        .single();

      if (subscriberError || !subscriber) {
        setLoading(false);
        setError(subscriberError?.message ?? "Subscriber not found.");
        return;
      }

      let estateName: string | null = null;
      let estateLocation: string | null = null;
      let pricePerPlot: number | null = null;

      if (subscriber.estate_id) {
        const { data: estate } = await supabase
          .from("estates")
          .select("name, location, price_per_plot")
          .eq("id", subscriber.estate_id)
          .maybeSingle();

        if (estate) {
          estateName = estate.name;
          estateLocation = estate.location;
          pricePerPlot = estate.price_per_plot;
        }
      }

      const numberOfPlots = subscriber.number_of_plots ?? 0;
      const unitPrice = pricePerPlot ?? 0;
      const amount = unitPrice * numberOfPlots;
      // The subscribers table stores this as discount_amount (see the
      // registration form's insert) — there is no "discount" column, so
      // reading subscriber.discount was silently always undefined and
      // falling back to 0 regardless of what was actually entered.
      const discount = subscriber.discount_amount ?? 0;

      setLoading(false);
      setData({
        invoiceNumber: subscriber.id.slice(0, 8).toUpperCase(),
        invoiceDate: subscriber.created_at,
        customerId: subscriber.customer_id ?? null,
        salesRepName: subscriber.sales_rep_name ?? null,
        landLocation: estateLocation ?? subscriber.preferred_estate ?? null,
        subscriptionMethod: subscriber.payment_option ?? null,
        paymentTermMonths: DEFAULT_TERM_MONTHS,
        paymentTermExpiryDate: addMonths(subscriber.created_at, DEFAULT_TERM_MONTHS),
        billToName: `${subscriber.title ? subscriber.title + " " : ""}${toTitleCase(
          subscriber.surname
        )} ${toTitleCase(subscriber.other_names)}`,
        billToAddress: toTitleCase(subscriber.contact_address) || null,
        lineItems: [
          {
            id: subscriber.id,
            plots: numberOfPlots,
            item: "Plot of land",
            description: estateName
              ? `${numberOfPlots} plot(s) @ ${estateName}${
                  estateLocation ? `, ${estateLocation}` : ""
                }`
              : subscriber.preferred_estate ?? "",
            unitPrice,
            amount,
          },
        ],
        salesDiscount: discount,
      });
    }

    load();
  }, [subscriberId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading invoice...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error ?? "Invoice not found."}</span>
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
      <Invoice data={data} />
    </div>
  );
}