"use client";

import { useEffect, useMemo, useState, useCallback, memo, useTransition } from "react";
import dynamic from "next/dynamic";
import { Loader2, Plus, MapPin, UserPlus, CalendarClock, Map, Pencil, TrendingUp, Wallet, LandPlot, Building2, Sparkles, ArrowUpRight, Users, DollarSign, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toTitleCase } from "@/lib/text";

const EstateSubscriberForm = dynamic(() => import("./EstateSubscriberForm").then(m => ({ default: m.EstateSubscriberForm })), { ssr: false });

type Estate = {
  id: string;
  name: string;
  location: string;
  total_plots: number;
  available_plots: number;
  price_per_plot: number;
  status_tag: string | null;
  legal_fee_percent: number | null;
  allocation_fee_percent: number | null;
  maintenance_fee_rate: number | null;
  security_fee_rate: number | null;
  form_fee_amount: number | null;
};

type SubscriberLite = {
  estate_id: string | null;
  preferred_estate: string;
  number_of_plots: number;
  created_at: string;
};

type EstateFormValues = {
  name: string;
  location: string;
  total_plots: string;
  available_plots: string;
  price_per_plot: string;
  status_tag: string;
  legal_fee_percent: string;
  allocation_fee_percent: string;
  maintenance_fee_rate: string;
  security_fee_rate: string;
  form_fee_amount: string;
};

