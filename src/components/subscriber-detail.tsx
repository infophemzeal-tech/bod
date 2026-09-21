"use client";

import type { ElementType } from "react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  ArrowLeft,
  FileText,
  Mail,
  Clock,
  Receipt,
  LandPlot,
  Shield,
  Wrench,
  FilePenLine,
  Wallet,
  PiggyBank,
  TrendingUp,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Building2,
  Printer,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToasts, ToastStack } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PaymentsPanel } from "@/components/payments-panel";
import { Modal } from "@/components/modal";
import { InvoiceLoader } from "@/components/invoice-loader";
import { CongratulatoryLetterLoader } from "@/components/congratulatory-letter-loader";
import { toTitleCase } from "@/lib/text";

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
  employer_phone: string | null;
  employer_address: string | null;
  payment_option: string;
  number_of_plots: number;
  discount_amount: number | null;
  amount_purchased: number | null;
  amount_deposited: number | null;
  preferred_estate: string;
  estate_id: string | null;
  plot_preference: string[];
  plot_preference_other: string | null;
  referrer_name: string | null;
  referrer_occupation: string | null;
  referrer_phone: string | null;
  referrer_address: string | null;
  status: "draft" | "registered" | "completed";
  legal_fee_applicable: boolean | null;
  allocation_fee_applicable: boolean | null;
  maintenance_fee_applicable: boolean | null;
  security_fee_applicable: boolean | null;
  form_fee_applicable: boolean | null;
  // Per-subscriber fixed fee overrides. null = use the default calc
  // (% of land value for legal/allocation, monthly rate × months for
  // maintenance/security, flat FORM_FEE for form).
  legal_fee_amount: number | null;
  allocation_fee_amount: number | null;
  maintenance_fee_amount: number | null;
  security_fee_amount: number | null;
  form_fee_amount: number | null;
};

type PaymentRow = {
  amount: number;
  type: string | null;
  fee_type: FeeType | null;
  created_at: string;
};

type EstatePrice = {
  price_per_plot: number;
  name: string;
  legal_fee_percent: number | null;
  allocation_fee_percent: number | null;
};

type FeeType = "land" | "legal" | "allocation" | "maintenance" | "security" | "form";

type FeeRow = {
  key: FeeType;
  label: string;
  due: number;
  paid: number;
  outstanding: number;
  note: string;
  icon: ElementType;
  applicable: boolean;
};

const PAYMENT_TERM_MONTHS = 12;
const MONTHLY_MAINTENANCE_FEE = 2500;
const MONTHLY_SECURITY_FEE = 2500;
const FORM_FEE = 5000;
const DEFAULT_LEGAL_PCT = 2;
const DEFAULT_ALLOCATION_PCT = 3;

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function formatDateLong(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }); } catch { return iso; }
}
function formatDateISO(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return iso; }
}
function addMonths(iso: string | null, months: number) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const due = new Date(d);
  due.setMonth(d.getMonth() + months);
  return due;
}
function monthsElapsed(baseIso: string | null, createdAt: string) {
  const base = new Date(baseIso || createdAt);
  if (isNaN(base.getTime())) return 1;
  const now = new Date();
  let months = (now.getFullYear() - base.getFullYear()) * 12 + (now.getMonth() - base.getMonth());
  if (now.getDate() >= base.getDate()) months += 1;
  return Math.max(months, 1);
}
function sumByFeeType(payments: PaymentRow[], feeType: FeeType) {
  let paid = 0, refunded = 0;
  for (const p of payments) {
    if ((p.fee_type ?? "land") !== feeType) continue;
    const amt = Number(p.amount) || 0;
    if (p.type === "refund" || amt < 0) refunded += Math.abs(amt);
    else paid += amt;
  }
  return Math.max(paid - refunded, 0);
}
function isApplicable(flag: boolean | null | undefined) {
  return flag !== false;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Completed" },
    registered: { bg: "bg-blue-50", text: "text-blue-700", label: "Registered" },
    draft: { bg: "bg-amber-50", text: "text-amber-700", label: "Draft" },
  };
  const c = map[status] ?? { bg: "bg-muted", text: "text-foreground", label: status };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${c.bg} ${c.text}`}>{c.label}</span>;
}

function KpiCard({ icon: Icon, label, value, sub, accent, progress }: { icon: ElementType; label: string; value: string; sub?: string; accent?: "navy" | "emerald" | "amber" | "blue" | "red"; progress?: number; }) {
  const accentMap = {
    navy: "bg-slate-50 border-slate-200 text-slate-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };
  const cls = accent ? accentMap[accent] : "bg-white border-border";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cls} print:shadow-none`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-70"><Icon className="h-4 w-4" />{label}</div>
        {typeof progress === "number" && <span className="text-xs font-bold">{progress}%</span>}
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs opacity-70">{sub}</div>}
      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-current transition-all" style={{ width: `${Math.min(100, progress)}%` }} /></div>
      )}
    </div>
  );
}

