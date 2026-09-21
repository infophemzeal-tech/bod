"use client";

import { useEffect, useState, useMemo } from "react";
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
};

type PaymentRow = { amount: number; type: string | null; };
type EstatePrice = { price_per_plot: number; name: string; };
type ReactValue = string | number | null | undefined;

const PAYMENT_TERM_MONTHS = 12;

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

function Row({ label, value }: { label: string; value: ReactValue }) {
  const display = value === 0 ? "0" : value || "—";
  return (
    <div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{display}</span>
    </div>
  );
}
function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch { return iso; }
}
function formatDateISO(iso: string | null) { if (!iso) return "—"; try { return new Date(iso).toISOString().slice(0,10); } catch { return iso; } }
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { completed: "bg-emerald-100 text-emerald-800", registered: "bg-blue-100 text-blue-800", draft: "bg-amber-100 text-amber-800" };
  const labels: Record<string, string> = { completed: "Completed", registered: "Registered", draft: "Draft" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-muted text-foreground"}`}>{labels[status] ?? status}</span>;
}
function addMonths(iso: string | null, months: number) {
  if (!iso) return null;
  const d = new Date(iso); if (isNaN(d.getTime())) return null;
  const due = new Date(d); due.setMonth(d.getMonth() + months); return due;
}
function getDueDate(subscribedOn: string | null, createdAt: string) {
  const base = subscribedOn || createdAt;
  return addMonths(base, PAYMENT_TERM_MONTHS);
}
function isExpired(dueDate: Date | null, outstanding: number) {
  if (!dueDate) return false;
  if (outstanding <= 0) return false;
  return new Date() > dueDate;
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
  const [showInvoice, setShowInvoice] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const { toasts, pushToast, dismissToast } = useToasts();

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      const supabase = createClient();
      const { data, error } = await supabase.from("subscribers").select("*").eq("id", id).single();
      if (error || !data) { setLoading(false); setError(error?.message ?? "Not found"); return; }
      const subscriberData = data as Subscriber;
      setSubscriber(subscriberData);
      const [paymentsRes, estateRes] = await Promise.all([
        supabase.from("payments").select("amount,type").eq("subscriber_id", id),
        subscriberData.estate_id? supabase.from("estates").select("price_per_plot,name").eq("id", subscriberData.estate_id).single() : supabase.from("estates").select("price_per_plot,name").eq("name", subscriberData.preferred_estate).maybeSingle(),
      ]);
      setPayments((paymentsRes.data as PaymentRow[]) ?? []);
      if (estateRes.data) setEstate(estateRes.data as EstatePrice);
      setLoading(false);
    }
    load();
  }, [id]);

  const financials = useMemo(() => {
    if (!subscriber) return null;
    const plots = Number(subscriber.number_of_plots) || 0;
    const pricePerPlot = estate?.price_per_plot || 0;
    const calculatedLandValue = plots * pricePerPlot;
    const storedLandValue = Number(subscriber.amount_purchased) || 0;
    const landValue = storedLandValue > 0 ? storedLandValue : calculatedLandValue;
    const discount = Number(subscriber.discount_amount) || 0;
    const payable = Math.max(landValue - discount, 0);
    let paid = 0, refunded = 0;
    for (const p of payments) { const amt = Number(p.amount) || 0; if (p.type === "refund" || amt < 0) refunded += Math.abs(amt); else paid += amt; }
    const totalCollected = payments.length > 0 ? paid - refunded : Number(subscriber.amount_deposited) || 0;
    const netCollected = Math.max(totalCollected, 0);
    const outstanding = Math.max(payable - netCollected, 0);
    const dueDate = getDueDate(subscriber.subscribed_on, subscriber.created_at);
    const expired = isExpired(dueDate, outstanding);
    const isPaid = outstanding === 0 && payable > 0;
    return { plots, pricePerPlot, calculatedLandValue, landValue, discount, payable, paid, refunded, totalCollected: netCollected, outstanding, hasEstatePrice: pricePerPlot > 0, dueDate, expired, isPaid };
  }, [subscriber, payments, estate]);

  async function handleDelete() {
    if (!subscriber) return; setDeleting(true);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("delete_subscriber_and_restore_plot", { p_subscriber_id: subscriber.id });
    if (rpcErr) { const { error } = await supabase.from("subscribers").delete().eq("id", subscriber.id); setDeleting(false); if (error) { pushToast("error", `Delete failed: ${error.message}`); return; } } else { setDeleting(false); }
    router.push("/subscribers");
  }

  if (loading) return (<div className="flex items-center justify-center gap-2 p-16 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading subscriber...</div>);
  if (error || !subscriber || !financials) return (<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error ?? "Subscriber not found."}</span></div>);

  return (
    <div className="space-y-5">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog open={confirmOpen} title="Delete subscriber?" description={`This will permanently remove ${subscriber.title ?? ""} ${subscriber.surname} ${subscriber.other_names} from the database. This cannot be undone.`} confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setConfirmOpen(false)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/subscribers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"><ArrowLeft className="h-4 w-4" /> Back to subscribers</Link>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowInvoice(true)} className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold hover:bg-muted"><FileText className="h-4 w-4" /> View Invoice</button>
          <button type="button" onClick={() => setShowLetter(true)} className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold hover:bg-muted"><Mail className="h-4 w-4" /> View Letter</button>
          <Link href={`/subscribers/${subscriber.id}/edit`} className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold hover:bg-muted"><Pencil className="h-4 w-4" /> Edit</Link>
          <button type="button" onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      </div>

      {/* Payment Term Banner */}
      <div className={`panel flex flex-wrap items-center justify-between gap-3 p-4 ${financials.expired? "border-red-200 bg-red-50" : financials.isPaid? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex flex-wrap gap-5 text-sm">
          <div><span className="text-muted-foreground">Subscribed On:</span> <span className="ml-1 font-bold">{formatDateISO(subscriber.subscribed_on || subscriber.created_at)}</span></div>
          <div><span className="text-muted-foreground">Due Date (12 months):</span> <span className="ml-1 font-bold">{financials.dueDate? formatDateISO(financials.dueDate.toISOString()) : "—"}</span></div>
          <div><span className="text-muted-foreground">Term:</span> <span className="ml-1 font-bold">{PAYMENT_TERM_MONTHS} months</span></div>
          <div><span className="text-muted-foreground">Outstanding:</span> <span className={`ml-1 font-bold ${financials.expired? "text-red-600" : financials.isPaid? "text-emerald-600" : "text-amber-600"}`}>{naira.format(financials.outstanding)}</span></div>
        </div>
        {financials.expired? <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-600/20"><Clock className="h-3.5 w-3.5" /> Expired - Payment overdue</span> : financials.isPaid? <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Paid - Closed</span> : <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Active - Within term</span>}
      </div>

      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold text-navy">{subscriber.title ? `${subscriber.title} ` : ""}{toTitleCase(subscriber.surname)} {toTitleCase(subscriber.other_names)}</h1>
            <p className="text-sm text-muted-foreground">Added {new Date(subscriber.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div className="flex items-center gap-2"><StatusBadge status={subscriber.status} />{financials.expired && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700"><Clock className="h-3 w-3" /> Expired</span>}</div>
        </div>

        <div className="grid gap-x-8 gap-y-1 pt-2 md:grid-cols-2">
          <div>
            <h2 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-navy">Personal Data</h2>
            <Row label="Subscribed On" value={formatDate(subscriber.subscribed_on)} />
            <Row label="Due Date (12mo)" value={financials.dueDate? formatDate(financials.dueDate.toISOString()) : "—"} />
            <Row label="Physical Allocation Date" value={formatDate(subscriber.physical_allocation_date)} />
            <Row label="Email" value={subscriber.email} />
            <Row label="Phone" value={subscriber.phone} />
            <Row label="Contact Address" value={toTitleCase(subscriber.contact_address)} />
          </div>
          <div>
            <h2 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-navy">Employment</h2>
            <Row label="Profession" value={toTitleCase(subscriber.profession)} />
            <Row label="Occupation" value={toTitleCase(subscriber.occupation)} />
            <Row label="Employer" value={toTitleCase(subscriber.employer_name)} />
            <Row label="Employer Phone" value={subscriber.employer_phone} />
            <Row label="Employer Address" value={toTitleCase(subscriber.employer_address)} />
          </div>
          <div>
            <h2 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-navy">Subscription</h2>
            <Row label="Payment Plan" value={subscriber.payment_option} />
            <Row label="Payment Term" value={`${PAYMENT_TERM_MONTHS} months`} />
            <Row label="Number of Plots" value={financials.hasEstatePrice ? `${financials.plots} × ${naira.format(financials.pricePerPlot)}` : financials.plots} />
            <Row label="Discount" value={financials.discount > 0 ? naira.format(financials.discount) : null} />
            <Row label="Preferred Estate" value={subscriber.preferred_estate} />
            <Row label="Plot Preference" value={subscriber.plot_preference?.join(", ")} />
            {subscriber.plot_preference_other && <Row label="Other Preference" value={subscriber.plot_preference_other} />}
          </div>
          <div>
            <h2 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-navy">Referral</h2>
            <Row label="Referrer Name" value={toTitleCase(subscriber.referrer_name)} />
            <Row label="Referrer Occupation" value={toTitleCase(subscriber.referrer_occupation)} />
            <Row label="Referrer Phone" value={subscriber.referrer_phone} />
            <Row label="Referrer Address" value={toTitleCase(subscriber.referrer_address)} />
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-navy">Financial Summary - 12 Months Term</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-navy-soft bg-navy-soft/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Cost of Land</div>
            <div className="mt-1 text-xl font-bold text-navy">{financials.landValue ? naira.format(financials.landValue) : "Not set"}</div>
            <div className="mt-1 text-xs text-muted-foreground">{financials.hasEstatePrice ? `${financials.plots} plot(s) × ${naira.format(financials.pricePerPlot)}` : "Gross"}</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">Payable After Discount</div>
            <div className="mt-1 text-xl font-bold text-amber-800">{naira.format(financials.payable)}</div>
            <div className="mt-1 text-xs text-amber-700">{financials.discount > 0 ? `Discount: ${naira.format(financials.discount)}` : "No discount"} • Due: {financials.dueDate? formatDateISO(financials.dueDate.toISOString()) : "—"}</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Collected</div>
            <div className="mt-1 text-xl font-bold text-emerald-700">{naira.format(financials.totalCollected)}</div>
            <div className="mt-1 text-xs text-emerald-700">{financials.refunded > 0 ? `Refunded: ${naira.format(financials.refunded)}` : `${payments.length} payment(s)`}</div>
          </div>
          <div className={`rounded-lg border p-4 ${financials.expired? "border-red-200 bg-red-50" : financials.isPaid? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className={`text-xs font-semibold uppercase tracking-wide ${financials.expired? "text-red-700" : financials.isPaid? "text-emerald-700" : "text-amber-700"}`}>Outstanding {financials.expired? "- Expired" : ""}</div>
            <div className={`mt-1 text-xl font-bold ${financials.expired? "text-red-700" : financials.isPaid? "text-emerald-700" : "text-amber-700"}`}>{naira.format(financials.outstanding)}</div>
            <div className="mt-1 text-xs">{financials.expired? `Overdue since ${financials.dueDate? formatDateISO(financials.dueDate.toISOString()) : ""}` : financials.isPaid? "Fully paid - Closed" : `Due ${financials.dueDate? formatDateISO(financials.dueDate.toISOString()) : ""}`}</div>
          </div>
        </div>
      </div>

      <PaymentsPanel subscriberId={subscriber.id} />
      <Modal open={showInvoice} onClose={() => setShowInvoice(false)}><InvoiceLoader subscriberId={subscriber.id} showBackLink={false} /></Modal>
      <Modal open={showLetter} onClose={() => setShowLetter(false)}><CongratulatoryLetterLoader subscriberId={subscriber.id} showBackLink={false} /></Modal>
    </div>
  );
}