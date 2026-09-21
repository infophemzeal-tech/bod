"use client";

import { useEffect, useState, type ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, ArrowLeft, AlertCircle, Clock, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToasts, ToastStack } from "@/components/toast";
import { toTitleCase } from "@/lib/text";

const TITLES = ["Mr", "Mrs", "Miss", "Dr", "Engr", "Chief", "Alhaji", "Hajia"];
const PAYMENT_OPTIONS = [
  { value: "Outright", hint: "One-time payment" },
  { value: "Quarterly", hint: "4 payments / year" },
  { value: "Monthly", hint: "12 payments / year" },
];
const PLOT_PREFERENCES = ["Commercial", "Residential", "Corner Piece", "Other"];
const STATUSES = ["draft", "registered", "completed"] as const;
const PAYMENT_TERM_MONTHS = 12;

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

type EstatePrice = { name: string; price_per_plot: number; };

type FormState = {
  title: string;
  surname: string;
  otherNames: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  contactAddress: string;
  profession: string;
  occupation: string;
  employerName: string;
  employerPhone: string;
  employerAddress: string;
  paymentOption: string;
  numberOfPlots: string;
  preferredEstate: string;
  plotPreference: string[];
  plotPreferenceOther: string;
  referrerName: string;
  referrerOccupation: string;
  referrerPhone: string;
  referrerAddress: string;
  status: "draft" | "registered" | "completed";
  subscribedOn: string;
  allocationDate: string;
  isAllocated: boolean; // dynamic Yes/Nil
  discountAmount: string;
  amountPurchased: string;
  amountDeposited: string;
};

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-border bg-navy-soft/60 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-navy">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
function Field({ label, children, span }: { label: string; children: ReactNode; span?: string }) {
  return (<div className={span}><label className="label-field">{label}</label>{children}</div>);
}
function addMonths(iso: string | null, months: number) {
  if (!iso) return null;
  const d = new Date(iso); if (isNaN(d.getTime())) return null;
  const due = new Date(d); due.setMonth(d.getMonth() + months); return due;
}

