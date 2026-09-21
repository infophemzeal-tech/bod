"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

type FeeType = "land" | "legal" | "allocation" | "maintenance" | "security" | "form";

type Payment = {
  id: string;
  subscriber_id: string;
  amount: number;
  type: string | null;
  fee_type: FeeType | null;
  created_at: string;
};

type SubscriberInfo = {
  title: string | null;
  surname: string;
  other_names: string;
  phone: string;
  amount_purchased: number | null;
  number_of_plots: number;
  discount_amount: number | null;
  subscribed_on: string | null;
  created_at: string;
  preferred_estate: string;
  estate_id: string | null;
  legal_fee_applicable: boolean | null;
  allocation_fee_applicable: boolean | null;
  maintenance_fee_applicable: boolean | null;
  security_fee_applicable: boolean | null;
  form_fee_applicable: boolean | null;
  // Per-subscriber fixed fee overrides. null = use the default calc
  // (% of land value for legal/allocation, monthly rate × months for
  // maintenance/security, flat FORM_FEE for form). Kept in sync with the
  // same columns used on the subscriber detail/edit pages.
  legal_fee_amount: number | null;
  allocation_fee_amount: number | null;
  maintenance_fee_amount: number | null;
  security_fee_amount: number | null;
  form_fee_amount: number | null;
};

type EstateInfo = {
  price_per_plot: number;
  name: string;
  legal_fee_percent: number | null;
  allocation_fee_percent: number | null;
};

const FEE_LABELS: Record<FeeType, { label: string; color: string }> = {
  land: { label: "Land / Plot", color: "bg-slate-900 text-white" },
  legal: { label: "Legal Fee", color: "bg-blue-100 text-blue-800" },
  allocation: { label: "Allocation Fee", color: "bg-purple-100 text-purple-800" },
  maintenance: { label: "Maintenance Fee", color: "bg-amber-100 text-amber-800" },
  security: { label: "Security Fee", color: "bg-zinc-100 text-zinc-800" },
  form: { label: "Survey", color: "bg-emerald-100 text-emerald-800" },
};

const MONTHLY_MAINTENANCE_FEE = 2500;
const MONTHLY_SECURITY_FEE = 2500;
const FORM_FEE = 5000;

function monthsElapsed(baseIso: string | null, createdAt: string) {
  const base = new Date(baseIso || createdAt);
  if (isNaN(base.getTime())) return 1;
  const now = new Date();
  let months = (now.getFullYear() - base.getFullYear()) * 12 + (now.getMonth() - base.getMonth());
  if (now.getDate() >= base.getDate()) months += 1;
  return Math.max(months, 1);
}

function isApplicable(flag: boolean | null | undefined) {
  return flag !== false;
}

// Escapes text before it's dropped into the printable HTML string, so a
// name/note containing < > & " doesn't break the markup or inject content.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Renders an HTML document in a hidden iframe and triggers print on it —
// isolated from the main app (no sidebar/filters in the printout) and
// without window.open()'s popup-blocker risk.
function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  win?.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    win?.focus();
    win?.print();
    setTimeout(cleanup, 2000);
  }, 200);
}

