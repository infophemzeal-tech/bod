"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, Receipt, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toTitleCase } from "@/lib/text";

type Payment = {
  id: string;
  created_at: string;
  amount: number;
  payment_date: string | null;
  method: string | null;
  note: string | null;
  type?: string | null;
  refund_reason?: string | null;
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const fmt = (iso: string | null) => { if(!iso) return "—"; try{ return new Date(iso).toISOString().slice(0,10);}catch{ return iso as string; } };

export function TransactionHistory({ subscriberId }: { subscriberId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundAmt, setRefundAmt] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("payments")
     .select("id,created_at,amount,payment_date,method,note,type,refund_reason")
     .eq("subscriber_id", subscriberId)
     .order("payment_date", { ascending: false, nullsFirst: false })
     .order("created_at", { ascending: false })
     .limit(100);
    setPayments((data as Payment[])?? []);
    setLoading(false);
  }, [subscriberId]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    let paid = 0, refunded = 0;
    for(const p of payments){
      const a = Number(p.amount) || 0;
      if(p.type === 'refund' || a < 0) refunded += Math.abs(a);
      else paid += a;
    }
    return { paid, refunded, net: paid - refunded };
  }, [payments]);

  async function doRefund(e: React.FormEvent){
    e.preventDefault();
    const amt = Number(refundAmt);
    if(!amt ||!refundReason.trim()) return alert("Enter amount and reason");
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("payments").insert({
      subscriber_id: subscriberId,
      amount: -Math.abs(amt),
      payment_date: new Date().toISOString().slice(0,10),
      method: "Refund",
      type: "refund",
      note: toTitleCase(refundReason),
      refund_reason: refundReason
    });
    if(error) alert(error.message);
    setSaving(false); setRefundAmt(""); setRefundReason(""); load();
  }

  if(loading) return <div className="panel p-6 flex justify-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading transactions...</div>;

  return (
    <div className="space-y-4">
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-full bg-navy-soft text-navy"><Receipt className="h-4 w-4" /></div><div><h2 className="text-sm font-bold text-navy">Transaction History</h2><p className="text-xs text-muted-foreground">Paid {naira.format(totals.paid)} • Refunded {naira.format(totals.refunded)} • Net {naira.format(totals.net)}</p></div></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${totals.net < 0? "bg-red-100 text-red-700" : "bg-navy text-white"}`}>{naira.format(totals.net)}</span>
        </div>

        {payments.length === 0? <div className="p-10 text-center text-sm text-muted-foreground">No transactions yet.</div> : (
          <div className="divide-y">
            {payments.map(p => {
              const isRefund = p.type === 'refund' || Number(p.amount) < 0;
              return (
                <div key={p.id} className={`flex items-center justify-between p-4 ${isRefund? "bg-red-50/40" : "hover:bg-muted/30"}`}>
                  <div><div className={`font-bold ${isRefund? "text-red-600" : "text-navy"}`}>{isRefund? "-" : ""}{naira.format(Math.abs(Number(p.amount)))}</div><div className="text-xs text-muted-foreground" suppressHydrationWarning>{fmt(p.payment_date || p.created_at)} • {toTitleCase(p.method || "Transfer")} • {isRefund? "Refund" : "Payment"}</div>{(p.note || p.refund_reason) && <div className="mt-1 text-xs text-muted-foreground">{toTitleCase(p.refund_reason || p.note || "")}</div>}</div>
                  <span className={`rounded-full px-2 py-0.5 text- font-semibold ${isRefund? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{isRefund? "Refund" : "Paid"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={doRefund} className="panel p-4">
        <h3 className="text-sm font-bold text-navy flex items-center gap-2"><Undo2 className="h-4 w-4" />Issue Refund</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr_auto]">
          <input type="number" className="field" placeholder="Amount" value={refundAmt} onChange={e => setRefundAmt(e.target.value)} />
          <input className="field" placeholder="Reason" value={refundReason} onChange={e => setRefundReason(e.target.value)} />
          <button disabled={saving} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{saving? "Saving..." : "Refund"}</button>
        </div>
      </form>
    </div>
  );
}

// Add default export too - fixes your build error
export default TransactionHistory;