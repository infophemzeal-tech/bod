"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Save, UserPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToasts, ToastStack } from "@/components/toast";
import { toTitleCase } from "@/lib/text";

const TITLES = ["Mr", "Mrs", "Miss", "Dr", "Engr", "Chief", "Alhaji", "Hajia"];

type Estate = {
  id: string;
  name: string;
  location: string;
  available_plots: number;
};

const PAYMENT_OPTIONS = [
  { value: "Outright", hint: "One-time payment" },
  { value: "Quarterly", hint: "4 payments / year" },
  { value: "Monthly", hint: "12 payments / year" },
];
const PLOT_PREFERENCES = ["Commercial", "Residential", "Corner Piece", "Other"];

// Which fees can be toggled at intake, the FormState key each checkbox
// reads/writes, and the FormState key holding that fee's fixed-amount
// override (blank = use the app-wide default, e.g. % of land value or
// the standard monthly rate). Mirrors the subscriber edit form.
const OPTIONAL_FEES: {
  key: "legalFeeApplicable" | "allocationFeeApplicable" | "maintenanceFeeApplicable" | "securityFeeApplicable" | "formFeeApplicable";
  amountKey: "legalFeeAmount" | "allocationFeeAmount" | "maintenanceFeeAmount" | "securityFeeAmount" | "formFeeAmount";
  label: string;
  hint: string;
}[] = [
  { key: "legalFeeApplicable", amountKey: "legalFeeAmount", label: "Legal Fee", hint: "% of land value" },
  { key: "allocationFeeApplicable", amountKey: "allocationFeeAmount", label: "Allocation Fee", hint: "% of land value" },
  { key: "maintenanceFeeApplicable", amountKey: "maintenanceFeeAmount", label: "Maintenance", hint: "Monthly" },
  { key: "securityFeeApplicable", amountKey: "securityFeeAmount", label: "Security", hint: "Monthly" },
  { key: "formFeeApplicable", amountKey: "formFeeAmount", label: "Form Fee", hint: "One-time" },
];

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const STORAGE_KEY = "bod_intake_form_draft";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type FormState = {
  title: string;
  surname: string;
  otherNames: string;
  subscribedOn: string;
  physicalAllocationDate: string;
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
  estateId: string;
  plotPreference: string[];
  plotPreferenceOther: string;
  referrerName: string;
  referrerOccupation: string;
  referrerPhone: string;
  referrerAddress: string;
  customerId: string;
  salesRepName: string;
  discount: string;
  // Optional-fee toggles. All default to true (fee applies) so a fresh
  // intake behaves the same as before unless someone switches one off.
  legalFeeApplicable: boolean;
  allocationFeeApplicable: boolean;
  maintenanceFeeApplicable: boolean;
  securityFeeApplicable: boolean;
  formFeeApplicable: boolean;
  // Optional-fee fixed amounts. Empty string = no override, fall back to
  // the app's default fee calculation (e.g. % of land value / standard rate).
  legalFeeAmount: string;
  allocationFeeAmount: string;
  maintenanceFeeAmount: string;
  securityFeeAmount: string;
  formFeeAmount: string;
};

const INITIAL_STATE: FormState = {
  title: "Mr",
  surname: "",
  otherNames: "",
  subscribedOn: todayISO(),
  physicalAllocationDate: "",
  email: "",
  phone: "",
  contactAddress: "",
  profession: "",
  occupation: "",
  employerName: "",
  employerPhone: "",
  employerAddress: "",
  paymentOption: "Monthly",
  numberOfPlots: "0.5",
  estateId: "",
  plotPreference: ["Residential"],
  plotPreferenceOther: "",
  referrerName: "",
  referrerOccupation: "",
  referrerPhone: "",
  referrerAddress: "",
  customerId: "",
  salesRepName: "",
  discount: "",
  legalFeeApplicable: true,
  allocationFeeApplicable: true,
  maintenanceFeeApplicable: true,
  securityFeeApplicable: true,
  formFeeApplicable: true,
  legalFeeAmount: "",
  allocationFeeAmount: "",
  maintenanceFeeAmount: "",
  securityFeeAmount: "",
  formFeeAmount: "",
};

