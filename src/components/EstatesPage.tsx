"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, MapPin, X, AlertCircle, Map, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EstateSubscriberForm } from "./EstateSubscriberForm";

type Estate = {
  id: string;
  created_at: string;
  name: string;
  location: string;
  total_plots: number;
  available_plots: number;
  price_per_plot: number;
  status_tag: string | null;
};

type EstateFormState = {
  name: string;
  location: string;
  total_plots: string;
  available_plots: string;
  price_per_plot: string;
  status_tag: string;
};

const EMPTY_FORM: EstateFormState = {
  name: "",
  location: "",
  total_plots: "",
  available_plots: "",
  price_per_plot: "",
  status_tag: "",
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function percentSold(estate: Estate) {
  if (!estate.total_plots) return 0;
  const sold = estate.total_plots - estate.available_plots;
  return Math.round((sold / estate.total_plots) * 100);
}

function EstateCard({ estate, onRegister }: { estate: Estate; onRegister: () => void }) {
  const sold = estate.total_plots - estate.available_plots;
  const pct = percentSold(estate);
  const soldOut = estate.available_plots <= 0;

  return (
    <button
      type="button"
      onClick={onRegister}
      disabled={soldOut}
      className="panel group relative w-full p-5 text-left transition-colors hover:border-navy disabled:cursor-not-allowed disabled:opacity-70"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-navy">{estate.name}</h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {estate.location}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {pct}% sold
        </span>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-navy"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border border-y border-border py-3 text-center">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Total
          </div>
          <div className="mt-0.5 text-sm font-bold text-navy">{estate.total_plots}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Available
          </div>
          <div className="mt-0.5 text-sm font-bold text-emerald-600">{estate.available_plots}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sold
          </div>
          <div className="mt-0.5 text-sm font-bold text-navy">{sold}</div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Price / Plot
          </div>
          <div className="text-lg font-bold text-navy">{naira.format(estate.price_per_plot)}</div>
        </div>
        {estate.status_tag && (
          <span className="text-xs text-muted-foreground">{estate.status_tag}</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-navy opacity-0 transition-opacity group-hover:opacity-100">
        <UserPlus className="h-3.5 w-3.5" />
        {soldOut ? "Sold out" : "Register subscriber"}
      </div>
    </button>
  );
}

function RegisterEstateForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EstateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof EstateFormState>(key: K, value: EstateFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const total = Number(form.total_plots);
    const available = form.available_plots.trim() === "" ? total : Number(form.available_plots);
    const price = Number(form.price_per_plot);

    if (!form.name.trim() || !form.location.trim()) {
      setError("Name and location are required.");
      return;
    }
    if (!Number.isFinite(total) || total <= 0) {
      setError("Total plots must be a positive number.");
      return;
    }
    if (!Number.isFinite(available) || available < 0 || available > total) {
      setError("Available plots must be between 0 and total plots.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError("Price per plot must be a valid number.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("estates").insert({
      name: form.name.trim(),
      location: form.location.trim(),
      total_plots: total,
      available_plots: available,
      price_per_plot: price,
      status_tag: form.status_tag.trim() || null,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-bold text-navy">Register New Estate</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Estate name
            </label>
            <input
              className="field"
              placeholder="e.g. B-Top Garden"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Location
            </label>
            <input
              className="field"
              placeholder="e.g. Shimawa, Ogun State"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Total plots
              </label>
              <input
                type="number"
                min={1}
                className="field"
                placeholder="420"
                value={form.total_plots}
                onChange={(e) => update("total_plots", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Available plots
              </label>
              <input
                type="number"
                min={0}
                className="field"
                placeholder="Defaults to total"
                value={form.available_plots}
                onChange={(e) => update("available_plots", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Price per plot (₦)
            </label>
            <input
              type="number"
              min={0}
              className="field"
              placeholder="3500000"
              value={form.price_per_plot}
              onChange={(e) => update("price_per_plot", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Status tag (optional)
            </label>
            <input
              className="field"
              placeholder="e.g. Registered Survey & Deed"
              value={form.status_tag}
              onChange={(e) => update("status_tag", e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-input bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Register Estate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EstatesPage() {
  const [estates, setEstates] = useState<Estate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subscribingEstate, setSubscribingEstate] = useState<Estate | null>(null);

  async function loadEstates() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("estates")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setEstates((data as Estate[]) ?? []);
  }

  useEffect(() => {
    loadEstates();
  }, []);

  const totals = useMemo(() => {
    return estates.reduce(
      (acc, e) => {
        acc.total += e.total_plots;
        acc.available += e.available_plots;
        return acc;
      },
      { total: 0, available: 0 }
    );
  }, [estates]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-navy-soft text-navy">
            <Map className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Plot Inventory</h1>
            <p className="text-sm text-muted-foreground">
              {estates.length} estate{estates.length === 1 ? "" : "s"} · {totals.available} of{" "}
              {totals.total} plots available
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-navy-deep"
        >
          <Plus className="h-4 w-4" />
          Register Estate
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Failed to load estates: {error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading estates...
        </div>
      ) : estates.length === 0 ? (
        <div className="panel p-12 text-center text-sm text-muted-foreground">
          No estates registered yet. Click &quot;Register Estate&quot; to add your first one.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {estates.map((estate) => (
            <EstateCard
              key={estate.id}
              estate={estate}
              onRegister={() => setSubscribingEstate(estate)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <RegisterEstateForm onClose={() => setShowForm(false)} onSaved={loadEstates} />
      )}

      {subscribingEstate && (
        <EstateSubscriberForm
          estate={subscribingEstate}
          onClose={() => setSubscribingEstate(null)}
          onSaved={loadEstates}
        />
      )}
    </div>
  );
}