"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CongratulatoryLetter, type CongratulatoryLetterData } from "@/components/congratulatory-letter";
import { toTitleCase } from "@/lib/text";
import { nairaToWords } from "@/lib/naira-to-words";

// Map a subscriber's title to the salutation word used in "Dear ___,".
// Falls back to a neutral greeting if no title is on file.
function salutationFromTitle(title: string | null) {
  if (!title) return "Sir/Madam";
  const t = title.trim().replace(/\.$/, "").toUpperCase();
  return t || "Sir/Madam";
}

// Describes the plot quantity the way BOD's letters phrase it, e.g.
// 0.5 -> "½ A Plot of Land", 1 -> "1 Plot of Land", 2 -> "2 Plots of Land".
function describePlots(numberOfPlots: number) {
  if (numberOfPlots === 0.5) return "\u00BD A Plot of Land";
  if (numberOfPlots === 1) return "1 Plot of Land";
  return `${numberOfPlots} Plots of Land`;
}

export function CongratulatoryLetterLoader({
  subscriberId,
  showBackLink = true,
}: {
  subscriberId: string;
  showBackLink?: boolean;
}) {
  const [data, setData] = useState<CongratulatoryLetterData | null>(null);
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
      const discount = subscriber.discount ?? 0;
      const costOfLand = unitPrice * numberOfPlots - discount;

      const addressLines = (subscriber.contact_address ?? "")
        .split(",")
        .map((line: string) => toTitleCase(line.trim()))
        .filter(Boolean);

      setLoading(false);
      setData({
        date: subscriber.created_at,
        salutationTitle: salutationFromTitle(subscriber.title),
        recipientName: `${subscriber.title ? subscriber.title + " " : ""}${toTitleCase(
          subscriber.surname
        )} ${toTitleCase(subscriber.other_names)}`,
        addressLines,
        plotDescription: describePlots(numberOfPlots),
        estateName: estateName ?? subscriber.preferred_estate ?? "",
        estateLocation: estateLocation ?? "",
        costOfLand,
        costInWords: nairaToWords(costOfLand),
      });
    }

    load();
  }, [subscriberId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading letter...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error ?? "Letter not found."}</span>
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
      <CongratulatoryLetter data={data} />
    </div>
  );
}