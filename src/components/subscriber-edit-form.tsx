"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, ArrowLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToasts, ToastStack } from "@/components/toast";
import { toTitleCase } from "@/lib/text";

const TITLES = ["Mr", "Mrs", "Miss", "Dr", "Engr", "Chief", "Alhaji", "Hajia"];
const ESTATES = [
  "B-Top Garden, Shimawa",
  "Royal Heritage Estate, Mowe",
  "Diamond Court, Sangotedo",
  "Emerald Vale Estate, Simawa",
];
const PAYMENT_OPTIONS = [
  { value: "Outright", hint: "One-time payment" },
  { value: "Quarterly", hint: "4 payments / year" },
  { value: "Monthly", hint: "12 payments / year" },
];
const PLOT_PREFERENCES = ["Commercial", "Residential", "Corner Piece", "Other"];
const STATUSES = ["draft", "registered", "completed"] as const;

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
};

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
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

export function SubscriberEditForm({ id }: { id: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { toasts, pushToast, dismissToast } = useToasts();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("subscribers")
        .select("*")
        .eq("id", id)
        .single();

      setLoading(false);

      if (error) {
        setLoadError(error.message);
        return;
      }

      setForm({
        title: data.title ?? "Mr",
        surname: data.surname ?? "",
        otherNames: data.other_names ?? "",
        dateOfBirth: data.date_of_birth ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        contactAddress: data.contact_address ?? "",
        profession: data.profession ?? "",
        occupation: data.occupation ?? "",
        employerName: data.employer_name ?? "",
        employerPhone: data.employer_phone ?? "",
        employerAddress: data.employer_address ?? "",
        paymentOption: data.payment_option ?? "Monthly",
        numberOfPlots: String(data.number_of_plots ?? "0.5"),
        preferredEstate: data.preferred_estate ?? ESTATES[0],
        plotPreference: data.plot_preference ?? [],
        plotPreferenceOther: data.plot_preference_other ?? "",
        referrerName: data.referrer_name ?? "",
        referrerOccupation: data.referrer_occupation ?? "",
        referrerPhone: data.referrer_phone ?? "",
        referrerAddress: data.referrer_address ?? "",
        status: (data.status as "draft" | "registered" | "completed") ?? "draft",
      });
    }

    load();
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function togglePlotPreference(value: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            plotPreference: prev.plotPreference.includes(value)
              ? prev.plotPreference.filter((v) => v !== value)
              : [...prev.plotPreference, value],
          }
        : prev
    );
  }

  async function handleSave() {
    if (!form) return;

    if (!form.surname || !form.otherNames || !form.phone) {
      pushToast("error", "Surname, other names and phone are required.");
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("subscribers")
      .update({
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
        number_of_plots: Number(form.numberOfPlots),
        preferred_estate: form.preferredEstate,
        plot_preference: form.plotPreference,
        plot_preference_other: toTitleCase(form.plotPreferenceOther) || null,
        referrer_name: toTitleCase(form.referrerName) || null,
        referrer_occupation: toTitleCase(form.referrerOccupation) || null,
        referrer_phone: form.referrerPhone || null,
        referrer_address: toTitleCase(form.referrerAddress) || null,
        status: form.status,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      pushToast("error", `Save failed: ${error.message}`);
      return;
    }

    pushToast("ok", "Changes saved.");
    router.push(`/subscribers/${id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading subscriber...
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{loadError ?? "Subscriber not found."}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <Link
        href={`/subscribers/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to subscriber
      </Link>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <Section title="Personal Data" subtitle="Subscriber identity and contact details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Title">
              <select className="field" value={form.title} onChange={(e) => set("title", e.target.value)}>
                {TITLES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Surname">
              <input className="field" value={form.surname} onChange={(e) => set("surname", e.target.value)} required />
            </Field>
            <Field label="Other Name(s)">
              <input className="field" value={form.otherNames} onChange={(e) => set("otherNames", e.target.value)} required />
            </Field>
            <Field label="Date of Birth">
              <input className="field" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </Field>
            <Field label="Email Address">
              <input className="field" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone Number">
              <input className="field" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
            </Field>
            <Field label="Contact Address" span="sm:col-span-2 lg:col-span-3">
              <textarea className="field min-h-20" value={form.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} />
            </Field>
            <Field label="Status">
              <select className="field" value={form.status} onChange={(e) => set("status", e.target.value as "draft" | "registered" | "completed")}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "completed" ? "Completed" : s === "registered" ? "Registered" : "Draft"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Employment History" subtitle="Used for affordability and installment assessment">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Profession">
              <input className="field" value={form.profession} onChange={(e) => set("profession", e.target.value)} />
            </Field>
            <Field label="Occupation">
              <input className="field" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
            </Field>
            <Field label="Employer Name">
              <input className="field" value={form.employerName} onChange={(e) => set("employerName", e.target.value)} />
            </Field>
            <Field label="Employer Phone">
              <input className="field" type="tel" value={form.employerPhone} onChange={(e) => set("employerPhone", e.target.value)} />
            </Field>
            <Field label="Employer Address" span="sm:col-span-2">
              <input className="field" value={form.employerAddress} onChange={(e) => set("employerAddress", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Subscription Details" subtitle="Payment plan, plot preference and volume">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <label className="label-field">Payment Option</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {PAYMENT_OPTIONS.map(({ value, hint }) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-start gap-2 rounded-md border border-input bg-surface p-3 transition-colors hover:border-navy has-[:checked]:border-navy has-[:checked]:bg-navy-soft"
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={form.paymentOption === value}
                      onChange={() => set("paymentOption", value)}
                      className="mt-0.5 h-4 w-4 accent-navy"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{value}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Number of Plots (fractions allowed)">
                  <input
                    className="field"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.numberOfPlots}
                    onChange={(e) => set("numberOfPlots", e.target.value)}
                  />
                </Field>
                <Field label="Preferred Estate">
                  <select className="field" value={form.preferredEstate} onChange={(e) => set("preferredEstate", e.target.value)}>
                    {ESTATES.map((estate) => (
                      <option key={estate}>{estate}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div>
              <label className="label-field">Plot Preference</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {PLOT_PREFERENCES.map((p) => (
                  <label
                    key={p}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md border border-input bg-surface p-3 text-sm transition-colors hover:border-navy has-[:checked]:border-navy has-[:checked]:bg-navy-soft"
                  >
                    <input
                      type="checkbox"
                      checked={form.plotPreference.includes(p)}
                      onChange={() => togglePlotPreference(p)}
                      className="h-4 w-4 rounded accent-navy"
                    />
                    <span className="font-medium">{p}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <label className="label-field">If Other, please specify</label>
                <input
                  className="field"
                  value={form.plotPreferenceOther}
                  onChange={(e) => set("plotPreferenceOther", e.target.value)}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Referral" subtitle="Who introduced the subscriber to BOD Properties">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Referrer Name">
              <input className="field" value={form.referrerName} onChange={(e) => set("referrerName", e.target.value)} />
            </Field>
            <Field label="Referrer Occupation">
              <input className="field" value={form.referrerOccupation} onChange={(e) => set("referrerOccupation", e.target.value)} />
            </Field>
            <Field label="Referrer Phone">
              <input className="field" type="tel" value={form.referrerPhone} onChange={(e) => set("referrerPhone", e.target.value)} />
            </Field>
            <Field label="Referrer Address">
              <input className="field" value={form.referrerAddress} onChange={(e) => set("referrerAddress", e.target.value)} />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end gap-3 pb-2">
          <Link
            href={`/subscribers/${id}`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-surface px-5 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}