"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Search,
  RefreshCw,
  Users,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToasts, ToastStack } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  payment_option: string;
  number_of_plots: number;
  preferred_estate: string;
  plot_preference: string[];
  plot_preference_other: string | null;
  referrer_name: string | null;
  status: "draft" | "registered";
};

const ESTATES = [
  "B-Top Garden, Shimawa",
  "Royal Heritage Estate, Mowe",
  "Diamond Court, Sangotedo",
  "Emerald Vale Estate, Simawa",
];
const PAYMENT_OPTIONS = ["Outright", "Quarterly", "Monthly"];
const STATUSES = ["draft", "registered", "completed"] as const;

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

export function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [estateFilter, setEstateFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { toasts, pushToast, dismissToast } = useToasts();

  async function loadSubscribers() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("subscribers")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSubscribers((data as Subscriber[]) ?? []);
  }

  useEffect(() => {
    loadSubscribers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return subscribers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (estateFilter !== "all" && s.preferred_estate !== estateFilter) return false;
      if (paymentFilter !== "all" && s.payment_option !== paymentFilter) return false;

      if (q) {
        const haystack = [
          s.surname,
          s.other_names,
          s.phone,
          s.email ?? "",
          s.referrer_name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [subscribers, search, statusFilter, estateFilter, paymentFilter]);

  const totalPlots = useMemo(
    () => filtered.reduce((sum, s) => sum + (s.number_of_plots || 0), 0),
    [filtered]
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("subscribers")
      .delete()
      .eq("id", deleteTarget.id);

    setDeleting(false);

    if (error) {
      pushToast("error", `Delete failed: ${error.message}`);
      return;
    }

    setSubscribers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    pushToast("ok", `${deleteTarget.surname} ${deleteTarget.other_names} was deleted.`);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-5">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete subscriber?"
        description={
          deleteTarget
            ? `This will permanently remove ${deleteTarget.title ?? ""} ${deleteTarget.surname} ${deleteTarget.other_names} from the database. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-navy" />
          <h1 className="text-lg font-bold text-navy">Subscribers</h1>
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {subscribers.length}
          </span>
        </div>
        <button
          type="button"
          onClick={loadSubscribers}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-surface px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="field pl-9"
              placeholder="Search name, phone, email, referrer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "registered" ? "Registered" : "Draft"}
              </option>
            ))}
          </select>

          <select
            className="field"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">All payment plans</option>
            {PAYMENT_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            className="field lg:col-span-2"
            value={estateFilter}
            onChange={(e) => setEstateFilter(e.target.value)}
          >
            <option value="all">All estates</option>
            {ESTATES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-end text-sm text-muted-foreground lg:col-span-2">
            Total plots (filtered): <span className="ml-1 font-semibold text-navy">{totalPlots}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Failed to load subscribers: {error}</span>
        </div>
      )}

      <div className="panel overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading subscribers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No subscribers match your filters.
          </div>
        ) : (
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-border bg-navy-soft/40 text-left text-xs font-semibold uppercase tracking-wide text-navy">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Estate</th>
                <th className="px-4 py-3">Plots</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {s.title ? `${s.title} ` : ""}
                      {toTitleCase(s.surname)} {toTitleCase(s.other_names)}
                    </div>
                    {s.email && (
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.phone}</td>
                  <td className="px-4 py-3">{s.preferred_estate}</td>
                  <td className="px-4 py-3">{s.number_of_plots}</td>
                  <td className="px-4 py-3">{s.payment_option}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/subscribers/${s.id}`}
                        title="View"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-navy"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/subscribers/${s.id}/edit`}
                        title="Edit"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-navy"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setDeleteTarget(s)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}