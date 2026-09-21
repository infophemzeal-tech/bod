"use client";

import { useEffect, useMemo, useState, useCallback, memo, useTransition } from "react";
import dynamic from "next/dynamic";
import { Loader2, Plus, MapPin, UserPlus, CalendarClock, Map } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toTitleCase } from "@/lib/text";

const EstateSubscriberForm = dynamic(
  () => import("./EstateSubscriberForm").then(m => ({ default: m.EstateSubscriberForm })),
  { ssr: false, loading: () => null }
);

const RegisterEstateFormInner = memo(function RegisterEstateFormInner({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", location: "", total_plots: "", available_plots: "", price_per_plot: "", status_tag: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const total = Math.floor(Number(form.total_plots));
    const available = form.available_plots.trim() === ""? total : Math.floor(Number(form.available_plots));
    const price = Number(form.price_per_plot);

    if (!form.name.trim() ||!form.location.trim()) return setError("Name and location required.");
    if (!Number.isFinite(total) || total <= 0) return setError("Total plots must be > 0");
    if (!Number.isFinite(available) || available < 0 || available > total) return setError("Available must be 0 to total");
    if (!Number.isFinite(price) || price < 0) return setError("Invalid price");

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("estates").insert({
      name: toTitleCase(form.name.trim()),
      location: toTitleCase(form.location.trim()),
      total_plots: total,
      available_plots: available,
      price_per_plot: price,
      status_tag: form.status_tag.trim()? toTitleCase(form.status_tag.trim()) : null,
    });
    setSaving(false);
    if (error) return setError(error.message);
    onSaved();
    onClose();
  }, [form, onSaved, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-bold text-navy">Register New Estate</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="label-field">Estate name</label>
            <input className="field" placeholder="B-Top Garden" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
            {form.name && <p className="mt-1 text-xs text-muted-foreground">Will save as: <span className="font-medium text-navy">{toTitleCase(form.name)}</span></p>}
          </div>
          <div>
            <label className="label-field">Location</label>
            <input className="field" placeholder="Shimawa, Ogun State" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} required />
            {form.location && <p className="mt-1 text-xs text-muted-foreground">Will save as: <span className="font-medium text-navy">{toTitleCase(form.location)}</span></p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">Total plots</label><input type="number" min="1" step="1" className="field" placeholder="420" value={form.total_plots} onChange={e => setForm(f => ({...f, total_plots: e.target.value}))} /></div>
            <div><label className="label-field">Available</label><input type="number" min="0" step="1" className="field" placeholder="Defaults to total" value={form.available_plots} onChange={e => setForm(f => ({...f, available_plots: e.target.value}))} /></div>
          </div>
          <div><label className="label-field">Price per plot (₦)</label><input type="number" min="0" className="field" placeholder="3500000" value={form.price_per_plot} onChange={e => setForm(f => ({...f, price_per_plot: e.target.value}))} /></div>
          <div><label className="label-field">Status tag</label><input className="field" placeholder="Registered Survey & Deed" value={form.status_tag} onChange={e => setForm(f => ({...f, status_tag: e.target.value}))} /></div>
          {error && <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded border border-input px-4 py-2 text-sm">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded bg-navy px-4 py-2 text-sm text-white disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
RegisterEstateFormInner.displayName = "RegisterEstateFormInner";

type Estate = {
  id: string;
  name: string;
  location: string;
  total_plots: number;
  available_plots: number;
  price_per_plot: number;
  status_tag: string | null;
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const EstateCard = memo(function EstateCard({ estate, registeredToday, onRegister }: { estate: Estate; registeredToday: number; onRegister: () => void }) {
  const sold = Math.max(0, estate.total_plots - estate.available_plots);
  const pct = estate.total_plots? Math.min(100, Math.round((sold / estate.total_plots) * 100)) : 0;
  const soldOut = estate.available_plots <= 0;

  return (
    <button type="button" onClick={onRegister} disabled={soldOut} className="panel group w-full p-5 text-left transition hover:border-navy/30 disabled:opacity-70">
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-navy">{toTitleCase(estate.name)}</h3>
          <div className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{toTitleCase(estate.location)}</div>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{pct}% sold</span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-navy" style={{ width: `${pct}%` }} /></div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border border-y border-border py-3 text-center">
        <div><div className="text- font-semibold uppercase tracking-wide text-muted-foreground">Total</div><div className="mt-0.5 text-sm font-bold text-navy">{estate.total_plots}</div></div>
        <div><div className="text- font-semibold uppercase tracking-wide text-muted-foreground">Avail</div><div className="mt-0.5 text-sm font-bold text-emerald-600">{estate.available_plots}</div></div>
        <div><div className="text- font-semibold uppercase tracking-wide text-muted-foreground">Sold</div><div className="mt-0.5 text-sm font-bold text-navy">{sold}</div></div>
      </div>

      {registeredToday > 0 && <div className="mt-3 flex items-center gap-1.5 rounded-md bg-navy-soft px-2.5 py-1.5 text-xs font-semibold text-navy"><CalendarClock className="h-3.5 w-3.5" />{registeredToday} today</div>}

      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div><div className="text- font-semibold uppercase tracking-wide text-muted-foreground">Price / Plot</div><div className="text-sm font-bold text-navy">{naira.format(estate.price_per_plot)}</div></div>
        {estate.status_tag && <span className="max-w-[45%] truncate text-xs text-muted-foreground" title={estate.status_tag}>{toTitleCase(estate.status_tag)}</span>}
      </div>

      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-navy opacity-0 transition group-hover:opacity-100">
        <UserPlus className="h-3.5 w-3.5" />{soldOut? "Sold out" : "Register subscriber"}
      </div>
    </button>
  );
});
EstateCard.displayName = "EstateCard";

function Skeleton() {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="panel animate-pulse p-5"><div className="h-4 w-3/4 rounded bg-muted" /><div className="mt-3 h-3 w-1/2 rounded bg-muted" /><div className="mt-6 h-1.5 rounded bg-muted" /></div>)}</div>;
}

export function EstatesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subEstate, setSubEstate] = useState<Estate | null>(null);
  const [, startTransition] = useTransition();

  const loadEstates = useCallback(async () => {
    setError(null);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [estatesRes, todayRes] = await Promise.all([
      supabase.from("estates").select("id,name,location,total_plots,available_plots,price_per_plot,status_tag").order("created_at", { ascending: false }).limit(100),
      supabase.from("subscribers").select("estate_id").gte("created_at", startOfToday.toISOString()).limit(1000),
    ]);

    if (estatesRes.error) {
      setError(estatesRes.error.message);
      setLoading(false);
      return;
    }

    startTransition(() => {
      setEstates((estatesRes.data as Estate[])?? []);
      const c: Record<string, number> = {};
      for (const r of todayRes.data?? []) if (r.estate_id) c[r.estate_id] = (c[r.estate_id]?? 0) + 1;
      setCounts(c);
      setLoading(false);
    });
  }, [supabase]);

  useEffect(() => { loadEstates(); }, [loadEstates]);

  const totals = useMemo(() =>
    estates.reduce((a, e) => ({ total: a.total + e.total_plots, available: a.available + e.available_plots }), { total: 0, available: 0 }),
  [estates]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-navy-soft text-navy"><Map className="h-5 w-5" /></div>
          <div><h1 className="text-xl font-bold text-navy">Plot Inventory</h1><p className="text-sm text-muted-foreground">{estates.length} estates • {totals.available} of {totals.total} available</p></div>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep"><Plus className="h-4 w-4" />Register Estate</button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      {loading? <Skeleton /> : estates.length === 0? <div className="panel p-12 text-center text-sm text-muted-foreground">No estates yet.</div> :
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {estates.map(e => <EstateCard key={e.id} estate={e} registeredToday={counts[e.id]?? 0} onRegister={() => setSubEstate(e)} />)}
        </div>
      }

      {showForm && <RegisterEstateFormInner onClose={() => setShowForm(false)} onSaved={loadEstates} />}
      {subEstate && <EstateSubscriberForm estate={subEstate} onClose={() => setSubEstate(null)} onSaved={loadEstates} />}
    </div>
  );
}