export function SubscriberEditForm({ id }: { id: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [estates, setEstates] = useState<EstatePrice[]>([]);
  const [estatePriceMap, setEstatePriceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toasts, pushToast, dismissToast } = useToasts();

  useEffect(() => {
    async function load() {
      setLoading(true); setLoadError(null);
      const supabase = createClient();
      const [{ data, error }, { data: estateData }] = await Promise.all([
        supabase.from("subscribers").select("*").eq("id", id).single(),
        supabase.from("estates").select("name,price_per_plot").order("name"),
      ]);
      setLoading(false);
      if (error) { setLoadError(error.message); return; }

      const estateList = (estateData as EstatePrice[])?? [];
      setEstates(estateList);
      const map: Record<string, number> = {};
      for (const e of estateList) map[e.name] = Number(e.price_per_plot) || 0;
      setEstatePriceMap(map);

      const hasAllocation =!!data.physical_allocation_date;

      setForm({
        title: data.title?? "Mr",
        surname: data.surname?? "",
        otherNames: data.other_names?? "",
        dateOfBirth: data.date_of_birth?? "",
        email: data.email?? "",
        phone: data.phone?? "",
        contactAddress: data.contact_address?? "",
        profession: data.profession?? "",
        occupation: data.occupation?? "",
        employerName: data.employer_name?? "",
        employerPhone: data.employer_phone?? "",
        employerAddress: data.employer_address?? "",
        paymentOption: data.payment_option?? "Monthly",
        numberOfPlots: String(data.number_of_plots?? "1"),
        preferredEstate: data.preferred_estate?? estateList[0]?.name?? "",
        plotPreference: data.plot_preference?? [],
        plotPreferenceOther: data.plot_preference_other?? "",
        referrerName: data.referrer_name?? "",
        referrerOccupation: data.referrer_occupation?? "",
        referrerPhone: data.referrer_phone?? "",
        referrerAddress: data.referrer_address?? "",
        status: (data.status as any)?? "draft",
        subscribedOn: data.subscribed_on? new Date(data.subscribed_on).toISOString().slice(0,10) : new Date(data.created_at).toISOString().slice(0,10),
        allocationDate: data.physical_allocation_date? new Date(data.physical_allocation_date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
        isAllocated: hasAllocation,
        discountAmount: String(data.discount_amount?? "0"),
        amountPurchased: String(data.amount_purchased?? ""),
        amountDeposited: String(data.amount_deposited?? "0"),
      });
    }
    load();
  }, [id]);

  const financialPreview = useMemo(() => {
    if (!form) return null;
    const plots = Number(form.numberOfPlots) || 0;
    const estatePrice = estatePriceMap[form.preferredEstate] || 0;
    const calculated = plots * estatePrice;
    const landValue = Number(form.amountPurchased) || calculated || 0;
    const discount = Number(form.discountAmount) || 0;
    const payable = Math.max(landValue - discount, 0);
    const deposited = Number(form.amountDeposited) || 0;
    const outstanding = Math.max(payable - deposited, 0);
    const dueDate = addMonths(form.subscribedOn, PAYMENT_TERM_MONTHS);
    const expired = dueDate && outstanding > 0 && new Date() > dueDate;
    return { plots, estatePrice, calculated, landValue, payable, outstanding, dueDate, expired };
  }, [form, estatePriceMap]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((prev) => (prev? {...prev, [key]: value } : prev)); }
  function togglePlotPreference(value: string) { setForm((prev) => prev? {...prev, plotPreference: prev.plotPreference.includes(value)? prev.plotPreference.filter((v) => v!== value) : [...prev.plotPreference, value] } : prev); }

  // Dynamic allocation toggle
  function toggleAllocation() {
    setForm((prev) => {
      if (!prev) return prev;
      if (prev.isAllocated) {
        // Set to Nil
        return {...prev, isAllocated: false };
      } else {
        // Set to Yes with today as allocation date
        return {...prev, isAllocated: true, allocationDate: new Date().toISOString().slice(0,10) };
      }
    });
  }

  async function handleSave() {
    if (!form) return;
    if (!form.surname ||!form.otherNames ||!form.phone) { pushToast("error", "Surname, other names and phone are required."); return; }
    setSaving(true);
    const supabase = createClient();
    const plots = Number(form.numberOfPlots) || 0;
    const calculatedValue = (estatePriceMap[form.preferredEstate] || 0) * plots;
    const finalAmountPurchased = Number(form.amountPurchased) || calculatedValue || null;

    const { error } = await supabase.from("subscribers").update({
      title: form.title,
      surname: toTitleCase(form.surname),
      other_names: toTitleCase(form.otherNames),
      date_of_birth: form.dateOfBirth || null,
      email: form.email || null,
      phone: form.phone,
      contact_address: toTitleCase(form.contactAddress) || null,
      profession: toTitleCase(form.profession) || null,
      occupation: toTitleCase(form.occupation) || null,
      employer_name: toTitleCase(form.employerName) || null,
      employer_phone: form.employerPhone || null,
      employer_address: toTitleCase(form.employerAddress) || null,
      payment_option: form.paymentOption,
      number_of_plots: plots,
      preferred_estate: form.preferredEstate,
      plot_preference: form.plotPreference,
      plot_preference_other: toTitleCase(form.plotPreferenceOther) || null,
      referrer_name: toTitleCase(form.referrerName) || null,
      referrer_occupation: toTitleCase(form.referrerOccupation) || null,
      referrer_phone: form.referrerPhone || null,
      referrer_address: toTitleCase(form.referrerAddress) || null,
      status: form.status,
      subscribed_on: form.subscribedOn? new Date(form.subscribedOn).toISOString() : null,
      physical_allocation_date: form.isAllocated? (form.allocationDate? new Date(form.allocationDate).toISOString() : new Date().toISOString()) : null,
      discount_amount: Number(form.discountAmount) || 0,
      amount_purchased: finalAmountPurchased,
      amount_deposited: Number(form.amountDeposited) || 0,
    }).eq("id", id);

    setSaving(false);
    if (error) { pushToast("error", `Save failed: ${error.message}`); return; }
    pushToast("ok", form.isAllocated? `Allocated on ${form.allocationDate} - Yes` : "Allocation set to Nil");
    router.push(`/subscribers/${id}`);
  }

  if (loading) return (<div className="flex items-center justify-center gap-2 p-16 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading subscriber...</div>);
  if (loadError ||!form ||!financialPreview) return (<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{loadError?? "Subscriber not found."}</span></div>);

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <Link href={`/subscribers/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"><ArrowLeft className="h-4 w-4" /> Back to subscriber</Link>

      {/* Payment term + allocation preview */}
      <div className={`panel p-4 flex flex-wrap gap-4 items-center justify-between ${financialPreview.expired? "border-red-200 bg-red-50" : "bg-navy-soft/40"}`}>
        <div className="flex gap-6 text-sm flex-wrap">
          <div><span className="text-muted-foreground">Subscribed:</span> <span className="font-bold ml-1">{form.subscribedOn || "—"}</span></div>
          <div><span className="text-muted-foreground">Due Date (12mo):</span> <span className="font-bold ml-1">{financialPreview.dueDate? financialPreview.dueDate.toISOString().slice(0,10) : "—"}</span></div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">Allocation:</span>
            <button type="button" onClick={toggleAllocation} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 transition-all hover:scale-105 ${form.isAllocated? "bg-emerald-100 text-emerald-700 ring-emerald-600/20" : "bg-zinc-100 text-zinc-600 ring-zinc-300"}`}>
              {form.isAllocated? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {form.isAllocated? "Yes" : "Nil"}
            </button>
            {form.isAllocated && <span className="font-bold text-xs">{form.allocationDate}</span>}
          </div>
          <div><span className="text-muted-foreground">Outstanding:</span> <span className={`font-bold ml-1 ${financialPreview.expired? "text-red-600" : financialPreview.outstanding===0? "text-emerald-600" : "text-amber-600"}`}>{naira.format(financialPreview.outstanding)}</span></div>
        </div>
        {financialPreview.expired? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"><Clock className="h-3 w-3" /> Expired</span> : financialPreview.outstanding===0? <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Paid - Closed</span> : <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Active - 12 months term</span>}
      </div>

      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <Section title="Personal Data" subtitle="Subscriber identity and contact details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Title"><select className="field" value={form.title} onChange={(e) => set("title", e.target.value)}>{TITLES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Surname"><input className="field" value={form.surname} onChange={(e) => set("surname", e.target.value)} required /></Field>
            <Field label="Other Name(s)"><input className="field" value={form.otherNames} onChange={(e) => set("otherNames", e.target.value)} required /></Field>
            <Field label="Date of Birth"><input className="field" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
            <Field label="Email Address"><input className="field" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone Number"><input className="field" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></Field>
            <Field label="Subscribed On"><input className="field" type="date" value={form.subscribedOn} onChange={(e) => set("subscribedOn", e.target.value)} required /></Field>
            <Field label="Status"><select className="field" value={form.status} onChange={(e) => set("status", e.target.value as any)}>{STATUSES.map((s) => <option key={s} value={s}>{toTitleCase(s)}</option>)}</select></Field>
          </div>
        </Section>

        <Section title="Physical Allocation - Dynamic" subtitle="Toggle Yes/Nil - date auto set when allocated">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label-field">Allocation Status (Dynamic)</label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setForm(prev => prev? {...prev, isAllocated: true, allocationDate: prev.allocationDate || new Date().toISOString().slice(0,10)} : prev)} className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold transition-colors ${form.isAllocated? "bg-emerald-600 text-white border-emerald-600" : "bg-surface border-input hover:bg-muted"}`}><CheckCircle2 className="h-4 w-4" /> Yes - Allocated</button>
                <button type="button" onClick={() => setForm(prev => prev? {...prev, isAllocated: false } : prev)} className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold transition-colors ${!form.isAllocated? "bg-zinc-800 text-white border-zinc-800" : "bg-surface border-input hover:bg-muted"}`}><XCircle className="h-4 w-4" /> Nil - Not Allocated</button>
              </div>
            </div>
            <Field label="Physical Allocation Date">
              <div className="flex gap-2">
                <input className="field flex-1" type="date" value={form.allocationDate} onChange={(e) => set("allocationDate", e.target.value)} disabled={!form.isAllocated} />
                {form.isAllocated && <button type="button" onClick={() => set("allocationDate", new Date().toISOString().slice(0,10))} className="rounded-md border bg-surface px-3 text-xs font-semibold">Today</button>}
              </div>
              <p className="mt-1 text- text-muted-foreground">{form.isAllocated? `Allocated on ${form.allocationDate}` : "No allocation yet - Nil"}</p>
            </Field>
            <Field label="Allocation Preview">
              <div className={`rounded-md border p-3 text-sm flex items-center gap-2 ${form.isAllocated? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-zinc-50 border-zinc-200 text-zinc-600"}`}>
                <MapPin className="h-4 w-4" /> {form.isAllocated? `Yes - Allocated ${form.allocationDate}` : "Nil - Not yet allocated"}
              </div>
            </Field>
          </div>
        </Section>

        <Section title="Subscription Details" subtitle="Payment plan, plot preference and financials">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <label className="label-field">Payment Option</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {PAYMENT_OPTIONS.map(({ value, hint }) => (
                  <label key={value} className="flex cursor-pointer items-start gap-2 rounded-md border border-input bg-surface p-3 hover:border-navy has-[:checked]:border-navy has-[:checked]:bg-navy-soft">
                    <input type="radio" name="payment" checked={form.paymentOption === value} onChange={() => set("paymentOption", value)} className="mt-0.5 h-4 w-4 accent-navy" />
                    <span className="min-w-0"><span className="block text-sm font-semibold">{value}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
                  </label>
                ))}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Number of Plots"><input className="field" type="number" step="0.5" min="0.5" value={form.numberOfPlots} onChange={(e) => set("numberOfPlots", e.target.value)} /></Field>
                <Field label="Preferred Estate"><select className="field" value={form.preferredEstate} onChange={(e) => set("preferredEstate", e.target.value)}>{estates.map((estate) => <option key={estate.name} value={estate.name}>{estate.name} - {naira.format(estate.price_per_plot)}/plot</option>)}</select></Field>
                <Field label="Plot Price (auto)"><input className="field bg-muted" value={financialPreview.estatePrice? naira.format(financialPreview.estatePrice) : "—"} disabled /></Field>
                <Field label="Land Value"><input className="field bg-muted" value={naira.format(financialPreview.landValue)} disabled /></Field>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Discount Amount"><input className="field" type="number" value={form.discountAmount} onChange={(e) => set("discountAmount", e.target.value)} /></Field>
                <Field label="Total Payable"><input className="field bg-muted font-bold" value={naira.format(financialPreview.payable)} disabled /></Field>
                <Field label="Outstanding"><input className={`field font-bold ${financialPreview.expired? "text-red-600 bg-red-50" : ""}`} value={naira.format(financialPreview.outstanding)} disabled /></Field>
              </div>
            </div>
            <div>
              <label className="label-field">Plot Preference</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {PLOT_PREFERENCES.map((p) => (
                  <label key={p} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-input bg-surface p-3 text-sm hover:border-navy has-[:checked]:border-navy has-[:checked]:bg-navy-soft">
                    <input type="checkbox" checked={form.plotPreference.includes(p)} onChange={() => togglePlotPreference(p)} className="h-4 w-4 rounded accent-navy" /><span className="font-medium">{p}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4"><label className="label-field">If Other</label><input className="field" value={form.plotPreferenceOther} onChange={(e) => set("plotPreferenceOther", e.target.value)} /></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Amount Purchased Override"><input className="field" type="number" placeholder={String(financialPreview.calculated)} value={form.amountPurchased} onChange={(e) => set("amountPurchased", e.target.value)} /></Field>
                <Field label="Amount Deposited"><input className="field" type="number" value={form.amountDeposited} onChange={(e) => set("amountDeposited", e.target.value)} /></Field>
              </div>
            </div>
          </div>
        </Section>

        <div className="flex justify-end gap-3 pb-2">
          <Link href={`/subscribers/${id}`} className="inline-flex items-center justify-center rounded-md border border-input bg-surface px-5 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-navy-deep disabled:opacity-50">{saving? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button>
        </div>
      </form>
    </div>
  );
}