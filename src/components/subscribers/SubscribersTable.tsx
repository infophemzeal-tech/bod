"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { Loader2, Search, RefreshCw, Users, AlertCircle, Eye, Pencil, Trash2, Landmark, Wallet, PiggyBank, BadgePercent, Clock, X, Filter, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToasts, ToastStack } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toTitleCase } from "@/lib/text";
import { PageHeading } from "@/components/AppShell";

type Subscriber = {
  id: string;
  created_at: string;
  surname: string;
  other_names: string;
  subscribed_on: string | null;
  physical_allocation_date: string | null;
  email: string | null;
  phone: string;
  preferred_estate: string;
  payment_option: string;
  number_of_plots: number;
  discount_amount: number;
  amount_purchased: number | null;
  amount_deposited: number | null;
  status: "draft" | "registered" | "completed";
};

type PaymentRow = { subscriber_id: string | null; amount: number; type: string | null; };
type EstatePrice = { name: string; price_per_plot: number; };

const PAYMENT_OPTIONS = ["Outright", "Quarterly", "Monthly"];
const STATUSES = ["draft", "registered", "completed"] as const;
const PAYMENT_TERM_MONTHS = 12;

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const nairaPlain = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20", registered: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20", draft: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${map[status]?? "bg-muted"}`}>{toTitleCase(status)}</span>;
}
function formatDate(iso: string | null) { if (!iso) return ""; try { return new Date(iso).toISOString().slice(0, 10); } catch { return iso?? ""; } }
function addMonths(iso: string | null, months: number) { if (!iso) return null; const d = new Date(iso); if (isNaN(d.getTime())) return null; const due = new Date(d); due.setMonth(d.getMonth() + months); return due; }
function getDueDate(s: Subscriber) { const base = s.subscribed_on || s.created_at; return addMonths(base, PAYMENT_TERM_MONTHS); }
function isExpired(dueDate: Date | null, outstanding: number) { if (!dueDate) return false; if (outstanding <= 0) return false; return new Date() > dueDate; }
function MetricCard({ icon: Icon, label, value, hint }: { icon: ElementType; label: string; value: string; hint?: string }) {
  return (<div className="panel flex items-start gap-3 p-4"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-soft text-navy"><Icon className="h-4 w-4" /></div><div className="min-w-0"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div><div className="truncate text-lg font-bold text-navy">{value}</div>{hint && <div className="text-xs text-muted-foreground">{hint}</div>}</div></div>);
}
function getCollected(s: Subscriber, bucket?: { paid: number; refunded: number }) { if (bucket && (bucket.paid > 0 || bucket.refunded > 0)) return bucket.paid - bucket.refunded; return Number(s.amount_deposited) || 0; }

export function SubscribersPage() {
  const [mounted, setMounted] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [estateList, setEstateList] = useState<EstatePrice[]>([]);
  const [estatePriceMap, setEstatePriceMap] = useState<Record<string, number>>({});
  const [paymentsBySubscriber, setPaymentsBySubscriber] = useState<Record<string, { paid: number; refunded: number }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocatingId, setAllocatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [estateFilter, setEstateFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentTermFilter, setPaymentTermFilter] = useState<"all" | "active" | "expired">("all");
  const [allocationFilter, setAllocationFilter] = useState<"all" | "yes" | "nil">("all");
  const [subFrom, setSubFrom] = useState("");
  const [subTo, setSubTo] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toasts, pushToast, dismissToast } = useToasts();

  useEffect(() => { setMounted(true); }, []);

  const loadSubscribers = useCallback(async () => {
    setLoading(true); setError(null);
    const supabase = createClient();
    const [{ data, error: subError }, { data: estateData }, { data: paymentsData }] = await Promise.all([
      supabase.from("subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("estates").select("name,price_per_plot").order("name"),
      supabase.from("payments").select("subscriber_id,amount,type"),
    ]);
    if (subError) setError(subError.message);
    else {
      setSubscribers((data as Subscriber[])?? []);
      const estates = (estateData as EstatePrice[])?? []; setEstateList(estates);
      const priceMap: Record<string, number> = {}; for (const e of estates) priceMap[e.name] = Number(e.price_per_plot) || 0; setEstatePriceMap(priceMap);
      const byId: Record<string, { paid: number; refunded: number }> = {};
      for (const p of (paymentsData as PaymentRow[])?? []) {
        if (!p.subscriber_id) continue;
        const bucket = byId[p.subscriber_id]?? (byId[p.subscriber_id] = { paid: 0, refunded: 0 });
        const amt = Number(p.amount) || 0;
        if (p.type === "refund" || amt < 0) bucket.refunded += Math.abs(amt); else bucket.paid += amt;
      }
      setPaymentsBySubscriber(byId);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (mounted) loadSubscribers(); }, [mounted, loadSubscribers]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, estateFilter, paymentFilter, paymentTermFilter, allocationFilter, subFrom, subTo, dueFrom, dueTo]);

  async function toggleAllocation(s: Subscriber) {
    const isAllocated =!!s.physical_allocation_date;
    const newDate = isAllocated? null : new Date().toISOString();
    setAllocatingId(s.id);
    setSubscribers(prev => prev.map(x => x.id === s.id? {...x, physical_allocation_date: newDate } : x));
    const supabase = createClient();
    const { error } = await supabase.from("subscribers").update({ physical_allocation_date: newDate }).eq("id", s.id);
    setAllocatingId(null);
    if (error) {
      setSubscribers(prev => prev.map(x => x.id === s.id? {...x, physical_allocation_date: s.physical_allocation_date } : x));
      pushToast("error", `Allocation update failed: ${error.message}`);
    } else {
      pushToast("ok", isAllocated? `${s.surname} allocation removed (Nil)` : `${s.surname} allocated today (Yes) - ${formatDate(newDate)}`);
    }
  }

  const activeFilterCount = [statusFilter!== "all", estateFilter!== "all", paymentFilter!== "all", paymentTermFilter!== "all", allocationFilter!== "all",!!subFrom,!!subTo,!!dueFrom,!!dueTo].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (statusFilter!== "all" && s.status!== statusFilter) return false;
      if (estateFilter!== "all" && s.preferred_estate!== estateFilter) return false;
      if (paymentFilter!== "all" && s.payment_option!== paymentFilter) return false;
      if (allocationFilter!== "all") {
        const hasAllocation =!!s.physical_allocation_date;
        if (allocationFilter === "yes" &&!hasAllocation) return false;
        if (allocationFilter === "nil" && hasAllocation) return false;
      }
      if (subFrom) { const subDate = new Date(s.subscribed_on || s.created_at); if (subDate < new Date(subFrom)) return false; }
      if (subTo) { const subDate = new Date(s.subscribed_on || s.created_at); if (subDate > new Date(subTo + "T23:59:59")) return false; }
      const plots = Number(s.number_of_plots) || 0;
      const estatePrice = estatePriceMap[s.preferred_estate] || 0;
      const landValue = Number(s.amount_purchased) || (plots * estatePrice);
      const payable = Math.max(landValue - (Number(s.discount_amount) || 0), 0);
      const collected = getCollected(s, paymentsBySubscriber[s.id]);
      const outstanding = Math.max(payable - collected, 0);
      const dueDate = getDueDate(s);
      const expired = isExpired(dueDate, outstanding);
      if (paymentTermFilter!== "all") {
        if (paymentTermFilter === "expired" &&!expired) return false;
        if (paymentTermFilter === "active" && expired) return false;
      }
      if (dueFrom && dueDate && dueDate < new Date(dueFrom)) return false;
      if (dueTo && dueDate && dueDate > new Date(dueTo + "T23:59:59")) return false;
      if (q) { const haystack = [s.surname, s.other_names, s.phone, s.email?? "", s.preferred_estate].join(" ").toLowerCase(); if (!haystack.includes(q)) return false; }
      return true;
    });
  }, [subscribers, debouncedSearch, statusFilter, estateFilter, paymentFilter, paymentTermFilter, allocationFilter, estatePriceMap, paymentsBySubscriber, subFrom, subTo, dueFrom, dueTo]);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const totalPlots = useMemo(() => filtered.reduce((sum, s) => sum + (Number(s.number_of_plots) || 0), 0), [filtered]);

  const metrics = useMemo(() => {
    let totalLandValue = 0, totalDiscount = 0, totalPayable = 0, totalCollected = 0, totalRefunded = 0, registeredCount = 0, draftCount = 0, expiredCount = 0, allocatedYes = 0, allocatedNil = 0;
    for (const s of filtered) {
      const plots = Number(s.number_of_plots) || 0; const estatePrice = estatePriceMap[s.preferred_estate] || 0;
      const landValue = Number(s.amount_purchased) || (plots * estatePrice) || 0; const discount = Number(s.discount_amount) || 0;
      const payable = Math.max(landValue - discount, 0); totalLandValue += landValue; totalDiscount += discount; totalPayable += payable;
      const bucket = paymentsBySubscriber[s.id]; const collected = getCollected(s, bucket); totalCollected += collected; if (bucket) totalRefunded += bucket.refunded;
      const outstanding = Math.max(payable - collected, 0);
      if (isExpired(getDueDate(s), outstanding)) expiredCount++;
      if (s.physical_allocation_date) allocatedYes++; else allocatedNil++;
      if (s.status === "registered" || s.status === "completed") registeredCount += 1; if (s.status === "draft") draftCount += 1;
    }
    return { totalLandValue, totalDiscount, totalPayable, totalCollected, totalRefunded, outstanding: Math.max(totalPayable - totalCollected, 0), registeredCount, draftCount, expiredCount, allocatedYes, allocatedNil };
  }, [filtered, paymentsBySubscriber, estatePriceMap]);

  function clearFilters() { setSearch(""); setStatusFilter("all"); setEstateFilter("all"); setPaymentFilter("all"); setPaymentTermFilter("all"); setAllocationFilter("all"); setSubFrom(""); setSubTo(""); setDueFrom(""); setDueTo(""); }

  // CSV DOWNLOAD
  function downloadCSV() {
    const headers = ["Name","Phone","Email","Estate","Plots","Price Per Plot","Land Value","Discount","Payable","Paid","Outstanding","Subscribed On","Due Date (12mo)","Physical Allocation","Allocation Date","Term Status","Payment Plan","Status"];

    const rows = filtered.map(s => {
      const plots = Number(s.number_of_plots) || 0;
      const estatePrice = estatePriceMap[s.preferred_estate] || 0;
      const landValue = Number(s.amount_purchased) || (plots * estatePrice) || 0;
      const discount = Number(s.discount_amount) || 0;
      const payable = Math.max(landValue - discount, 0);
      const collected = getCollected(s, paymentsBySubscriber[s.id]);
      const outstanding = Math.max(payable - collected, 0);
      const dueDate = getDueDate(s);
      const expired = isExpired(dueDate, outstanding);
      const termStatus = expired? "Expired" : outstanding > 0? "Active" : "Closed";
      const isAllocated = s.physical_allocation_date? "Yes" : "Nil";

      return [
        `"${(s.surname + " " + s.other_names).replace(/"/g, '""')}"`,
        s.phone,
        s.email?? "",
        `"${s.preferred_estate.replace(/"/g, '""')}"`,
        plots,
        estatePrice,
        landValue,
        discount,
        payable,
        collected,
        outstanding,
        formatDate(s.subscribed_on || s.created_at),
        dueDate? formatDate(dueDate.toISOString()) : "",
        isAllocated,
        formatDate(s.physical_allocation_date),
        termStatus,
        s.payment_option,
        s.status
      ].join(",");
    });

    const csvContent = [headers.join(","),...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `subscribers-${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    pushToast("ok", `Downloaded ${filtered.length} subscribers as CSV`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return; setDeleting(true);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("delete_subscriber_and_restore_plot", { p_subscriber_id: deleteTarget.id });
    if (rpcErr) { const { error } = await supabase.from("subscribers").delete().eq("id", deleteTarget.id); if (error) { setDeleting(false); pushToast("error", error.message); return; } }
    setDeleting(false); setSubscribers((prev) => prev.filter((s) => s.id!== deleteTarget.id)); pushToast("ok", `${deleteTarget.surname} deleted.`); setDeleteTarget(null);
  }

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog open={!!deleteTarget} title="Delete subscriber?" description={deleteTarget? `Remove ${deleteTarget.surname} ${deleteTarget.other_names} and restore ${deleteTarget.number_of_plots} plot(s)?` : ""} confirmLabel="Delete" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      <PageHeading eyebrow="BOD Properties" title="Subscribers" description={`${filtered.length} of ${subscribers.length} • ${totalPlots} plots • ${metrics.expiredCount} expired • ${metrics.allocatedYes} allocated`} actions={
        <div className="flex gap-2">
          <button type="button" onClick={downloadCSV} disabled={filtered.length === 0} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-50"><Download className="h-4 w-4" /> Download CSV ({filtered.length})</button>
          <button type="button" onClick={loadSubscribers} className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-3 py-2 text-sm font-medium hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading? "animate-spin" : ""}`} /> Refresh</button>
        </div>
      } />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={Users} label="Subscribers" value={String(filtered.length)} hint={`${metrics.registeredCount} reg • ${metrics.allocatedYes} Yes / ${metrics.allocatedNil} Nil`} />
        <MetricCard icon={Landmark} label="Total Land Value" value={naira.format(metrics.totalLandValue)} hint={`${totalPlots} plots • plots × price`} />
        <MetricCard icon={Wallet} label="Total Collected" value={naira.format(metrics.totalCollected)} hint={`Payable: ${naira.format(metrics.totalPayable)}`} />
        <MetricCard icon={PiggyBank} label="Outstanding" value={naira.format(metrics.outstanding)} hint={`${metrics.expiredCount} expired`} />
        <MetricCard icon={BadgePercent} label="Allocation" value={`${metrics.allocatedYes} Yes / ${metrics.allocatedNil} Nil`} hint={`Click badge to toggle`} />
      </div>

      <div className="panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy"><Filter className="h-4 w-4" /> Filters {activeFilterCount > 0 && <span className="rounded-full bg-navy px-2 py-0.5 text-xs text-white">{activeFilterCount}</span>}</div>
          {activeFilterCount > 0 && <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-navy"><X className="h-3 w-3" /> Clear all</button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className="field pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select className="field lg:col-span-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{toTitleCase(s)}</option>)}</select>
          <select className="field lg:col-span-2" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}><option value="all">All plans</option>{PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}</select>
          <select className="field lg:col-span-2" value={paymentTermFilter} onChange={(e) => setPaymentTermFilter(e.target.value as any)}><option value="all">All terms</option><option value="active">Active</option><option value="expired">Expired</option></select>
          <select className="field lg:col-span-2" value={allocationFilter} onChange={(e) => setAllocationFilter(e.target.value as any)}><option value="all">All Allocation</option><option value="yes">Allocated - Yes</option><option value="nil">Not Allocated - Nil</option></select>
          <select className="field lg:col-span-1" value={estateFilter} onChange={(e) => setEstateFilter(e.target.value)}><option value="all">All estates</option>{estateList.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}</select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t border-border pt-3">
          <div><label className="text- font-semibold uppercase tracking-wide text-muted-foreground">Subscribed From</label><input type="date" className="field mt-1" value={subFrom} onChange={e => setSubFrom(e.target.value)} /></div>
          <div><label className="text- font-semibold uppercase tracking-wide text-muted-foreground">Subscribed To</label><input type="date" className="field mt-1" value={subTo} onChange={e => setSubTo(e.target.value)} /></div>
          <div><label className="text- font-semibold uppercase tracking-wide text-muted-foreground">Due Date From (12mo)</label><input type="date" className="field mt-1" value={dueFrom} onChange={e => setDueFrom(e.target.value)} /></div>
          <div><label className="text- font-semibold uppercase tracking-wide text-muted-foreground">Due Date To</label><input type="date" className="field mt-1" value={dueTo} onChange={e => setDueTo(e.target.value)} /></div>
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{error}</div>}

      <div className="panel overflow-hidden">
        {loading? (<div className="flex justify-center gap-2 p-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>) : filtered.length === 0? (<div className="p-12 text-center text-sm text-muted-foreground">No subscribers</div>) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Estate</th>
                    <th className="px-4 py-3">Plots</th>
                    <th className="px-4 py-3">Outstanding</th>
                    <th className="px-4 py-3">Subscribed On</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Physical Allocation</th>
                    <th className="px-4 py-3">Allocation Date</th>
                    <th className="px-4 py-3">Term</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginated.map(s => {
                    const plots = Number(s.number_of_plots) || 0; const discount = Number(s.discount_amount) || 0;
                    const estatePrice = estatePriceMap[s.preferred_estate] || 0; const landValue = Number(s.amount_purchased) || (plots * estatePrice);
                    const payable = Math.max(landValue - discount, 0); const bucket = paymentsBySubscriber[s.id]; const collected = getCollected(s, bucket);
                    const outstanding = Math.max(payable - collected, 0); const dueDate = getDueDate(s); const expired = isExpired(dueDate, outstanding); const isPaid = outstanding === 0 && payable > 0;
                    const isAllocating = allocatingId === s.id;
                    return (
                      <tr key={s.id} className={`hover:bg-muted/40 ${expired? "bg-red-50/50" : ""}`}>
                        <td className="px-4 py-3 font-medium text-navy"><div>{s.surname} {s.other_names}</div><div className="text-xs text-muted-foreground">{s.phone}</div></td>
                        <td className="px-4 py-3 max-w- truncate">{s.preferred_estate}</td>
                        <td className="px-4 py-3">{plots}</td>
                        <td className="px-4 py-3"><span className={`font-bold ${isPaid? "text-emerald-600" : expired? "text-red-600" : "text-amber-600"}`}>{isPaid? "Paid" : naira.format(outstanding)}</span></td>
                        <td className="px-4 py-3 text-muted-foreground" suppressHydrationWarning>{formatDate(s.subscribed_on || s.created_at)}</td>
                        <td className="px-4 py-3 text-muted-foreground" suppressHydrationWarning>{dueDate? formatDate(dueDate.toISOString()) : ""}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleAllocation(s)} disabled={isAllocating} title="Click to toggle allocation" className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 transition-all hover:scale-105 disabled:opacity-50 ${s.physical_allocation_date? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100" : "bg-zinc-100 text-zinc-600 ring-zinc-300 hover:bg-zinc-200"}`}>
                            {isAllocating? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            {s.physical_allocation_date? "Yes" : "Nil"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground" suppressHydrationWarning>{formatDate(s.physical_allocation_date)}</td>
                        <td className="px-4 py-3">{expired? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700"><Clock className="h-3 w-3" /> Expired</span> : outstanding > 0? <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Active</span> : <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Closed</span>}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3"><div className="flex justify-end gap-1"><Link href={`/subscribers/${s.id}`} className="rounded p-1.5 hover:bg-muted"><Eye className="h-4 w-4" /></Link><Link href={`/subscribers/${s.id}/edit`} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></Link><button onClick={() => setDeleteTarget(s)} className="rounded p-1.5 hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y lg:hidden">
              {paginated.map(s => {
                const plots = Number(s.number_of_plots) || 0; const discount = Number(s.discount_amount) || 0; const estatePrice = estatePriceMap[s.preferred_estate] || 0;
                const landValue = Number(s.amount_purchased) || (plots * estatePrice); const payable = Math.max(landValue - discount, 0);
                const bucket = paymentsBySubscriber[s.id]; const collected = getCollected(s, bucket); const outstanding = Math.max(payable - collected, 0);
                const dueDate = getDueDate(s); const expired = isExpired(dueDate, outstanding); const isPaid = outstanding === 0 && payable > 0;
                const isAllocating = allocatingId === s.id;
                return (
                  <div key={s.id} className={`p-4 ${expired? "bg-red-50/50" : ""}`}>
                    <div className="flex justify-between"><div className="font-medium text-navy">{s.surname} {s.other_names} • {plots} plot(s)</div><div className="flex gap-1"><button onClick={() => toggleAllocation(s)} disabled={isAllocating} className={`rounded-full px-2 py-0.5 text- font-bold ${s.physical_allocation_date? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>{isAllocating? "..." : s.physical_allocation_date? "Yes" : "Nil"}</button>{expired && <span className="rounded-full bg-red-100 px-2 py-0.5 text- font-bold text-red-700">Expired</span>}</div></div>
                    <div className="text-xs text-muted-foreground">{s.preferred_estate} • Sub: {formatDate(s.subscribed_on || s.created_at)} → Due: {dueDate? formatDate(dueDate.toISOString()) : ""}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs"><div><div className="text-muted-foreground">Outstanding</div><div className={`font-bold ${isPaid? "text-emerald-600" : expired? "text-red-600" : "text-amber-600"}`}>{isPaid? "Paid" : naira.format(outstanding)}</div></div><div><div className="text-muted-foreground">Allocation</div><div className="font-bold">{s.physical_allocation_date? formatDate(s.physical_allocation_date) : "Nil"}</div></div><div><div className="text-muted-foreground">Status</div><StatusBadge status={s.status} /></div></div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && <div className="flex justify-between border-t px-4 py-3 text-sm"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-50">Prev</button><button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-50">Next</button></div></div>}
          </>
        )}
      </div>
    </div>
  );
}