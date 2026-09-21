"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Search, RefreshCw, Users, AlertCircle, Eye, Pencil, Trash2, Landmark, Wallet, PiggyBank, BadgePercent } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToasts, ToastStack } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toTitleCase } from "@/lib/text";
import { PageHeading } from "@/components/AppShell";

type Subscriber = {
  id: string;
  created_at: string;
  title: string | null;
  surname: string;
  other_names: string;
  subscribed_on: string | null;
  physical_allocation_date: string | null;
  email: string | null;
  phone: string;
  contact_address: string | null;
  profession: string | null;
  occupation: string | null;
  employer_name: string | null;
  payment_option: string;
  number_of_plots: number;
  discount_amount: number;
  amount_purchased: number | null;
  amount_deposited: number | null;
  preferred_estate: string;
  plot_preference: string[];
  plot_preference_other: string | null;
  referrer_name: string | null;
  status: "draft" | "registered" | "completed";
};

const PAYMENT_OPTIONS = ["Outright", "Quarterly", "Monthly"];
const STATUSES = ["draft", "registered", "completed"] as const;

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    registered: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    draft: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${map[status]?? "bg-muted"}`}>{toTitleCase(status)}</span>;
}

// Stable date - prevents hydration mismatch
function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toISOString().slice(0, 10); // YYYY-MM-DD - same on server & client
  } catch { return iso; }
}

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

export function SubscribersPage() {
  const [mounted, setMounted] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [estates, setEstates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // FIX: start false, not true
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [estateFilter, setEstateFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toasts, pushToast, dismissToast } = useToasts();

  useEffect(() => { setMounted(true); }, []);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [{ data, error: subError }, { data: estateData }] = await Promise.all([
      supabase.from("subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("estates").select("name").order("name"),
    ]);
    if (subError) setError(subError.message);
    else {
      setSubscribers((data as Subscriber[])?? []);
      if (estateData) setEstates(estateData.map((e) => e.name));
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (mounted) loadSubscribers(); }, [mounted, loadSubscribers]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, estateFilter, paymentFilter]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (statusFilter!== "all" && s.status!== statusFilter) return false;
      if (estateFilter!== "all" && s.preferred_estate!== estateFilter) return false;
      if (paymentFilter!== "all" && s.payment_option!== paymentFilter) return false;
      if (q) {
        const haystack = [s.surname, s.other_names, s.phone, s.email?? "", s.preferred_estate].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [subscribers, debouncedSearch, statusFilter, estateFilter, paymentFilter]);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  // Coerce with Number(): Postgres numeric columns (number_of_plots is
  // numeric(10,1) to support half-plots) are often returned as strings
  // by the client, so `sum + s.number_of_plots` would silently do
  // string concatenation instead of addition without this.
  const totalPlots = useMemo(
    () => filtered.reduce((sum, s) => sum + (Number(s.number_of_plots) || 0), 0),
    [filtered]
  );

  // Metrics for the totals bar. Note: totalCollected only reflects each
  // subscriber's initial deposit (amount_deposited) captured at
  // registration — later installment payments live in a separate
  // payments table that isn't joined into this list query, so
  // "Outstanding" here is an upper-bound estimate, not the live balance.
  const metrics = useMemo(() => {
    let totalLandValue = 0;
    let totalDiscount = 0;
    let totalCollected = 0;
    let registeredCount = 0;
    let draftCount = 0;
    for (const s of filtered) {
      totalLandValue += Number(s.amount_purchased) || 0;
      totalDiscount += Number(s.discount_amount) || 0;
      totalCollected += Number(s.amount_deposited) || 0;
      if (s.status === "registered" || s.status === "completed") registeredCount += 1;
      if (s.status === "draft") draftCount += 1;
    }
    return {
      totalLandValue,
      totalDiscount,
      totalCollected,
      outstanding: Math.max(totalLandValue - totalCollected, 0),
      registeredCount,
      draftCount,
    };
  }, [filtered]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("delete_subscriber_and_restore_plot", { p_subscriber_id: deleteTarget.id });
    if (rpcErr) {
      const { error } = await supabase.from("subscribers").delete().eq("id", deleteTarget.id);
      if (error) { setDeleting(false); pushToast("error", error.message); return; }
    }
    setDeleting(false);
    setSubscribers((prev) => prev.filter((s) => s.id!== deleteTarget.id));
    pushToast("ok", `${deleteTarget.surname} deleted.`);
    setDeleteTarget(null);
  }

  if (!mounted) return null; // Prevent hydration mismatch completely

  return (
    <div className="space-y-5">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog open={!!deleteTarget} title="Delete subscriber?" description={deleteTarget? `Remove ${deleteTarget.surname} ${deleteTarget.other_names} and restore ${deleteTarget.number_of_plots} plot(s)?` : ""} confirmLabel="Delete" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      <PageHeading
        eyebrow="BOD Properties"
        title="Subscribers"
        description={`${filtered.length} of ${subscribers.length} • ${totalPlots} plots`}
        actions={
          <button type="button" onClick={loadSubscribers} className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-3 py-2 text-sm font-medium hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          icon={Users}
          label="Subscribers"
          value={String(filtered.length)}
          hint={`${metrics.registeredCount} registered • ${metrics.draftCount} draft`}
        />
        <MetricCard
          icon={Landmark}
          label="Total Land Value"
          value={naira.format(metrics.totalLandValue)}
          hint={`${totalPlots} plot(s)`}
        />
        <MetricCard
          icon={Wallet}
          label="Total Collected"
          value={naira.format(metrics.totalCollected)}
          hint="Initial deposits only"
        />
        <MetricCard
          icon={PiggyBank}
          label="Outstanding"
          value={naira.format(metrics.outstanding)}
          hint="Excludes later installments"
        />
        <MetricCard
          icon={BadgePercent}
          label="Total Discount Given"
          value={naira.format(metrics.totalDiscount)}
        />
      </div>

      <div className="panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="field pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="field lg:col-span-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{toTitleCase(s)}</option>)}
          </select>
          <select className="field lg:col-span-2" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="all">All plans</option>{PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="field lg:col-span-3" value={estateFilter} onChange={(e) => setEstateFilter(e.target.value)}>
            <option value="all">All estates</option>{estates.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{error}</div>}

      <div className="panel overflow-hidden">
        {loading? (
          <div className="flex justify-center gap-2 p-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : filtered.length===0? (
          <div className="p-12 text-center text-sm text-muted-foreground">No subscribers</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Estate</th><th className="px-4 py-3">Plots</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Subscribed On</th><th className="px-4 py-3">Allocation Date</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {paginated.map(s => {
                    const plots = Number(s.number_of_plots) || 0;
                    const discount = Number(s.discount_amount) || 0;
                    return (
                      <tr key={s.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium text-navy">{s.surname} {s.other_names}</td>
                        <td className="px-4 py-3">{s.phone}</td>
                        <td className="px-4 py-3 max-w-[160px] truncate">{s.preferred_estate}</td>
                        <td className="px-4 py-3">{plots}</td>
                        <td className="px-4 py-3">{discount > 0 ? naira.format(discount) : "—"}</td>
                        <td className="px-4 py-3">{s.payment_option}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground" suppressHydrationWarning>{formatDate(s.subscribed_on)}</td>
                        <td className="px-4 py-3 text-muted-foreground" suppressHydrationWarning>{formatDate(s.physical_allocation_date)}</td>
                        <td className="px-4 py-3"><div className="flex justify-end gap-1"><Link href={`/subscribers/${s.id}`} className="rounded p-1.5 hover:bg-muted"><Eye className="h-4 w-4" /></Link><Link href={`/subscribers/${s.id}/edit`} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></Link><button onClick={() => setDeleteTarget(s)} className="rounded p-1.5 hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y lg:hidden">
              {paginated.map(s => {
                const plots = Number(s.number_of_plots) || 0;
                const discount = Number(s.discount_amount) || 0;
                return (
                  <div key={s.id} className="p-4">
                    <div className="font-medium text-navy">{s.surname} {s.other_names}</div>
                    <div className="text-xs text-muted-foreground">{s.phone} • {s.preferred_estate}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={s.status} />
                      <span className="text-xs">{plots} plot(s)</span>
                      {discount > 0 && <span className="text-xs text-emerald-700">-{naira.format(discount)} discount</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span suppressHydrationWarning>Subscribed: {formatDate(s.subscribed_on)}</span>
                      <span suppressHydrationWarning>Allocated: {formatDate(s.physical_allocation_date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages>1 && <div className="flex justify-between border-t px-4 py-3 text-sm"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page===1} onClick={() => setPage(p=>p-1)} className="rounded border px-3 py-1 disabled:opacity-50">Prev</button><button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="rounded border px-3 py-1 disabled:opacity-50">Next</button></div></div>}
          </>
        )}
      </div>
    </div>
  );
}