export function SubscriberDetail({ id }: { id: string }) {
  const router = useRouter();
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [estate, setEstate] = useState<EstatePrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const { toasts, pushToast, dismissToast } = useToasts();
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("subscribers").select("*").eq("id", id).single();
    if (error || !data) { setLoading(false); setError(error?.message ?? "Not found"); return; }
    const sub = data as Subscriber;
    setSubscriber(sub);
    const [payRes, estRes] = await Promise.all([
      supabase.from("payments").select("amount,type,fee_type,created_at").eq("subscriber_id", id).order("created_at", { ascending: false }),
      sub.estate_id ? supabase.from("estates").select("price_per_plot,name,legal_fee_percent,allocation_fee_percent").eq("id", sub.estate_id).single() : supabase.from("estates").select("price_per_plot,name,legal_fee_percent,allocation_fee_percent").eq("name", sub.preferred_estate).maybeSingle(),
    ]);
    setPayments((payRes.data as PaymentRow[]) ?? []);
    if (estRes.data) setEstate(estRes.data as EstatePrice);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const financials = useMemo(() => {
    if (!subscriber) return null;
    const plots = Number(subscriber.number_of_plots) || 0;
    const pricePerPlot = estate?.price_per_plot || 0;
    const calcLand = plots * pricePerPlot;
    const storedLand = Number(subscriber.amount_purchased) || 0;
    const landValue = storedLand > 0 ? storedLand : calcLand;
    const discount = Number(subscriber.discount_amount) || 0;
    const payableLand = Math.max(landValue - discount, 0);
    const landPaid = sumByFeeType(payments, "land");
    const hasLandPayments = payments.some(p => (p.fee_type ?? "land") === "land");
    const landCollected = hasLandPayments ? landPaid : Number(subscriber.amount_deposited) || 0;
    const landNet = Math.max(landCollected, 0);
    const landOutstanding = Math.max(payableLand - landNet, 0);
    const landProgress = payableLand > 0 ? Math.min(100, Math.round((landNet / payableLand) * 100)) : 0;
    const usingFallbackRates = !estate;
    const noPriceConfigured = !!estate && !estate.price_per_plot;
    const legalPct = estate?.legal_fee_percent ?? DEFAULT_LEGAL_PCT;
    const allocPct = estate?.allocation_fee_percent ?? DEFAULT_ALLOCATION_PCT;

    // Fixed per-subscriber overrides win when set; otherwise fall back to
    // the default calc (% of land value / monthly rate × months / flat fee).
    const legalOverride = subscriber.legal_fee_amount;
    const allocOverride = subscriber.allocation_fee_amount;
    const maintOverride = subscriber.maintenance_fee_amount;
    const secOverride = subscriber.security_fee_amount;
    const formOverride = subscriber.form_fee_amount;

    const legalDue = legalOverride != null ? Number(legalOverride) : Math.round((landValue * legalPct) / 100);
    const allocDue = allocOverride != null ? Number(allocOverride) : Math.round((landValue * allocPct) / 100);
    const months = monthsElapsed(subscriber.subscribed_on, subscriber.created_at);
    const maintDue = maintOverride != null ? Number(maintOverride) : MONTHLY_MAINTENANCE_FEE * months;
    const secDue = secOverride != null ? Number(secOverride) : MONTHLY_SECURITY_FEE * months;
    const formDue = formOverride != null ? Number(formOverride) : FORM_FEE;

    const applicability: Record<Exclude<FeeType, "land">, boolean> = {
      legal: isApplicable(subscriber.legal_fee_applicable),
      allocation: isApplicable(subscriber.allocation_fee_applicable),
      maintenance: isApplicable(subscriber.maintenance_fee_applicable),
      security: isApplicable(subscriber.security_fee_applicable),
      form: isApplicable(subscriber.form_fee_applicable),
    };

   const otherFees: FeeRow[] = (
  [
    { key: "legal", label: "Legal Fee", due: applicability.legal ? legalDue : 0, paid: 0, outstanding: 0, note: !applicability.legal ? "Not applicable" : legalOverride != null ? `Fixed at ${naira.format(legalDue)}` : `${legalPct}% of land value`, icon: Receipt, applicable: applicability.legal },
    { key: "allocation", label: "Allocation Fee", due: applicability.allocation ? allocDue : 0, paid: 0, outstanding: 0, note: !applicability.allocation ? "Not applicable" : allocOverride != null ? `Fixed at ${naira.format(allocDue)}` : `${allocPct}% of land value`, icon: FilePenLine, applicable: applicability.allocation },
    { key: "maintenance", label: "Maintenance", due: applicability.maintenance ? maintDue : 0, paid: 0, outstanding: 0, note: !applicability.maintenance ? "Not applicable" : maintOverride != null ? `Fixed at ${naira.format(maintDue)}` : `${naira.format(MONTHLY_MAINTENANCE_FEE)}/mo × ${months} mo`, icon: Wrench, applicable: applicability.maintenance },
    { key: "security", label: "Security", due: applicability.security ? secDue : 0, paid: 0, outstanding: 0, note: !applicability.security ? "Not applicable" : secOverride != null ? `Fixed at ${naira.format(secDue)}` : `${naira.format(MONTHLY_SECURITY_FEE)}/mo × ${months} mo`, icon: Shield, applicable: applicability.security },
    { key: "form", label: "Survey", due: applicability.form ? formDue : 0, paid: 0, outstanding: 0, note: !applicability.form ? "Not applicable" : formOverride != null ? `Fixed at ${naira.format(formDue)}` : "One-time onboarding", icon: FileText, applicable: applicability.form },
  ] as Array<Omit<FeeRow, "paid" | "outstanding">>
).map(f => {
      const paid = sumByFeeType(payments, f.key);
      return { ...f, paid, outstanding: Math.max(f.due - paid, 0) };
    });

    const plotFee: FeeRow = {
      key: "land",
      label: `Plot - ${plots} plot(s)`,
      due: payableLand,
      paid: landNet,
      outstanding: landOutstanding,
      note: `${plots} × ${naira.format(pricePerPlot)}${discount > 0 ? ` - Discount ${naira.format(discount)}` : ""} • ${subscriber.preferred_estate}`,
      icon: LandPlot,
      applicable: true,
    };

    const allRows: FeeRow[] = [plotFee, ...otherFees];
    const totalFeesDue = otherFees.reduce((s, f) => s + f.due, 0);
    const totalFeesPaid = otherFees.reduce((s, f) => s + f.paid, 0);
    const totalFeesOutstanding = otherFees.reduce((s, f) => s + f.outstanding, 0);
    const grandDue = payableLand + totalFeesDue;
    const grandPaid = landNet + totalFeesPaid;
    const grandOutstanding = landOutstanding + totalFeesOutstanding;
    const grandProgress = grandDue > 0 ? Math.min(100, Math.round((grandPaid / grandDue) * 100)) : 0;
    const dueDate = addMonths(subscriber.subscribed_on || subscriber.created_at, PAYMENT_TERM_MONTHS);
    const expired = dueDate ? new Date() > dueDate && grandOutstanding > 0 : false;
    const waivedFeeLabels = otherFees.filter(f => !f.applicable).map(f => f.label);

    return {
      plots, pricePerPlot, calcLand, landValue, discount, payableLand,
      landCollected: landNet, landOutstanding, landProgress,
      otherFees, allRows, totalFeesDue, totalFeesPaid, totalFeesOutstanding,
      grandDue, grandPaid, grandOutstanding, grandProgress,
      dueDate, expired, months,
      isAllocated: !!subscriber.physical_allocation_date,
      legalPct, allocPct, usingFallbackRates, noPriceConfigured,
      applicability, waivedFeeLabels,
    };
  }, [subscriber, payments, estate]);

  // ===== PRINTING =====
  const handlePrintStatement = useCallback(() => {
    if (!subscriber || !financials) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const fullName = `${subscriber.title ? subscriber.title + " " : ""}${subscriber.surname} ${subscriber.other_names}`;
    const rowsHtml = financials.allRows.map(f => `
      <tr style="${!f.applicable ? "opacity:0.5" : ""}">
        <td>${f.label} ${!f.applicable ? "(N/A)" : ""}</td>
        <td style="text-align:right">${f.applicable ? naira.format(f.due) : "—"}</td>
        <td style="text-align:right">${f.paid > 0 ? naira.format(f.paid) : "—"}</td>
        <td style="text-align:right;font-weight:bold;color:${!f.applicable ? "#9ca3af" : f.outstanding > 0 ? "#b45309" : "#047857"}">${!f.applicable ? "—" : f.outstanding > 0 ? naira.format(f.outstanding) : "Paid"}</td>
        <td>${f.note}</td>
      </tr>
    `).join("");
    const paymentsHtml = payments.map(p => {
      const label = (p.fee_type ?? "land").toUpperCase();
      const amt = Number(p.amount);
      const isRefund = p.type === "refund" || amt < 0;
      return `<tr><td>${new Date(p.created_at).toLocaleDateString()}</td><td>${label}</td><td style="text-align:right">${naira.format(Math.abs(amt))}</td><td>${isRefund ? "Refund" : "Payment"}</td></tr>`;
    }).join("");
    win.document.write(`
      <html><head><title>Statement - ${fullName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif; color:#111; padding:40px; font-size:12px; }
        .header { display:flex; justify-content:space-between; border-bottom:3px solid #111; padding-bottom:16px; margin-bottom:24px; }
        .company { font-size:20px; font-weight:800; }
        .meta { text-align:right; font-size:11px; color:#555; }
        h1 { font-size:18px; margin:0 0 4px; }
        h2 { font-size:13px; text-transform:uppercase; margin:24px 0 12px; border-bottom:1px solid #ddd; padding-bottom:6px; }
        table { width:100%; border-collapse:collapse; margin-top:8px; }
        th { text-align:left; font-size:10px; text-transform:uppercase; color:#666; border-bottom:2px solid #111; padding:8px 6px; }
        td { padding:8px 6px; border-bottom:1px solid #e5e7eb; }
        tfoot td { font-weight:800; border-top:2px solid #111; background:#f9fafb; }
        .kpi { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin:16px 0; }
        .kpi div { border:1px solid #e5e7eb; padding:12px; border-radius:8px; }
        .kpi .label { font-size:10px; text-transform:uppercase; color:#666; font-weight:700; }
        .kpi .value { font-size:16px; font-weight:800; margin-top:4px; }
        .footer { margin-top:40px; border-top:1px solid #ddd; padding-top:12px; font-size:10px; color:#777; display:flex; justify-content:space-between; }
        @media print { body { padding:20px; } }
      </style></head>
      <body>
        <div class="header">
          <div>
            <div class="company">IMOTA PROPERTY & INVESTMENT LTD</div>
            <div style="font-size:11px; color:#555;">Estate Management • Plot Allocation • Ledger Statement</div>
            <div style="margin-top:8px;"><h1>${toTitleCase(fullName)}</h1><div style="font-size:11px; color:#555;">${subscriber.phone} • ${subscriber.email ?? ""} • ${subscriber.preferred_estate} • ${financials.plots} plot(s) • Subscribed ${formatDateLong(subscriber.subscribed_on)} • Allocation: ${financials.isAllocated ? "Yes " + formatDateLong(subscriber.physical_allocation_date) : "Nil"}<br/>${financials.waivedFeeLabels.length > 0 ? "Waived: " + financials.waivedFeeLabels.join(", ") : ""}</div></div>
          </div>
          <div class="meta">
            <div><b>STATEMENT DATE</b><br/>${new Date().toLocaleDateString("en-NG", { year:"numeric", month:"long", day:"numeric" })}</div>
            <div style="margin-top:8px;"><b>DUE DATE</b><br/>${financials.dueDate ? formatDateLong(financials.dueDate.toISOString()) : "—"}</div>
            <div style="margin-top:8px;"><b>STATUS</b><br/>${financials.expired ? "EXPIRED" : financials.grandOutstanding === 0 ? "FULLY PAID" : "ACTIVE"} • ${financials.grandProgress}%</div>
          </div>
        </div>
        <div class="kpi">
          <div><div class="label">Total Due (Land + Fees)</div><div class="value">${naira.format(financials.grandDue)}</div><div style="font-size:10px; color:#666; margin-top:4px;">Land ${naira.format(financials.payableLand)} + Fees ${naira.format(financials.totalFeesDue)}</div></div>
          <div><div class="label">Total Paid</div><div class="value" style="color:#047857;">${naira.format(financials.grandPaid)}</div></div>
          <div><div class="label">Outstanding</div><div class="value" style="color:${financials.grandOutstanding > 0 ? "#b45309" : "#047857"};">${naira.format(financials.grandOutstanding)}</div></div>
          <div><div class="label">Completion</div><div class="value">${financials.grandProgress}%</div><div style="font-size:10px; color:#666;">${financials.months} mo • Legal ${financials.legalPct}% • Alloc ${financials.allocPct}%</div></div>
        </div>
        <h2>Consolidated Ledger — Total Due = Land + Applicable Fees</h2>
        <table><thead><tr><th>Item / Fee</th><th style="text-align:right">Due</th><th style="text-align:right">Paid</th><th style="text-align:right">Outstanding</th><th>Note</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr><td>Total Due (Land + Applicable Fees)</td><td style="text-align:right">${naira.format(financials.grandDue)}</td><td style="text-align:right">${naira.format(financials.grandPaid)}</td><td style="text-align:right">${naira.format(financials.grandOutstanding)}</td><td>Land ${naira.format(financials.payableLand)} + Fees ${naira.format(financials.totalFeesDue)}</td></tr></tfoot></table>
        <h2>Payment History</h2>
        <table><thead><tr><th>Date</th><th>Fee Type</th><th style="text-align:right">Amount</th><th>Type</th></tr></thead><tbody>${paymentsHtml || '<tr><td colspan=4 style="text-align:center;color:#999;">No payments</td></tr>'}</tbody></table>
        <div class="footer"><div>Generated ${new Date().toLocaleString()} • ID: ${subscriber.id}</div><div>Signature ______________________</div></div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }, [subscriber, financials, payments]);

  const handlePrintLedger = useCallback(() => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Ledger - ${subscriber?.surname}</title><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left} th{font-size:11px;text-transform:uppercase;color:#666} .print-hidden{display:none}</style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }, [subscriber]);

  async function toggleAllocation() {
    if (!subscriber) return;
    const isAllocated = !!subscriber.physical_allocation_date;
    const newDate = isAllocated ? null : new Date().toISOString();
    setAllocating(true);
    const prev = subscriber.physical_allocation_date;
    setSubscriber({ ...subscriber, physical_allocation_date: newDate });
    const supabase = createClient();
    const { error } = await supabase.from("subscribers").update({ physical_allocation_date: newDate }).eq("id", subscriber.id);
    setAllocating(false);
    if (error) { setSubscriber({ ...subscriber, physical_allocation_date: prev }); pushToast("error", error.message); }
    else pushToast("ok", isAllocated ? "Allocation reverted to Nil" : `Allocated Yes • ${formatDateISO(newDate)}`);
  }

  async function handleDelete() {
    if (!subscriber) return; setDeleting(true);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("delete_subscriber_and_restore_plot", { p_subscriber_id: subscriber.id });
    if (rpcErr) {
      const { error } = await supabase.from("subscribers").delete().eq("id", subscriber.id);
      setDeleting(false);
      if (error) { pushToast("error", error.message); return; }
    } else setDeleting(false);
    router.push("/subscribers");
  }

  if (loading) return <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading ledger…</div>;
  if (error || !subscriber || !financials) return <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{error ?? "Not found"}</div>;

  return (
    <div className="space-y-6">
      <style>{`@media print { .print-hidden { display: none !important; } body { background: white !important; } .rounded-xl { box-shadow: none !important; } }`}</style>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog open={confirmOpen} title="Delete subscriber?" description={`Delete ${subscriber.surname} ${subscriber.other_names}? This cannot be undone.`} confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setConfirmOpen(false)} />

      <div className="flex flex-wrap items-center justify-between gap-3 print-hidden">
        <Link href="/subscribers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Subscribers</Link>
        <div className="flex gap-2">
          <button onClick={handlePrintStatement} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"><Printer className="h-4 w-4" /> Print Statement</button>
          <button onClick={handlePrintLedger} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-muted"><Download className="h-4 w-4" /> Print Ledger</button>
          <button onClick={() => setShowInvoice(true)} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-muted"><FileText className="h-4 w-4" /> Invoice</button>
          <button onClick={() => setShowLetter(true)} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-muted"><Mail className="h-4 w-4" /> Letter</button>
          <Link href={`/subscribers/${subscriber.id}/edit`} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-muted"><Pencil className="h-4 w-4" /> Edit</Link>
          <button onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100"><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      </div>

      {(financials.usingFallbackRates || financials.noPriceConfigured) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print-hidden">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {financials.usingFallbackRates
              ? <>Couldn&apos;t find this subscriber&apos;s estate record — Legal/Allocation fees below use fallback rates ({DEFAULT_LEGAL_PCT}% / {DEFAULT_ALLOCATION_PCT}%) instead of the estate&apos;s real configured rates.</>
              : <>This estate has no price per plot set, so Land Value and everything derived from it may read as ₦0.</>}
          </span>
        </div>
      )}

      {financials.waivedFeeLabels.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 print-hidden">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
          <span>{financials.waivedFeeLabels.join(", ")} {financials.waivedFeeLabels.length === 1 ? "is" : "are"} marked not applicable for this subscriber and excluded from Total Due. Change this from Edit.</span>
        </div>
      )}

      <div className={`rounded-xl border p-4 shadow-sm ${financials.expired ? "bg-red-50 border-red-200" : financials.grandOutstanding === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4 opacity-60" /><span className="text-muted-foreground">Subscribed</span><span className="font-bold">{formatDateISO(subscriber.subscribed_on || subscriber.created_at)}</span></div>
            <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 opacity-60" /><span className="text-muted-foreground">Due</span><span className="font-bold">{financials.dueDate ? formatDateISO(financials.dueDate.toISOString()) : "—"} (12mo)</span></div>
            <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4 opacity-60" /><span className="text-muted-foreground">Total Due</span><span className="font-bold">{naira.format(financials.grandDue)}</span><span className="text-xs opacity-70">(Land {naira.format(financials.payableLand)} + Fees {naira.format(financials.totalFeesDue)})</span></div>
            <div className="flex items-center gap-1.5"><PiggyBank className="h-4 w-4 opacity-60" /><span className="text-muted-foreground">Balance</span><span className={`font-bold ${financials.grandOutstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>{naira.format(financials.grandOutstanding)}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={subscriber.status} />
            {financials.expired ? <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white"><XCircle className="h-3.5 w-3.5" /> Expired</span> : financials.grandOutstanding === 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Fully Paid</span> : <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white"><TrendingUp className="h-3.5 w-3.5" /> Active {financials.grandProgress}%</span>}
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${financials.grandProgress}%` }} /></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><h1 className="text-2xl font-bold tracking-tight">{subscriber.title ? `${subscriber.title} ` : ""}{toTitleCase(subscriber.surname)} {toTitleCase(subscriber.other_names)}</h1><StatusBadge status={subscriber.status} /></div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{subscriber.preferred_estate}</span><span>•</span><span>{subscriber.phone}</span><span>•</span><span>{financials.plots} plot(s)</span></div>
            </div>
            <button onClick={toggleAllocation} disabled={allocating} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold ring-1 transition-all ${financials.isAllocated ? "bg-emerald-600 text-white ring-emerald-700 hover:bg-emerald-700" : "bg-zinc-900 text-white ring-zinc-900 hover:bg-zinc-800"} print-hidden`}>{allocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}{financials.isAllocated ? `Yes • ${formatDateLong(subscriber.physical_allocation_date)}` : "Nil • Not Allocated"}</button>
          </div>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div><h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Contact & Address</h3><div className="mt-2 space-y-2 text-sm"><div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{subscriber.phone}</span></div><div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{subscriber.email ?? "—"}</span></div><div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{toTitleCase(subscriber.contact_address) ?? "—"}</span></div><div><span className="text-muted-foreground">Subscribed:</span> <span className="font-medium">{formatDateLong(subscriber.subscribed_on)}</span></div></div></div>
            <div><h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Estate & Plot</h3><div className="mt-2 space-y-2 text-sm"><div><span className="text-muted-foreground">Estate:</span> <span className="font-medium">{subscriber.preferred_estate}</span></div><div><span className="text-muted-foreground">Plots:</span> <span className="font-medium">{financials.plots} × {naira.format(financials.pricePerPlot)} = {naira.format(financials.calcLand)}</span></div><div><span className="text-muted-foreground">Discount:</span> <span className="font-medium">{financials.discount > 0 ? naira.format(financials.discount) : "—"}</span></div><div><span className="text-muted-foreground">Payable Land:</span> <span className="font-bold">{naira.format(financials.payableLand)}</span></div></div></div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ledger Summary</h3>
          <div className="mt-3 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Land Due</span><span className="font-bold">{naira.format(financials.payableLand)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fees Due (Applicable)</span><span className="font-bold">{naira.format(financials.totalFeesDue)}</span></div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-sm"><span className="font-semibold">Total Due (Land + Fees)</span><span className="font-bold text-base">{naira.format(financials.grandDue)}</span></div>
            <div className="flex justify-between text-sm text-emerald-700"><span>Total Paid</span><span className="font-bold">{naira.format(financials.grandPaid)}</span></div>
            <div className="flex justify-between text-sm"><span className="font-semibold">Outstanding</span><span className={`font-bold ${financials.grandOutstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>{naira.format(financials.grandOutstanding)}</span></div>
            {financials.waivedFeeLabels.length > 0 && <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Waived: {financials.waivedFeeLabels.join(", ")} — not in Total Due</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={LandPlot} label="Land Value" value={naira.format(financials.landValue)} sub={`${financials.plots} plots • Discount ${naira.format(financials.discount)}`} accent="navy" progress={financials.landProgress} />
        <KpiCard icon={Receipt} label="Total Fees Due" value={naira.format(financials.totalFeesDue)} sub={`${financials.otherFees.filter(f => f.applicable).map(f => f.label).join(" + ") || "No applicable fees"} • ${financials.months} mo`} accent="blue" />
        <KpiCard icon={Wallet} label="Total Due (Land + Fees)" value={naira.format(financials.grandDue)} sub={`Land ${naira.format(financials.payableLand)} + Fees ${naira.format(financials.totalFeesDue)}`} accent="navy" progress={financials.grandProgress} />
        <KpiCard icon={PiggyBank} label="Total Paid" value={naira.format(financials.grandPaid)} sub={`Land ${naira.format(financials.landCollected)} + Fees ${naira.format(financials.totalFeesPaid)}`} accent="emerald" progress={financials.grandProgress} />
        <KpiCard icon={TrendingUp} label="Outstanding" value={naira.format(financials.grandOutstanding)} sub={`Land ${naira.format(financials.landOutstanding)} + Fees ${naira.format(financials.totalFeesOutstanding)}`} accent={financials.grandOutstanding > 0 ? "amber" : "emerald"} progress={financials.grandProgress} />
      </div>

      <div ref={printRef} className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <div><h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide"><Receipt className="h-4 w-4" /> Consolidated Ledger — Land + Fees = Total Due</h2><p className="mt-1 text-xs text-muted-foreground">Plot is included as first line. Total Due = sum of applicable lines; N/A fees excluded.</p></div>
          <div className="flex gap-2 print-hidden"><button onClick={handlePrintLedger} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"><Printer className="h-3.5 w-3.5" /> Print Ledger</button></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-5 py-3 text-left font-semibold">Item / Fee</th><th className="px-4 py-3 text-right font-semibold">Due</th><th className="px-4 py-3 text-right font-semibold">Paid</th><th className="px-4 py-3 text-right font-semibold">Outstanding</th><th className="px-4 py-3 text-left font-semibold">Note</th><th className="px-4 py-3 text-center font-semibold">Status</th></tr>
            </thead>
            <tbody className="divide-y">
              {financials.allRows.map((f) => {
                const isPaid = f.outstanding === 0 && f.due > 0;
                const Icon = f.icon;
                return (
                  <tr key={f.key} className={`hover:bg-slate-50/50 ${!f.applicable ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3"><div className="flex items-center gap-2"><div className={`grid h-7 w-7 place-items-center rounded-full ${f.key === "land" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}><Icon className="h-3.5 w-3.5" /></div><div className="font-semibold">{f.label}</div></div></td>
                    <td className="px-4 py-3 text-right font-medium">{f.applicable ? naira.format(f.due) : "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">{f.paid > 0 ? naira.format(f.paid) : "—"}</td>
                    <td className={`px-4 py-3 text-right font-bold ${f.outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}>{!f.applicable ? "—" : f.outstanding > 0 ? naira.format(f.outstanding) : "Paid"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[260px] truncate">{f.note}</td>
                    <td className="px-4 py-3 text-center">{!f.applicable ? <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-400 ring-1 ring-slate-200">N/A</span> : isPaid ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20"><CheckCircle2 className="h-3 w-3" /> Paid</span> : f.paid > 0 ? <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Part Paid</span> : <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Unpaid</span>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white">
              <tr><td className="px-5 py-3 font-bold">Total Due (Land + Applicable Fees)</td><td className="px-4 py-3 text-right font-bold">{naira.format(financials.grandDue)}</td><td className="px-4 py-3 text-right font-bold text-emerald-300">{naira.format(financials.grandPaid)}</td><td className={`px-4 py-3 text-right font-bold ${financials.grandOutstanding > 0 ? "text-amber-300" : "text-emerald-300"}`}>{naira.format(financials.grandOutstanding)}</td><td className="px-4 py-3 text-xs text-slate-300" colSpan={2}>Land {naira.format(financials.payableLand)} + Fees {naira.format(financials.totalFeesDue)}</td></tr>
            </tfoot>
          </table>
        </div>
        <div className="border-t bg-slate-50 px-5 py-3 text-xs text-muted-foreground">Maintenance & security accrue monthly from {formatDateLong(subscriber.subscribed_on)} — {financials.months} month(s) so far. Legal {financials.legalPct}% and Allocation {financials.allocPct}% are {financials.usingFallbackRates ? "fallback" : "estate-configured"}. N/A fees excluded from Total Due.</div>
      </div>

      <PaymentsPanel subscriberId={subscriber.id} />

      <Modal open={showInvoice} onClose={() => setShowInvoice(false)}><div className="print-hidden flex justify-end gap-2 p-2 border-b"><button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"><Printer className="h-3 w-3" /> Print Invoice</button></div><InvoiceLoader subscriberId={subscriber.id} showBackLink={false} /></Modal>
      <Modal open={showLetter} onClose={() => setShowLetter(false)}><div className="print-hidden flex justify-end gap-2 p-2 border-b"><button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"><Printer className="h-3 w-3" /> Print Letter</button></div><CongratulatoryLetterLoader subscriberId={subscriber.id} showBackLink={false} /></Modal>
    </div>
  );
}