function Section({
  step,
  title,
  subtitle,
  children,
}: {
  step: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-border bg-navy-soft/60 px-5 py-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold uppercase tracking-[0.08em] text-navy">
            {title}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  span,
}: {
  label: string;
  children: ReactNode;
  span?: string;
}) {
  return (
    <div className={span}>
      <label className="label-field">{label}</label>
      {children}
    </div>
  );
}

export function IntakeForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [loadingEstates, setLoadingEstates] = useState(true);
  const { toasts, pushToast, dismissToast } = useToasts();

  // Pull the estate list from the "Register Estate" data instead of a
  // hardcoded array, so new estates show up here automatically.
  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("estates")
        .select("id,name,location,available_plots")
        .order("name", { ascending: true });
      if (!active) return;
      if (error) {
        pushToast("error", `Failed to load estates: ${error.message}`);
      } else {
        setEstates((data as Estate[]) ?? []);
      }
      setLoadingEstates(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default to the first estate once the list arrives, unless a draft
  // already had one selected.
  useEffect(() => {
    if (estates.length > 0 && !form.estateId) {
      set("estateId", estates[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estates]);

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        setForm({ ...INITIAL_STATE, ...JSON.parse(savedDraft) });
      }
    } catch (error) {
      console.error("Failed to load form draft:", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch (error) {
      console.error("Failed to save form draft:", error);
    }
  }, [form]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(form) !== JSON.stringify(INITIAL_STATE)) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlotPreference(value: string) {
    setForm((prev) => ({
      ...prev,
      plotPreference: prev.plotPreference.includes(value)
        ? prev.plotPreference.filter((v) => v !== value)
        : [...prev.plotPreference, value],
    }));
  }

  async function submit(status: "draft" | "registered") {
    if (status === "registered" && (!form.surname || !form.otherNames || !form.phone)) {
      pushToast("error", "Surname, other names and phone are required.");
      return;
    }

    const selectedEstate = estates.find((e) => e.id === form.estateId) ?? null;
    if (status === "registered" && !selectedEstate) {
      pushToast("error", "Please select a preferred estate.");
      return;
    }

    const discountAmount = form.discount.trim() === "" ? 0 : Number(form.discount);
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      pushToast("error", "Discount must be a valid number.");
      return;
    }

    // Blank override input -> null (use default calc elsewhere in the app);
    // non-blank -> the number the user typed.
    const feeAmount = (v: string) => (v.trim() === "" ? null : Number(v));

    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.from("subscribers").insert({
      title: form.title,
      surname: toTitleCase(form.surname),
      other_names: toTitleCase(form.otherNames),
      subscribed_on: form.subscribedOn || null,
      physical_allocation_date: form.physicalAllocationDate || null,
      email: form.email || null,
      phone: form.phone,
      contact_address: toTitleCase(form.contactAddress) || null,
      profession: toTitleCase(form.profession) || null,
      occupation: toTitleCase(form.occupation) || null,
      employer_name: toTitleCase(form.employerName) || null,
      employer_phone: form.employerPhone || null,
      employer_address: toTitleCase(form.employerAddress) || null,
      payment_option: form.paymentOption,
      number_of_plots: Number(form.numberOfPlots),
      preferred_estate: selectedEstate ? toTitleCase(selectedEstate.name) : null,
      estate_id: selectedEstate?.id ?? null,
      plot_preference: form.plotPreference,
      plot_preference_other: toTitleCase(form.plotPreferenceOther) || null,
      referrer_name: toTitleCase(form.referrerName) || null,
      referrer_occupation: toTitleCase(form.referrerOccupation) || null,
      referrer_phone: form.referrerPhone || null,
      referrer_address: toTitleCase(form.referrerAddress) || null,
      customer_id: form.customerId.trim() || null,
      sales_rep_name: toTitleCase(form.salesRepName) || null,
      discount_amount: discountAmount,
      status,
      legal_fee_applicable: form.legalFeeApplicable,
      allocation_fee_applicable: form.allocationFeeApplicable,
      maintenance_fee_applicable: form.maintenanceFeeApplicable,
      security_fee_applicable: form.securityFeeApplicable,
      form_fee_applicable: form.formFeeApplicable,
      legal_fee_amount: feeAmount(form.legalFeeAmount),
      allocation_fee_amount: feeAmount(form.allocationFeeAmount),
      maintenance_fee_amount: feeAmount(form.maintenanceFeeAmount),
      security_fee_amount: feeAmount(form.securityFeeAmount),
      form_fee_amount: feeAmount(form.formFeeAmount),
    });

    setSubmitting(false);

    if (error) {
      pushToast("error", `Save failed: ${error.message}`);
      return;
    }

    pushToast(
      "ok",
      status === "draft" ? "Draft saved to database." : "Subscriber registered successfully."
    );

    if (status === "registered") {
      window.localStorage.removeItem(STORAGE_KEY);
      setForm(INITIAL_STATE);
    }
  }

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit("registered");
        }}
      >
        <Section step="1" title="Personal Data" subtitle="Subscriber identity and contact details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Title">
              <select className="field" value={form.title} onChange={(e) => set("title", e.target.value)}>
                {TITLES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Surname">
              <input className="field" placeholder="Okafor" value={form.surname} onChange={(e) => set("surname", e.target.value)} required />
            </Field>
            <Field label="Other Name(s)">
              <input className="field" placeholder="Chinedu Emmanuel" value={form.otherNames} onChange={(e) => set("otherNames", e.target.value)} required />
            </Field>
            <Field label="Subscribed On">
              <input className="field" type="date" value={form.subscribedOn ?? ""} onChange={(e) => set("subscribedOn", e.target.value)} />
            </Field>
            <Field label="Physical Allocation Date">
              <input className="field" type="date" value={form.physicalAllocationDate ?? ""} onChange={(e) => set("physicalAllocationDate", e.target.value)} />
            </Field>
            <Field label="Email Address">
              <input className="field" type="email" placeholder="chinedu.okafor@gmail.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone Number">
              <input className="field" type="tel" placeholder="+234 803 123 4567" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
            </Field>
            <Field label="Contact Address" span="sm:col-span-2 lg:col-span-3">
              <textarea className="field min-h-20" placeholder="14 Adeola Odeku Street, Victoria Island, Lagos" value={form.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section step="2" title="Employment History" subtitle="Used for affordability and installment assessment">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Profession">
              <input className="field" placeholder="Civil Engineer" value={form.profession} onChange={(e) => set("profession", e.target.value)} />
            </Field>
            <Field label="Occupation">
              <input className="field" placeholder="Project Manager" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
            </Field>
            <Field label="Employer Name">
              <input className="field" placeholder="Julius Berger Nigeria Plc" value={form.employerName} onChange={(e) => set("employerName", e.target.value)} />
            </Field>
            <Field label="Employer Phone">
              <input className="field" type="tel" placeholder="+234 1 279 4000" value={form.employerPhone} onChange={(e) => set("employerPhone", e.target.value)} />
            </Field>
            <Field label="Employer Address" span="sm:col-span-2">
              <input className="field" placeholder="10 Shettima A. Munguno Crescent, Utako, Abuja" value={form.employerAddress} onChange={(e) => set("employerAddress", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section step="3" title="Subscription Details" subtitle="Payment plan, plot preference and volume">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <label className="label-field">Payment Option</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {PAYMENT_OPTIONS.map(({ value, hint }) => (
                  <label key={value} className="flex cursor-pointer items-start gap-2 rounded-md border border-input bg-surface p-3 transition-colors hover:border-navy has-[:checked]:border-navy has-[:checked]:bg-navy-soft">
                    <input type="radio" name="payment" checked={form.paymentOption === value} onChange={() => set("paymentOption", value)} className="mt-0.5 h-4 w-4 accent-navy" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{value}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Number of Plots (fractions allowed)">
                  <input className="field" type="number" step="0.5" min="0.5" value={form.numberOfPlots} onChange={(e) => set("numberOfPlots", e.target.value)} />
                </Field>
                <Field label="Preferred Estate">
                  <select
                    className="field"
                    value={form.estateId}
                    onChange={(e) => set("estateId", e.target.value)}
                    disabled={loadingEstates || estates.length === 0}
                  >
                    {loadingEstates ? (
                      <option value="">Loading estates…</option>
                    ) : estates.length === 0 ? (
                      <option value="">No estates registered yet</option>
                    ) : (
                      <>
                        <option value="">Select an estate…</option>
                        {estates.map((estate) => (
                          <option key={estate.id} value={estate.id}>
                            {toTitleCase(estate.name)}, {toTitleCase(estate.location)}
                            {typeof estate.available_plots === "number"
                              ? ` (${estate.available_plots} available)`
                              : ""}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {!loadingEstates && estates.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No estates yet — register one from the Estates page first.
                    </p>
                  )}
                </Field>
              </div>
            </div>

            <div>
              <label className="label-field">Plot Preference</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {PLOT_PREFERENCES.map((p) => (
                  <label key={p} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-input bg-surface p-3 text-sm transition-colors hover:border-navy has-[:checked]:border-navy has-[:checked]:bg-navy-soft">
                    <input type="checkbox" checked={form.plotPreference.includes(p)} onChange={() => togglePlotPreference(p)} className="h-4 w-4 rounded accent-navy" />
                    <span className="font-medium">{p}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <label className="label-field">If Other, please specify</label>
                <input className="field" placeholder="e.g. Waterfront / Mixed use" value={form.plotPreferenceOther} onChange={(e) => set("plotPreferenceOther", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <label className="label-field mb-1">Sales &amp; Office Details</label>
            <p className="mb-3 text-xs text-muted-foreground">
              Optional — used to fill in the Customer ID, Sales Rep, and Discount shown on the invoice
              and congratulatory letter.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Customer ID">
                <input
                  className="field"
                  placeholder="e.g. Josephine 09"
                  value={form.customerId}
                  onChange={(e) => set("customerId", e.target.value)}
                />
              </Field>
              <Field label="Sales Rep Name">
                <input
                  className="field"
                  placeholder="e.g. Adaeze Okafor"
                  value={form.salesRepName}
                  onChange={(e) => set("salesRepName", e.target.value)}
                />
              </Field>
              <Field label="Discount (₦)">
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.discount}
                  onChange={(e) => set("discount", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section step="4" title="Fee Applicability" subtitle="Turn off any fee that doesn't apply, and optionally fix a custom price for this subscriber (leave blank to use the default)">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {OPTIONAL_FEES.map(({ key, amountKey, label, hint }) => {
              const checked = form[key];
              const amount = form[amountKey];
              return (
                <div
                  key={key}
                  className={`rounded-md border p-3 text-sm transition-colors ${checked ? "border-navy bg-navy-soft" : "border-input bg-surface"}`}
                >
                  <label className="flex cursor-pointer items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{checked ? hint : "Not applicable"}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => set(key, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded accent-navy"
                    />
                  </label>
                  <div className="mt-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Default"
                      value={amount}
                      onChange={(e) => set(amountKey, e.target.value)}
                      disabled={!checked}
                      className="field h-8 text-xs disabled:opacity-50"
                    />
                    {checked && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {amount.trim() === "" ? "Using default price" : `Fixed at ${naira.format(Number(amount) || 0)}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section step="5" title="Referral" subtitle="Who introduced the subscriber to BOD Properties">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Referrer Name">
              <input className="field" placeholder="Mrs. Ifeoma Nnamdi" value={form.referrerName} onChange={(e) => set("referrerName", e.target.value)} />
            </Field>
            <Field label="Referrer Occupation">
              <input className="field" placeholder="Banker" value={form.referrerOccupation} onChange={(e) => set("referrerOccupation", e.target.value)} />
            </Field>
            <Field label="Referrer Phone">
              <input className="field" type="tel" placeholder="+234 807 998 2211" value={form.referrerPhone} onChange={(e) => set("referrerPhone", e.target.value)} />
            </Field>
            <Field label="Referrer Address">
              <input className="field" placeholder="22 Awolowo Road, Ikoyi, Lagos" value={form.referrerAddress} onChange={(e) => set("referrerAddress", e.target.value)} />
            </Field>
          </div>
        </Section>

        <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={submitting} onClick={() => submit("draft")} className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-surface px-5 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            <Save className="h-4 w-4" /> Save draft
          </button>
          <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-navy-deep disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Register Subscriber
          </button>
        </div>
      </form>
    </div>
  );
}