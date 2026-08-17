"use client";

import { useEffect, useState } from "react";
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
  date_of_birth: string | null;
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
  preferred_estate: string;
  plot_preference: string[];
  plot_preference_other: string | null;
  referrer_name: string | null;
  referrer_occupation: string | null;
  referrer_phone: string | null;
  referrer_address: string | null;
  status: "draft" | "registered";
};

function Row({ label, value }: { label: string; value: ReactValue }) {
  return (
    <div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

type ReactValue = string | number | null | undefined;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-800",
    registered: "bg-blue-100 text-blue-800",
    draft: "bg-amber-100 text-amber-800",
  };
  const labels: Record<string, string> = {
    completed: "Completed",
    registered: "Registered",
    draft: "Draft",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] ?? "bg-muted text-foreground"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function SubscriberDetail({ id }: { id: string }) {
  const router = useRouter();
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showLetter, setShowLetter] = useState(false);

  const { toasts, pushToast, dismissToast } = useToasts();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("subscribers")
        .select("*")
        .eq("id", id)
        .single();

      setLoading(false);

      if (error) {
        setError(error.message);
        return;
      }

      setSubscriber(data as Subscriber);
    }

    load();
  }, [id]);

  async function handleDelete() {
    if (!subscriber) return;
    setDeleting(true);

    const supabase = createClient();
    const { error } = await supabase.from("subscribers").delete().eq("id", subscriber.id);

    setDeleting(false);

    if (error) {
      pushToast("error", `Delete failed: ${error.message}`);
      return;
    }

    router.push("/subscribers");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading subscriber...
      </div>
    );
  }

  if (error || !subscriber) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error ?? "Subscriber not found."}</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete subscriber?"
        description={`This will permanently remove ${subscriber.title ?? ""} ${subscriber.surname} ${subscriber.other_names} from the database. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/subscribers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to subscribers
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowInvoice(true)}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <FileText className="h-4 w-4" />
            View Invoice
          </button>
          <button
            type="button"
            onClick={() => setShowLetter(true)}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <Mail className="h-4 w-4" />
            View Letter
          </button>
          <Link
            href={`/subscribers/${subscriber.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold text-navy">
              {subscriber.title ? `${subscriber.title} ` : ""}
              {toTitleCase(subscriber.surname)} {toTitleCase(subscriber.other_names)}
            </h1>
            <p className="text-sm text-muted-foreground">
              Added {new Date(subscriber.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <StatusBadge status={subscriber.status} />
        </div>

        <div className="grid gap-x-8 gap-y-1 pt-2 md:grid-cols-2">
          <div>
            <h2 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-navy">
              Personal Data
            </h2>
            <Row label="Date of Birth" value={subscriber.date_of_birth} />
            <Row label="Email" value={subscriber.email} />
            <Row label="Phone" value={subscriber.phone} />
            <Row label="Contact Address" value={toTitleCase(subscriber.contact_address)} />
          </div>

          <div>
            <h2 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-navy">
              Employment
            </h2>
            <Row label="Profession" value={toTitleCase(subscriber.profession)} />
            <Row label="Occupation" value={toTitleCase(subscriber.occupation)} />
            <Row label="Employer" value={toTitleCase(subscriber.employer_name)} />
            <Row label="Employer Phone" value={subscriber.employer_phone} />
            <Row label="Employer Address" value={toTitleCase(subscriber.employer_address)} />
          </div>

          <div>
            <h2 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-navy">
              Subscription
            </h2>
            <Row label="Payment Plan" value={subscriber.payment_option} />
            <Row label="Number of Plots" value={subscriber.number_of_plots} />
            <Row label="Preferred Estate" value={subscriber.preferred_estate} />
            <Row label="Plot Preference" value={subscriber.plot_preference?.join(", ")} />
            {subscriber.plot_preference_other && (
              <Row label="Other Preference" value={subscriber.plot_preference_other} />
            )}
          </div>

          <div>
            <h2 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-navy">
              Referral
            </h2>
            <Row label="Referrer Name" value={toTitleCase(subscriber.referrer_name)} />
            <Row label="Referrer Occupation" value={toTitleCase(subscriber.referrer_occupation)} />
            <Row label="Referrer Phone" value={subscriber.referrer_phone} />
            <Row label="Referrer Address" value={toTitleCase(subscriber.referrer_address)} />
          </div>
        </div>
      </div>

      <PaymentsPanel subscriberId={subscriber.id} />

      <Modal open={showInvoice} onClose={() => setShowInvoice(false)}>
        <InvoiceLoader subscriberId={subscriber.id} showBackLink={false} />
      </Modal>

      <Modal open={showLetter} onClose={() => setShowLetter(false)}>
        <CongratulatoryLetterLoader subscriberId={subscriber.id} showBackLink={false} />
      </Modal>
    </div>
  );
}