const EMPTY_ESTATE_FORM: EstateFormValues = {
  name: "",
  location: "",
  total_plots: "",
  available_plots: "",
  price_per_plot: "",
  status_tag: "",
  legal_fee_percent: "2",
  allocation_fee_percent: "3",
  maintenance_fee_rate: "2500",
  security_fee_rate: "2500",
  form_fee_amount: "5000",
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const nairaCompact = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", notation: "compact", maximumFractionDigits: 1 });

const EstateFormModal = memo(function EstateFormModal({
  estate,
  onClose,
  onSaved,
}: {
  estate: Estate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!estate;
  const [form, setForm] = useState<EstateFormValues>(() =>
    estate
      ? {
          name: estate.name,
          location: estate.location,
          total_plots: String(estate.total_plots),
          available_plots: String(estate.available_plots),
          price_per_plot: String(estate.price_per_plot),
          status_tag: estate.status_tag ?? "",
          legal_fee_percent: String(estate.legal_fee_percent ?? 2),
          allocation_fee_percent: String(estate.allocation_fee_percent ?? 3),
          maintenance_fee_rate: String(estate.maintenance_fee_rate ?? 2500),
          security_fee_rate: String(estate.security_fee_rate ?? 2500),
          form_fee_amount: String(estate.form_fee_amount ?? 5000),
        }
      : EMPTY_ESTATE_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const total = Number(form.total_plots);
    const available = form.available_plots.trim() === "" ? total : Number(form.available_plots);
    const price = Number(form.price_per_plot);
    const legalFeePercent = form.legal_fee_percent.trim() === "" ? 0 : Number(form.legal_fee_percent);
    const allocationFeePercent = form.allocation_fee_percent.trim() === "" ? 0 : Number(form.allocation_fee_percent);
    const maintenanceRate = form.maintenance_fee_rate.trim() === "" ? 2500 : Number(form.maintenance_fee_rate);
    const securityRate = form.security_fee_rate.trim() === "" ? 2500 : Number(form.security_fee_rate);
    const formAmount = form.form_fee_amount.trim() === "" ? 5000 : Number(form.form_fee_amount);

    if (!form.name.trim() || !form.location.trim()) return setError("Name and location required.");
    if (!Number.isFinite(total) || total <= 0) return setError("Total plots must be >0");
    if (available < 0 || available > total) return setError("Available must be 0..total");
    if (!Number.isFinite(price) || price < 0) return setError("Invalid price");
    if (!Number.isFinite(legalFeePercent) || legalFeePercent < 0 || legalFeePercent > 100) return setError("Legal fee % must be 0-100");
    if (!Number.isFinite(allocationFeePercent) || allocationFeePercent < 0 || allocationFeePercent > 100) return setError("Allocation fee % must be 0-100");

    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: toTitleCase(form.name.trim()),
      location: toTitleCase(form.location.trim()),
      total_plots: total,
      available_plots: available,
      price_per_plot: price,
      status_tag: form.status_tag.trim() ? toTitleCase(form.status_tag.trim()) : null,
      legal_fee_percent: legalFeePercent,
      allocation_fee_percent: allocationFeePercent,
      maintenance_fee_rate: maintenanceRate,
      security_fee_rate: securityRate,
      form_fee_amount: formAmount,
    };

    const { error } = isEdit
      ? await supabase.from("estates").update(payload).eq("id", estate!.id)
      : await supabase.from("estates").insert(payload);

    setSaving(false);
    if (error) return setError(error.message);
    onSaved(); onClose();
  }, [form, isEdit, estate, onSaved, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl my-8 rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{isEdit ? "Edit Estate" : "Register New Estate"}</h2>
              <p className="text-xs text-slate-300 mt-1">Estate defaults flow to subscribers • per-customer can override</p>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">✕</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Estate name</label>
              <input className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10" placeholder="B-Top Garden" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Location</label>
              <input className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-slate-900 focus:bg-white focus:outline-none" placeholder="Shimawa, Ogun State" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total plots</label><input type="number" className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold focus:border-slate-900 focus:bg-white focus:outline-none" placeholder="420" value={form.total_plots} onChange={e => setForm(f => ({...f, total_plots: e.target.value}))} /></div>
              <div><label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Price / plot</label><input type="number" className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold focus:border-slate-900 focus:bg-white focus:outline-none" placeholder="3500000" value={form.price_per_plot} onChange={e => setForm(f => ({...f, price_per_plot: e.target.value}))} /></div>
            </div>
            <div><label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Status tag</label><input className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-slate-900 focus:bg-white focus:outline-none" placeholder="Registered Survey & Deed" value={form.status_tag} onChange={e => setForm(f => ({...f, status_tag: e.target.value}))} /></div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-slate-700" /><p className="text-xs font-bold uppercase tracking-wide">Fee Defaults</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white border p-3"><label className="text-[11px] font-semibold uppercase text-slate-500">Legal %</label><input type="number" className="mt-1 w-full bg-transparent text-sm font-bold focus:outline-none" value={form.legal_fee_percent} onChange={e => setForm(f => ({...f, legal_fee_percent: e.target.value}))} /><p className="text-[11px] text-slate-400">% of land</p></div>
              <div className="rounded-lg bg-white border p-3"><label className="text-[11px] font-semibold uppercase text-slate-500">Allocation %</label><input type="number" className="mt-1 w-full bg-transparent text-sm font-bold focus:outline-none" value={form.allocation_fee_percent} onChange={e => setForm(f => ({...f, allocation_fee_percent: e.target.value}))} /><p className="text-[11px] text-slate-400">% of land</p></div>
              <div className="rounded-lg bg-white border p-3"><label className="text-[11px] font-semibold uppercase text-slate-500">Maintenance</label><input type="number" className="mt-1 w-full bg-transparent text-sm font-bold focus:outline-none" value={form.maintenance_fee_rate} onChange={e => setForm(f => ({...f, maintenance_fee_rate: e.target.value}))} /><p className="text-[11px] text-slate-400">₦/mo</p></div>
              <div className="rounded-lg bg-white border p-3"><label className="text-[11px] font-semibold uppercase text-slate-500">Security</label><input type="number" className="mt-1 w-full bg-transparent text-sm font-bold focus:outline-none" value={form.security_fee_rate} onChange={e => setForm(f => ({...f, security_fee_rate: e.target.value}))} /><p className="text-[11px] text-slate-400">₦/mo</p></div>
              <div className="col-span-2 rounded-lg bg-white border p-3"><label className="text-[11px] font-semibold uppercase text-slate-500">Form fee (one-time)</label><input type="number" className="mt-1 w-full bg-transparent text-sm font-bold focus:outline-none" value={form.form_fee_amount} onChange={e => setForm(f => ({...f, form_fee_amount: e.target.value}))} /></div>
            </div>
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-medium text-red-800">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{isEdit ? "Save Changes" : "Register Estate"}</button>
          </div>
        </form>
      </div>
    </div>
  );
});

const EstateCard = memo(function EstateCard({ estate, metrics, onRegister, onEdit }: { estate: Estate; metrics: { soldPlots: number; availableCalc: number; pct: number; todayCount: number; soldValue: number }; onRegister: () => void; onEdit: () => void }) {
  const { soldPlots, availableCalc, pct, todayCount, soldValue } = metrics;
  const soldOut = availableCalc <= 0;
  const progressColor = pct >= 100 ? "from-red-500 to-red-600" : pct >= 70 ? "from-amber-500 to-orange-500" : pct >= 30 ? "from-blue-500 to-indigo-600" : "from-emerald-500 to-teal-600";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-xl hover:border-zinc-300">
      {/* Top accent */}
      <div className={`h-1 w-full bg-gradient-to-r ${progressColor}`} />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white"><Building2 className="h-4 w-4" /></div>
              <h3 className="truncate text-[15px] font-bold tracking-tight text-slate-900">{toTitleCase(estate.name)}</h3>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500"><MapPin className="h-3.5 w-3.5" />{toTitleCase(estate.location)}</div>
          </div>
          <button onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-900 hover:text-white hover:border-zinc-900"><Pencil className="h-3.5 w-3.5" /></button>
        </div>

        {/* Metrics */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total</div>
            <div className="mt-1 text-[15px] font-black text-slate-900">{estate.total_plots}</div>
          </div>
          <div className={`rounded-xl border p-3 text-center ${soldOut ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Avail</div>
            <div className={`mt-1 text-[15px] font-black ${soldOut ? "text-red-600" : "text-emerald-700"}`}>{availableCalc}</div>
          </div>
          <div className="rounded-xl bg-slate-900 text-white p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sold</div>
            <div className="mt-1 text-[15px] font-black">{soldPlots}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-500">{pct}% sold</span>
            <span className="font-bold text-slate-900">{nairaCompact.format(soldValue)} sold</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${progressColor}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
        </div>

        {/* Today + Status */}
        <div className="mt-4 flex flex-wrap gap-2">
          {todayCount > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-700 px-2.5 py-1 text-[11px] font-bold"><Clock3 className="h-3 w-3" />{todayCount} today</span>}
          {estate.status_tag && <span className="inline-flex rounded-full bg-zinc-100 text-zinc-600 px-2.5 py-1 text-[11px] font-medium">{toTitleCase(estate.status_tag)}</span>}
          {soldOut && <span className="inline-flex rounded-full bg-red-600 text-white px-2.5 py-1 text-[11px] font-bold">Sold Out</span>}
        </div>

        {/* Price & Fees */}
        <div className="mt-4 rounded-xl bg-zinc-50 border border-zinc-100 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Price / Plot</div>
              <div className="text-sm font-black text-slate-900">{naira.format(estate.price_per_plot)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Fees</div>
              <div className="text-[11px] font-medium text-zinc-600">L {estate.legal_fee_percent ?? 0}% • A {estate.allocation_fee_percent ?? 0}%</div>
              <div className="text-[11px] text-zinc-500">{naira.format(estate.maintenance_fee_rate ?? 2500)}/mo • {naira.format(estate.form_fee_amount ?? 5000)}</div>
            </div>
          </div>
        </div>

        {/* Action */}
        <button onClick={onRegister} disabled={soldOut} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-black disabled:bg-zinc-100 disabled:text-zinc-400 group/btn">
          <UserPlus className="h-4 w-4" />{soldOut ? "Sold Out" : "Add Subscriber"}<ArrowUpRight className="h-4 w-4 opacity-60 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </button>
      </div>
    </div>
  );
});

function Skeleton() {
  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="animate-pulse rounded-[20px] border border-zinc-200 bg-white p-5"><div className="h-4 w-3/4 rounded bg-zinc-100" /><div className="mt-6 grid grid-cols-3 gap-3"><div className="h-16 rounded-xl bg-zinc-50" /><div className="h-16 rounded-xl bg-zinc-50" /><div className="h-16 rounded-xl bg-zinc-50" /></div><div className="mt-6 h-2 rounded-full bg-zinc-100" /></div>)}</div>;
}

export function EstatesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEstate, setEditingEstate] = useState<Estate | null>(null);
  const [subEstate, setSubEstate] = useState<Estate | null>(null);
  const [, startTransition] = useTransition();

  const loadEstates = useCallback(async () => {
    setError(null);
    const [estatesRes, subsRes] = await Promise.all([
      supabase.from("estates").select("id,name,location,total_plots,available_plots,price_per_plot,status_tag,legal_fee_percent,allocation_fee_percent,maintenance_fee_rate,security_fee_rate,form_fee_amount").order("created_at", { ascending: false }).limit(100),
      supabase.from("subscribers").select("estate_id,preferred_estate,number_of_plots,created_at").limit(5000),
    ]);
    if (estatesRes.error) { setError(estatesRes.error.message); setLoading(false); return; }
    startTransition(() => {
      setEstates((estatesRes.data as Estate[]) ?? []);
      setSubscribers((subsRes.data as SubscriberLite[]) ?? []);
      setLoading(false);
    });
  }, [supabase]);

  useEffect(() => { loadEstates(); }, [loadEstates]);

  const estateMetrics = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const map: Record<string, { soldPlots: number; availableCalc: number; pct: number; todayCount: number; soldValue: number }> = {};
    for (const e of estates) {
      let sold = 0, todayCount = 0;
      for (const s of subscribers) {
        const matchById = s.estate_id === e.id;
        const matchByName = !s.estate_id && (s.preferred_estate || "").toLowerCase().trim() === e.name.toLowerCase().trim();
        if (matchById || matchByName) {
          sold += Number(s.number_of_plots) || 0;
          if (new Date(s.created_at) >= today) todayCount += 1;
        }
      }
      const availableCalc = Math.max(e.total_plots - sold, 0);
      const pct = e.total_plots ? Math.round((sold / e.total_plots) * 100) : 0;
      const soldValue = sold * e.price_per_plot;
      map[e.id] = { soldPlots: sold, availableCalc, pct, todayCount, soldValue };
    }
    return map;
  }, [estates, subscribers]);

  const totals = useMemo(() => {
    let totalPlots = 0, soldPlots = 0, totalValue = 0, soldValue = 0, todayTotal = 0;
    for (const e of estates) {
      const m = estateMetrics[e.id];
      totalPlots += e.total_plots;
      totalValue += e.total_plots * e.price_per_plot;
      if (m) { soldPlots += m.soldPlots; soldValue += m.soldValue; todayTotal += m.todayCount; }
    }
    const availablePlots = Math.max(totalPlots - soldPlots, 0);
    const pct = totalPlots ? Math.round((soldPlots / totalPlots) * 100) : 0;
    return { totalPlots, soldPlots, availablePlots, pct, totalValue, soldValue, todayTotal, remainingValue: totalValue - soldValue };
  }, [estates, estateMetrics]);

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur"><Map className="h-6 w-6" /></div>
            <div>
              <h1 className="text-[22px] font-black tracking-tight">Plot Inventory</h1>
              <p className="mt-1 text-sm text-slate-300">{estates.length} estates • {totals.availablePlots.toLocaleString()} available of {totals.totalPlots.toLocaleString()} • {totals.pct}% sold • {totals.todayTotal} today</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg hover:bg-zinc-100"><Plus className="h-4 w-4" />Register Estate</button>
        </div>
        <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-300"><LandPlot className="h-4 w-4" />Total Plots</div>
            <div className="mt-2 text-2xl font-black">{totals.totalPlots.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1">{nairaCompact.format(totals.totalValue)} value</div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full bg-white rounded-full" style={{ width: "100%" }} /></div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-300"><Users className="h-4 w-4" />Sold / Available</div>
            <div className="mt-2 text-2xl font-black">{totals.soldPlots} sold</div>
            <div className="text-xs text-slate-400 mt-1">{totals.availablePlots.toLocaleString()} available • {totals.pct}% sold</div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${totals.pct}%` }} /></div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-300"><DollarSign className="h-4 w-4" />Sold Value</div>
            <div className="mt-2 text-2xl font-black">{nairaCompact.format(totals.soldValue)}</div>
            <div className="text-xs text-slate-400 mt-1">{nairaCompact.format(totals.remainingValue)} remaining</div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full bg-blue-400 rounded-full" style={{ width: `${totals.pct}%` }} /></div>
          </div>
          <div className="rounded-2xl bg-white border border-white/20 p-4 text-slate-900">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500"><CalendarClock className="h-4 w-4" />Today</div>
            <div className="mt-2 text-2xl font-black">{totals.todayTotal} registered</div>
            <div className="text-xs text-zinc-500 mt-1">Across {estates.length} estates</div>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-700"><TrendingUp className="h-3.5 w-3.5" />Live tracking</div>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">{error}</div>}

      {loading ? <Skeleton /> : estates.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 p-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white border shadow-sm"><Building2 className="h-6 w-6 text-zinc-400" /></div>
          <h3 className="mt-4 font-bold">No estates yet</h3>
          <p className="text-sm text-zinc-500 mt-1">Register your first estate to start allocating plots</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />Register Estate</button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {estates.map(e => <EstateCard key={e.id} estate={e} metrics={estateMetrics[e.id] ?? { soldPlots: 0, availableCalc: e.total_plots, pct: 0, todayCount: 0, soldValue: 0 }} onRegister={() => setSubEstate(e)} onEdit={() => setEditingEstate(e)} />)}
        </div>
      )}

      {showForm && <EstateFormModal estate={null} onClose={() => setShowForm(false)} onSaved={loadEstates} />}
      {editingEstate && <EstateFormModal estate={editingEstate} onClose={() => setEditingEstate(null)} onSaved={loadEstates} />}
      {subEstate && <EstateSubscriberForm estate={subEstate as any} onClose={() => setSubEstate(null)} onSaved={loadEstates} />}
    </div>
  );
}
