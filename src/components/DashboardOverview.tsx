"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Building2,
  Map,
  Users,
  Landmark,
  Wallet,
  PiggyBank,
  BadgePercent,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toTitleCase } from "@/lib/text";

type Estate = {
  id: string;
  name: string;
  total_plots: number;
  available_plots: number;
};

type Subscriber = {
  id: string;
  created_at: string;
  surname: string;
  other_names: string;
  preferred_estate: string;
  status: "draft" | "registered" | "completed";
  number_of_plots: number;
  discount_amount: number | null;
  amount_purchased: number | null;
  amount_deposited: number | null;
};

type PaymentRow = {
  subscriber_id: string | null;
  amount: number;
  type: string | null;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="panel flex items-start gap-3 p-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-soft text-navy">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-lg font-bold text-navy">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    registered: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    draft: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        map[status] ?? "bg-muted"
      }`}
    >
      {toTitleCase(status)}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

export function DashboardOverview() {
  const [mounted, setMounted] = useState(false);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [paymentsBySubscriber, setPaymentsBySubscriber] = useState<
    Record<string, { paid: number; refunded: number }>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [
      { data: estateData, error: estateError },
      { data: subData, error: subError },
      { data: paymentsData },
    ] = await Promise.all([
      supabase.from("estates").select("id,name,total_plots,available_plots"),
      supabase
        .from("subscribers")
        .select(
          "id,created_at,surname,other_names,preferred_estate,status,number_of_plots,discount_amount,amount_purchased,amount_deposited"
        )
        .order("created_at", { ascending: false }),
      supabase.from("payments").select("subscriber_id,amount,type"),
    ]);

    if (estateError) setError(estateError.message);
    else if (subError) setError(subError.message);
    else {
      setEstates((estateData as Estate[]) ?? []);
      setSubscribers((subData as Subscriber[]) ?? []);

      // Same paid/refunded fold used on the Subscribers page, so the
      // numbers agree everywhere in the app.
      const byId: Record<string, { paid: number; refunded: number }> = {};
      for (const p of (paymentsData as PaymentRow[]) ?? []) {
        if (!p.subscriber_id) continue;
        const bucket = byId[p.subscriber_id] ?? (byId[p.subscriber_id] = { paid: 0, refunded: 0 });
        const amt = Number(p.amount) || 0;
        if (p.type === "refund" || amt < 0) bucket.refunded += Math.abs(amt);
        else bucket.paid += amt;
      }
      setPaymentsBySubscriber(byId);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (mounted) load();
  }, [mounted, load]);

  const metrics = useMemo(() => {
    const totalPlots = estates.reduce((sum, e) => sum + (Number(e.total_plots) || 0), 0);
    const availablePlots = estates.reduce((sum, e) => sum + (Number(e.available_plots) || 0), 0);
    const soldPlots = Math.max(totalPlots - availablePlots, 0);

    let totalLandValue = 0;
    let totalDiscount = 0;
    let totalCollected = 0;
    let totalRefunded = 0;
    let registeredCount = 0;
    let draftCount = 0;
    let completedCount = 0;

    for (const s of subscribers) {
      totalLandValue += Number(s.amount_purchased) || 0;
      totalDiscount += Number(s.discount_amount) || 0;

      const bucket = paymentsBySubscriber[s.id];
      if (bucket && (bucket.paid > 0 || bucket.refunded > 0)) {
        totalCollected += bucket.paid - bucket.refunded;
        totalRefunded += bucket.refunded;
      } else {
        totalCollected += Number(s.amount_deposited) || 0;
      }

      if (s.status === "registered") registeredCount += 1;
      else if (s.status === "completed") completedCount += 1;
      else if (s.status === "draft") draftCount += 1;
    }

    return {
      totalEstates: estates.length,
      totalPlots,
      availablePlots,
      soldPlots,
      totalSubscribers: subscribers.length,
      registeredCount,
      draftCount,
      completedCount,
      totalLandValue,
      totalDiscount,
      totalCollected,
      totalRefunded,
      outstanding: Math.max(totalLandValue - totalCollected, 0),
    };
  }, [estates, subscribers, paymentsBySubscriber]);

  const recentSubscribers = useMemo(() => subscribers.slice(0, 6), [subscribers]);

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center gap-2 p-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard...
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              icon={Building2}
              label="Estates"
              value={String(metrics.totalEstates)}
            />
            <MetricCard
              icon={Map}
              label="Plots"
              value={`${metrics.soldPlots} / ${metrics.totalPlots}`}
              hint={`${metrics.availablePlots} available`}
            />
            <MetricCard
              icon={Users}
              label="Subscribers"
              value={String(metrics.totalSubscribers)}
              hint={`${metrics.registeredCount} registered • ${metrics.draftCount} draft • ${metrics.completedCount} completed`}
            />
            <MetricCard
              icon={Landmark}
              label="Total Land Value"
              value={naira.format(metrics.totalLandValue)}
            />
            <MetricCard
              icon={Wallet}
              label="Total Collected"
              value={naira.format(metrics.totalCollected)}
              hint={
                metrics.totalRefunded > 0
                  ? `Net of ${naira.format(metrics.totalRefunded)} refunded`
                  : undefined
              }
            />
            <MetricCard
              icon={PiggyBank}
              label="Outstanding"
              value={naira.format(metrics.outstanding)}
            />
            <MetricCard
              icon={BadgePercent}
              label="Total Discount Given"
              value={naira.format(metrics.totalDiscount)}
            />
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy">
                Recent Subscribers
              </h2>
              <Link
                href="/subscribers"
                className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recentSubscribers.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No subscribers yet.
              </div>
            ) : (
              <div className="divide-y">
                {recentSubscribers.map((s) => (
                  <Link
                    key={s.id}
                    href={`/subscribers/${s.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-navy">
                        {toTitleCase(s.surname)} {toTitleCase(s.other_names)}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.preferred_estate} • {s.number_of_plots} plot(s) •{" "}
                        <span suppressHydrationWarning>{formatDate(s.created_at)}</span>
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}