// Prints a single payment as an isolated receipt.
function printReceipt(payment: Payment, subscriber: SubscriberInfo | null) {
  const feeType = (payment.fee_type ?? "land") as FeeType;
  const meta = FEE_LABELS[feeType];
  const isRefund = payment.type === "refund" || Number(payment.amount) < 0;
  const amount = naira.format(Math.abs(Number(payment.amount)));
  const receiptNo = payment.id.slice(0, 8).toUpperCase();
  const dateStr = new Date(payment.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = new Date(payment.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  const name = subscriber
    ? [subscriber.title, subscriber.surname, subscriber.other_names].filter(Boolean).join(" ")
    : "—";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${escapeHtml(receiptNo)}</title>
<style>
  @page { size: A5; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
  .header { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
  .brand { font-size: 18px; font-weight: 800; letter-spacing: 0.04em; }
  .brand small { display: block; font-size: 10px; font-weight: 500; color: #64748b; letter-spacing: 0.06em; }
  .doc-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  td { padding: 5px 0; font-size: 12.5px; vertical-align: top; }
  .label { color: #64748b; width: 40%; }
  .value { text-align: right; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 9999px; font-size: 10.5px; font-weight: 700; background: #f1f5f9; color: #0f172a; }
  .badge.refund { background: #fee2e2; color: #b91c1c; }
  .amount-block { margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; }
  .amount-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .amount-value { font-size: 22px; font-weight: 800; }
  .amount-value.refund { color: #b91c1c; }
  .amount-value.paid { color: #047857; }
  .footer { margin-top: 40px; font-size: 10.5px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">BOD PROPERTIES<small>Estate &amp; Subscription Management</small></div>
    <div class="doc-title">${isRefund ? "Refund Receipt" : "Payment Receipt"}</div>
  </div>
  <table>
    <tr><td class="label">Receipt No.</td><td class="value">${escapeHtml(receiptNo)}</td></tr>
    <tr><td class="label">Date</td><td class="value">${escapeHtml(dateStr)}, ${escapeHtml(timeStr)}</td></tr>
    <tr><td class="label">Subscriber</td><td class="value">${escapeHtml(name)}</td></tr>
    <tr><td class="label">Phone</td><td class="value">${escapeHtml(subscriber?.phone || "—")}</td></tr>
    <tr><td class="label">Estate</td><td class="value">${escapeHtml(subscriber?.preferred_estate || "—")}</td></tr>
    <tr><td class="label">Fee Type</td><td class="value"><span class="badge${isRefund ? " refund" : ""}">${escapeHtml(meta.label)}</span></td></tr>
  </table>
  <div class="amount-block">
    <span class="amount-label">${isRefund ? "Refunded" : "Amount Paid"}</span>
    <span class="amount-value ${isRefund ? "refund" : "paid"}">${isRefund ? "-" : ""}${amount}</span>
  </div>
  <div class="footer">This is a system-generated receipt from BOD Properties. Thank you.</div>
</body>
</html>`;

  printHtml(html);
}

// Prints the full (currently filtered) payment history as one statement —
// subscriber details, summary totals, and every matching payment row.
function printStatement(
  payments: Payment[],
  subscriber: SubscriberInfo | null,
  financials: {
    payableLand: number;
    totalFeesDue: number;
    grandDue: number;
    netPaid: number;
    totalRefunded: number;
    balance: number;
    progress: number;
  },
  filterLabel: string
) {
  const name = subscriber
    ? [subscriber.title, subscriber.surname, subscriber.other_names].filter(Boolean).join(" ")
    : "—";
  const generatedAt = new Date().toLocaleString("en-NG", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const rows = payments
    .map((p) => {
      const ft = (p.fee_type ?? "land") as FeeType;
      const meta = FEE_LABELS[ft];
      const isRefund = p.type === "refund" || Number(p.amount) < 0;
      const dateStr = new Date(p.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
      const timeStr = new Date(p.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
      return `<tr>
        <td>${escapeHtml(dateStr)}<br/><span class="muted">${escapeHtml(timeStr)}</span></td>
        <td><span class="badge${isRefund ? " refund" : ""}">${escapeHtml(meta.label)}</span></td>
        <td class="right ${isRefund ? "refund-amt" : ""}">${isRefund ? "-" : ""}${naira.format(Math.abs(Number(p.amount)))}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Statement — ${escapeHtml(name)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
  .header { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
  .brand { font-size: 18px; font-weight: 800; letter-spacing: 0.04em; }
  .brand small { display: block; font-size: 10px; font-weight: 500; color: #64748b; letter-spacing: 0.06em; }
  .doc-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; text-align: right; }
  .doc-title span { display: block; font-weight: 500; text-transform: none; letter-spacing: normal; color: #94a3b8; margin-top: 2px; }
  .meta { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 12.5px; }
  .meta .label { color: #64748b; }
  .summary { margin-top: 18px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .summary .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .summary .box .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  .summary .box .val { margin-top: 3px; font-size: 15px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12.5px; }
  thead th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 6px 4px; }
  tbody td { padding: 8px 4px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .right { text-align: right; font-weight: 700; }
  .refund-amt { color: #b91c1c; }
  .muted { color: #94a3b8; font-size: 10.5px; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 9999px; font-size: 10.5px; font-weight: 700; background: #f1f5f9; color: #0f172a; }
  .badge.refund { background: #fee2e2; color: #b91c1c; }
  .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">BOD PROPERTIES<small>Estate &amp; Subscription Management</small></div>
    <div class="doc-title">Account Statement<span>Generated ${escapeHtml(generatedAt)}</span></div>
  </div>
  <div class="meta">
    <div><span class="label">Subscriber:</span> <strong>${escapeHtml(name)}</strong></div>
    <div><span class="label">Estate:</span> <strong>${escapeHtml(subscriber?.preferred_estate || "—")}</strong></div>
    <div><span class="label">Phone:</span> <strong>${escapeHtml(subscriber?.phone || "—")}</strong></div>
    <div><span class="label">Filter:</span> <strong>${escapeHtml(filterLabel)}</strong></div>
  </div>
  <div class="summary">
    <div class="box"><div class="label">Total Due</div><div class="val">${naira.format(financials.grandDue)}</div></div>
    <div class="box"><div class="label">Total Paid</div><div class="val">${naira.format(financials.netPaid)}</div></div>
    <div class="box"><div class="label">Refunded</div><div class="val">${naira.format(financials.totalRefunded)}</div></div>
    <div class="box"><div class="label">Balance</div><div class="val">${naira.format(financials.balance)}</div></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Fee Type</th><th class="right">Amount</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="3" class="muted" style="text-align:center;padding:16px 0;">No payments in this view.</td></tr>`}</tbody>
  </table>
  <div class="footer">This is a system-generated statement from BOD Properties. ${payments.length} payment(s) shown.</div>
</body>
</html>`;

  printHtml(html);
}

export function PaymentsPanel({ subscriberId }: { subscriberId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriber, setSubscriber] = useState<SubscriberInfo | null>(null);
  const [estate, setEstate] = useState<EstateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState("");
  const [feeType, setFeeType] = useState<FeeType>("land");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | FeeType>("all");

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [{ data: subData }, { data: payData }] = await Promise.all([
      supabase
        .from("subscribers")
        .select(
          "title,surname,other_names,phone,amount_purchased,number_of_plots,discount_amount,subscribed_on,created_at,preferred_estate,estate_id," +
            "legal_fee_applicable,allocation_fee_applicable,maintenance_fee_applicable,security_fee_applicable,form_fee_applicable," +
            "legal_fee_amount,allocation_fee_amount,maintenance_fee_amount,security_fee_amount,form_fee_amount"
        )
        .eq("id", subscriberId)
        .single(),
      supabase.from("payments").select("*").eq("subscriber_id", subscriberId).order("created_at", { ascending: false }),
    ]);
    if (subData) {
      setSubscriber(subData as SubscriberInfo);
      const estRes = subData.estate_id
        ? await supabase.from("estates").select("price_per_plot,name,legal_fee_percent,allocation_fee_percent").eq("id", subData.estate_id).single()
        : await supabase.from("estates").select("price_per_plot,name,legal_fee_percent,allocation_fee_percent").eq("name", subData.preferred_estate).maybeSingle();
      if (estRes.data) setEstate(estRes.data as EstateInfo);
    }
    setPayments((payData as Payment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [subscriberId]);

  const financials = useMemo(() => {
    if (!subscriber) return null;
    const plots = Number(subscriber.number_of_plots) || 0;
    const pricePerPlot = estate?.price_per_plot || 0;
    const calcLand = plots * pricePerPlot;
    const storedLand = Number(subscriber.amount_purchased) || 0;
    const landValue = storedLand > 0 ? storedLand : calcLand;
    const discount = Number(subscriber.discount_amount) || 0;
    const payableLand = Math.max(landValue - discount, 0);
    const legalPct = estate?.legal_fee_percent ?? 2;
    const allocPct = estate?.allocation_fee_percent ?? 3;
    const months = monthsElapsed(subscriber.subscribed_on, subscriber.created_at);

    // Same applicability + fixed-amount-override rules as the subscriber
    // detail page: a waived fee contributes 0; a fixed amount overrides
    // the default % / monthly-rate / flat-fee calc.
    const legalOn = isApplicable(subscriber.legal_fee_applicable);
    const allocOn = isApplicable(subscriber.allocation_fee_applicable);
    const maintOn = isApplicable(subscriber.maintenance_fee_applicable);
    const secOn = isApplicable(subscriber.security_fee_applicable);
    const formOn = isApplicable(subscriber.form_fee_applicable);

    const legalDue = legalOn ? (subscriber.legal_fee_amount != null ? Number(subscriber.legal_fee_amount) : Math.round((landValue * legalPct) / 100)) : 0;
    const allocDue = allocOn ? (subscriber.allocation_fee_amount != null ? Number(subscriber.allocation_fee_amount) : Math.round((landValue * allocPct) / 100)) : 0;
    const maintDue = maintOn ? (subscriber.maintenance_fee_amount != null ? Number(subscriber.maintenance_fee_amount) : MONTHLY_MAINTENANCE_FEE * months) : 0;
    const secDue = secOn ? (subscriber.security_fee_amount != null ? Number(subscriber.security_fee_amount) : MONTHLY_SECURITY_FEE * months) : 0;
    const formDue = formOn ? (subscriber.form_fee_amount != null ? Number(subscriber.form_fee_amount) : FORM_FEE) : 0;

    const totalFeesDue = legalDue + allocDue + maintDue + secDue + formDue;
    const grandDue = payableLand + totalFeesDue;
    let totalPaid = 0, totalRefunded = 0;
    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      if (p.type === "refund" || amt < 0) totalRefunded += Math.abs(amt);
      else totalPaid += amt;
    }
    const netPaid = Math.max(totalPaid - totalRefunded, 0);
    const balance = Math.max(grandDue - netPaid, 0);
    const progress = grandDue > 0 ? Math.round((netPaid / grandDue) * 100) : 0;
    return { payableLand, totalFeesDue, grandDue, totalPaid, totalRefunded, netPaid, balance, progress, legalDue, allocDue, maintDue, secDue, formDue, months };
  }, [subscriber, estate, payments]);

  async function handleAdd() {
    if (!amount) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("payments").insert({ subscriber_id: subscriberId, amount: Number(amount), fee_type: feeType, type: "payment" });
    setSaving(false);
    setAmount(""); setShowAdd(false); load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete payment?")) return;
    const supabase = createClient();
    await supabase.from("payments").delete().eq("id", id);
    load();
  }

  // Records a refund as its own payment row (positive amount, type
  // "refund" — the DB's check constraint rejects negative amounts, and
  // everywhere else in this file already keys off `type === "refund"`
  // rather than a negative amount) rather than mutating the original —
  // this preserves the original payment as history and lets partial
  // refunds stack, at the cost of not being able to trace a refund back
  // to one specific payment (the schema has no parent_payment_id).
  // Capped at the original payment's amount so a single refund can't
  // exceed it.
  async function handleRefund(p: Payment) {
    const isAlreadyRefund = p.type === "refund" || Number(p.amount) < 0;
    if (isAlreadyRefund) return;
    const maxAmount = Math.abs(Number(p.amount));
    const input = window.prompt(`Refund amount for this ${FEE_LABELS[(p.fee_type ?? "land") as FeeType].label} payment (max ${naira.format(maxAmount)}):`, String(maxAmount));
    if (input === null) return;
    const refundAmount = Number(input);
    if (!refundAmount || refundAmount <= 0) { alert("Enter a valid refund amount."); return; }
    if (refundAmount > maxAmount) { alert(`Refund cannot exceed ${naira.format(maxAmount)}.`); return; }
    const supabase = createClient();
    const { error } = await supabase.from("payments").insert({
      subscriber_id: subscriberId,
      amount: Math.abs(refundAmount),
      fee_type: p.fee_type ?? "land",
      type: "refund",
    });
    if (error) { alert(`Refund failed: ${error.message}`); return; }
    load();
  }

  const filtered = filter === "all" ? payments : payments.filter(p => (p.fee_type ?? "land") === filter);

  if (loading) return <div className="rounded-xl border bg-white p-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (!financials) return <div className="rounded-xl border bg-white p-6 text-sm">No data</div>;

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">Payments — Land + Fees</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              printStatement(
                filtered,
                subscriber,
                financials,
                filter === "all" ? "All payments" : FEE_LABELS[filter].label
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> Print Statement
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Record Payment</button>
        </div>
      </div>

      <div className="grid gap-6 border-b bg-slate-50/50 p-5 sm:grid-cols-4">
        <div><div className="text-xs font-semibold uppercase text-muted-foreground">Total Due (Land + Fees)</div><div className="mt-1 text-lg font-bold">{naira.format(financials.grandDue)}</div><div className="mt-1 text-xs text-muted-foreground">Land {naira.format(financials.payableLand)} + Fees {naira.format(financials.totalFeesDue)}</div></div>
        <div><div className="text-xs font-semibold uppercase text-muted-foreground">Total Paid</div><div className="mt-1 text-lg font-bold text-emerald-700">{naira.format(financials.netPaid)}</div></div>
        <div><div className="text-xs font-semibold uppercase text-muted-foreground">Refunded</div><div className="mt-1 text-lg font-bold text-red-600">{naira.format(financials.totalRefunded)}</div></div>
        <div><div className="text-xs font-semibold uppercase text-muted-foreground">Balance</div><div className={`mt-1 text-lg font-bold ${financials.balance > 0 ? "text-red-600" : "text-emerald-700"}`}>{naira.format(financials.balance)}</div><div className="mt-1 text-xs text-muted-foreground">{financials.progress}% paid (net of refunds)</div></div>
      </div>

      <div className="px-5 pt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.min(100, financials.progress)}%` }} /></div>
        <div className="mt-2 text-xs text-muted-foreground">{financials.progress}% paid (net of refunds)</div>
      </div>

      {showAdd && (
        <div className="m-5 rounded-xl border-2 border-dashed bg-slate-50 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="text-xs font-bold uppercase">Fee Type *</label><select className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm" value={feeType} onChange={(e) => setFeeType(e.target.value as FeeType)}>{Object.entries(FEE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label className="text-xs font-bold uppercase">Amount *</label><input className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-bold" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="flex items-end gap-2"><button disabled={saving || !amount} onClick={handleAdd} className="h-[42px] rounded-lg bg-slate-900 px-6 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button><button onClick={() => setShowAdd(false)} className="h-[42px] rounded-lg border bg-white px-6 text-sm font-bold">Cancel</button></div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Fees are separate from Plots but Total Due = Land + Fees</p>
        </div>
      )}

      <div className="flex gap-2 border-b px-5 py-3 overflow-x-auto">
        <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${filter === "all" ? "bg-slate-900 text-white" : "bg-white"}`}>All ({payments.length})</button>
        {(Object.keys(FEE_LABELS) as FeeType[]).map(ft => {
          const count = payments.filter(p => (p.fee_type ?? "land") === ft).length;
          if (!count) return null;
          return <button key={ft} onClick={() => setFilter(ft)} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 whitespace-nowrap ${filter === ft ? "bg-slate-900 text-white" : "bg-white"}`}>{FEE_LABELS[ft].label} ({count})</button>;
        })}
      </div>

      <div className="divide-y">
        {filtered.map((p) => {
          const ft = (p.fee_type ?? "land") as FeeType;
          const meta = FEE_LABELS[ft];
          const isRefund = p.type === "refund" || Number(p.amount) < 0;
          return (
            <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${meta.color}`}>₦</div>
                <div><div className="flex items-center gap-2"><span className="font-bold">{naira.format(Math.abs(Number(p.amount)))}</span><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>{meta.label}</span>{isRefund && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Refund</span>}</div><div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString()}</div></div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => printReceipt(p, subscriber)} title="Print receipt" className="grid h-8 w-8 place-items-center rounded-lg border bg-white hover:bg-slate-50"><Printer className="h-4 w-4" /></button>
                <button
                  onClick={() => handleRefund(p)}
                  disabled={isRefund}
                  title={isRefund ? "This is already a refund" : "Process refund"}
                  className={`grid h-8 w-8 place-items-center rounded-lg border bg-white ${isRefund ? "opacity-50 cursor-not-allowed" : "text-amber-600 hover:bg-amber-50"}`}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="grid h-8 w-8 place-items-center rounded-lg border bg-white text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="px-5 py-10 text-center text-sm text-muted-foreground">No payments</div>}
      </div>
    </div>
  );
}