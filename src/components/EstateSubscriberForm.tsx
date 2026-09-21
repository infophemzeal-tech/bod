"use client";

import { useState } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EstateReceipt, makeReceiptNumber, type ReceiptData } from "./EstateReceipt";

type Estate = {
  id: string;
  name: string;
  location: string;
  available_plots: number;
  price_per_plot: number;
};

const PAYMENT_OPTIONS = ["Outright", "Quarterly", "Monthly"];
const TITLES = ["Mr", "Mrs", "Miss", "Dr", "Engr", "Chief", "Alhaji", "Alhaja"];

type FormState = {
  title: string;
  surname: string;
  other_names: string;
  subscribed_on: string;
  physical_allocation_date: string;
  email: string;
  phone: string;
  contact_address: string;
  profession: string;
  occupation: string;
  employer_name: string;
  payment_option: string;
  number_of_plots: string;
  discount_amount: string;
  amount_deposited: string;
  referrer_name: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: FormState = {
  title: "",
  surname: "",
  other_names: "",
  subscribed_on: todayISO(),
  physical_allocation_date: "",
  email: "",
  phone: "",
  contact_address: "",
  profession: "",
  occupation: "",
  employer_name: "",
  payment_option: "Outright",
  number_of_plots: "1",
  discount_amount: "0",
  amount_deposited: "",
  referrer_name: "",
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function EstateSubscriberForm({
  estate,
  onClose,
  onSaved,
}: {
  estate: Estate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const plotsRequested = Number(form.number_of_plots) || 0;
  const subtotal = plotsRequested * estate.price_per_plot;
  const discountAmount = Number(form.discount_amount) || 0;
  const totalDue = Math.max(subtotal - discountAmount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.surname.trim() || !form.other_names.trim() || !form.phone.trim()) {
      setError("Surname, other names, and phone are required.");
      return;
    }
    // Plots must be at least 0.5, and only in half-plot increments (0.5, 1, 1.5, 2, ...)
    if (
      !Number.isFinite(plotsRequested) ||
      plotsRequested < 0.5 ||
      (plotsRequested * 2) % 1 !== 0
    ) {
      setError("Number of plots must be at least 0.5, in half-plot increments.");
      return;
    }
    if (plotsRequested > estate.available_plots) {
      setError(`Only ${estate.available_plots} plot(s) available in ${estate.name}.`);
      return;
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      setError("Discount must be a valid non-negative number.");
      return;
    }
    if (discountAmount > subtotal) {
      setError("Discount cannot exceed the subtotal.");
      return;
    }
    const deposited = form.amount_deposited.trim() === "" ? 0 : Number(form.amount_deposited);
    if (!Number.isFinite(deposited) || deposited < 0) {
      setError("Amount deposited must be a valid number.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: insertError, data: insertData } = await supabase
  .from("subscribers")
  .insert({
    title: form.title || null,
    surname: form.surname.trim(),
    other_names: form.other_names.trim(),
    subscribed_on: form.subscribed_on || null,
    physical_allocation_date: form.physical_allocation_date || null,
    email: form.email.trim() || null,
    phone: form.phone.trim(),
    contact_address: form.contact_address.trim() || null,
    profession: form.profession.trim() || null,
    occupation: form.occupation.trim() || null,
    employer_name: form.employer_name.trim() || null,
    payment_option: form.payment_option,
    number_of_plots: plotsRequested,
    preferred_estate: estate.name,
    estate_id: estate.id,
    amount_deposited: deposited,
    discount_amount: discountAmount,
    amount_purchased: totalDue, // ← net total after discount (plots × price_per_plot − discount)
    referrer_name: form.referrer_name.trim() || null,
    status: "registered",
  })
  .select()
  .single();

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    // Reduce available plots on the estate. Guard against a concurrent
    // registration outrunning us by only updating if enough are still available.
    const { error: updateError, data: updateData } = await supabase
      .from("estates")
      .update({ available_plots: estate.available_plots - plotsRequested })
      .eq("id", estate.id)
      .gte("available_plots", plotsRequested)
      .select();

    setSaving(false);

    if (updateError) {
      setError(
        `Subscriber saved, but updating plot availability failed: ${updateError.message}`
      );
      return;
    }
    if (!updateData || updateData.length === 0) {
      setError(
        "Subscriber saved, but plot availability changed in the meantime — please double-check the estate's available plots."
      );
      onSaved();
      return;
    }

    // Build and show the receipt instead of closing immediately.
    const customerName = [form.title, form.surname, form.other_names]
      .filter(Boolean)
      .join(" ");

    setReceipt({
      receiptNo: makeReceiptNumber(insertData.id),
      date: new Date().toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
      customerName,
      customerId: insertData.id.slice(0, 8).toUpperCase(),
      itemInvoice: insertData.id.slice(0, 8),
      description: `Payment for ${plotsRequested} plot(s) of land @ ${estate.name}, ${estate.location}`,
      subtotal,
      discountAmount,
      amountPaid: deposited,
      paymentMethod: form.payment_option,
      currentBalance: Math.max(totalDue - deposited, 0),
    });

    onSaved();
  }

  // Show the receipt after a successful save; closing it closes the whole flow.
  if (receipt) {
    return <EstateReceipt data={receipt} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden shadow-xl">
        <div className="flex items-start justify-between border-b border-border bg-navy-soft/40 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy">Register Subscriber</h2>
            <p className="text-xs text-muted-foreground">
              {estate.name} · {estate.location} · {estate.available_plots} plot(s) available
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Subscriber Details */}
          <div className="space-y-4">
            <div className="text-sm font-bold uppercase tracking-wider text-navy">
              Subscriber Details
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Title
                </label>
                <select
                  className="field"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                >
                  <option value="">Select...</option>
                  {TITLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Surname
                </label>
                <input
                  className="field"
                  placeholder="Doe"
                  value={form.surname}
                  onChange={(e) => update("surname", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Other Names
                </label>
                <input
                  className="field"
                  placeholder="John Emma"
                  value={form.other_names}
                  onChange={(e) => update("other_names", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Subscribed On
                </label>
                <input
                  type="date"
                  className="field"
                  value={form.subscribed_on ?? ""}
                  onChange={(e) => update("subscribed_on", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Physical Allocation Date
                </label>
                <input
                  type="date"
                  className="field"
                  value={form.physical_allocation_date ?? ""}
                  onChange={(e) => update("physical_allocation_date", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Phone Number
                </label>
                <input
                  className="field"
                  placeholder="+234 803 123 4567"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  className="field"
                  placeholder="john.doe@gmail.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Contact Address
              </label>
              <textarea
                className="field min-h-[80px]"
                placeholder="14 Adeola Odeku Street, Victoria Island, Lagos"
                value={form.contact_address}
                onChange={(e) => update("contact_address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Profession
                </label>
                <input
                  className="field"
                  placeholder="Civil Engineer"
                  value={form.profession}
                  onChange={(e) => update("profession", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Occupation
                </label>
                <input
                  className="field"
                  placeholder="Project Manager"
                  value={form.occupation}
                  onChange={(e) => update("occupation", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Employer Name
                </label>
                <input
                  className="field"
                  placeholder="Julius Berger"
                  value={form.employer_name}
                  onChange={(e) => update("employer_name", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Referrer (Optional)
                </label>
                <input
                  className="field"
                  placeholder="Mrs. Jane Smith"
                  value={form.referrer_name}
                  onChange={(e) => update("referrer_name", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Plot & Payment Details */}
          <div className="space-y-4">
            <div className="text-sm font-bold uppercase tracking-wider text-navy">
              Plot &amp; Payment Details
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Number of Plots
                </label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  max={estate.available_plots}
                  className="field"
                  value={form.number_of_plots}
                  onChange={(e) => update("number_of_plots", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Payment Plan
                </label>
                <select
                  className="field"
                  value={form.payment_option}
                  onChange={(e) => update("payment_option", e.target.value)}
                >
                  {PAYMENT_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Discount (₦)
                </label>
                <input
                  type="number"
                  min={0}
                  max={subtotal || undefined}
                  className="field"
                  placeholder="0"
                  value={form.discount_amount}
                  onChange={(e) => update("discount_amount", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Amount Deposited (₦)
                </label>
                <input
                  type="number"
                  min={0}
                  className="field"
                  placeholder="0"
                  value={form.amount_deposited}
                  onChange={(e) => update("amount_deposited", e.target.value)}
                />
              </div>
              <div className="flex flex-col justify-center gap-1 rounded-lg border border-border bg-navy-soft/30 px-4 py-3 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>
                    Subtotal ({plotsRequested || 0} × {naira.format(estate.price_per_plot)})
                  </span>
                  <span className="font-semibold text-navy">{naira.format(subtotal || 0)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Sales Discount</span>
                    <span className="font-semibold">-{naira.format(discountAmount)}</span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between border-t border-border pt-1">
                  <span className="font-semibold text-navy">Total Due</span>
                  <span className="text-sm font-bold text-navy">{naira.format(totalDue || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Register Subscriber
          </button>
        </div>
      </div>
    </div>
  );
}

export default EstateSubscriberForm;