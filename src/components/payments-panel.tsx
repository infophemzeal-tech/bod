"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Wallet, X, Printer, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToasts, ToastStack } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReceiptModal } from "@/components/receipt-modal";
import { RefundModal } from "@/components/refund-modal";

type Payment = {
  id: string;
  created_at: string;
  amount: number;
  payment_date: string;
  method: string | null;
  note: string | null;
};

type Refund = {
  id: string;
  payment_id: string | null;
  amount: number;
  refund_date: string;
  reason: string | null;
};

type Balance = {
  total_due: number | null;
  total_paid: number;
  total_refunded: number;
  balance: number | null;
  price_per_plot: number | null;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function AddPaymentModal({
  subscriberId,
  onClose,
  onSaved,
}: {
  subscriberId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("payments").insert({
      subscriber_id: subscriberId,
      amount: numericAmount,
      payment_date: date,
      method: method.trim() || null,
      note: note.trim() || null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold text-navy">Record Payment</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="label-field">Amount (₦)</label>
            <input
              className="field"
              type="number"
              min="1"
              step="1"
              placeholder="500000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label-field">Date</label>
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Method (optional)</label>
            <input
              className="field"
              placeholder="Bank transfer, cash, POS..."
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Note (optional)</label>
            <input
              className="field"
              placeholder="e.g. 2nd installment"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
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
              className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PaymentsPanel({ subscriberId }: { subscriberId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<Payment | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);

  const { toasts, pushToast, dismissToast } = useToasts();

  async function load() {
    setLoading(true);
    const supabase = createClient();

    const [
      { data: paymentsData, error: paymentsError },
      { data: refundsData, error: refundsError },
      { data: balanceData, error: balanceError },
    ] = await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("subscriber_id", subscriberId)
        .order("payment_date", { ascending: false }),
      supabase
        .from("refunds")
        .select("id, payment_id, amount, refund_date, reason")
        .eq("subscriber_id", subscriberId),
      supabase
        .from("subscriber_balances")
        .select("total_due, total_paid, total_refunded, balance, price_per_plot")
        .eq("subscriber_id", subscriberId)
        .maybeSingle(),
    ]);

    setLoading(false);

    if (paymentsError) {
      pushToast("error", `Failed to load payments: ${paymentsError.message}`);
      return;
    }
    if (refundsError) {
      pushToast("error", `Failed to load refunds: ${refundsError.message}`);
      return;
    }
    if (balanceError) {
      pushToast("error", `Failed to load balance: ${balanceError.message}`);
      return;
    }

    setPayments((paymentsData as Payment[]) ?? []);
    setRefunds((refundsData as Refund[]) ?? []);
    setBalance((balanceData as Balance) ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriberId]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const supabase = createClient();
    const { error } = await supabase.from("payments").delete().eq("id", deleteTarget.id);

    setDeleting(false);

    if (error) {
      pushToast("error", `Delete failed: ${error.message}`);
      return;
    }

    pushToast("ok", "Payment removed.");
    setDeleteTarget(null);
    load();
  }

  function refundedFor(paymentId: string) {
    return refunds
      .filter((r) => r.payment_id === paymentId)
      .reduce((sum, r) => sum + Number(r.amount), 0);
  }

  const hasPrice = balance && balance.price_per_plot != null;
  const totalDue = balance?.total_due ?? 0;
  const totalPaid = balance?.total_paid ?? 0;
  const totalRefunded = balance?.total_refunded ?? 0;
  const remaining = balance?.balance ?? 0;
  const netPaid = totalPaid - totalRefunded;
  const pct = totalDue > 0 ? Math.min(100, Math.max(0, Math.round((netPaid / totalDue) * 100))) : 0;

  return (
    <div className="panel p-5">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete payment?"
        description={
          deleteTarget
            ? `Remove the ${naira.format(deleteTarget.amount)} payment recorded on ${new Date(deleteTarget.payment_date).toLocaleDateString()}? This cannot be undone.`
            : ""
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4.5 w-4.5 text-navy" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">Payments</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-navy-deep"
        >
          <Plus className="h-3.5 w-3.5" />
          Record Payment
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : !hasPrice ? (
        <p className="py-4 text-sm text-muted-foreground">
          This subscriber isn&apos;t linked to an estate with a price per plot, so a balance can&apos;t be
          calculated yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total Due
              </div>
              <div className="mt-0.5 text-base font-bold text-navy">{naira.format(totalDue)}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total Paid
              </div>
              <div className="mt-0.5 text-base font-bold text-emerald-600">{naira.format(totalPaid)}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Refunded
              </div>
              <div className="mt-0.5 text-base font-bold text-red-600">
                {totalRefunded > 0 ? `-${naira.format(totalRefunded)}` : naira.format(0)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Balance
              </div>
              <div className={`mt-0.5 text-base font-bold ${remaining <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {naira.format(Math.max(remaining, 0))}
              </div>
            </div>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${remaining <= 0 ? "bg-emerald-500" : "bg-navy"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{pct}% paid (net of refunds)</p>
        </>
      )}

      <div className="mt-4 divide-y divide-border border-t border-border">
        {payments.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          payments.map((p) => {
            const refunded = refundedFor(p.id);
            const fullyRefunded = refunded >= p.amount;
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-navy">{naira.format(p.amount)}</span>
                    {refunded > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        {fullyRefunded ? "Fully refunded" : `${naira.format(refunded)} refunded`}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.payment_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {p.method ? ` · ${p.method}` : ""}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setReceiptTarget(p)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-navy"
                    title="Print receipt"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundTarget(p)}
                    disabled={fullyRefunded}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title={fullyRefunded ? "Fully refunded" : "Process refund"}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    title="Delete payment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAdd && (
        <AddPaymentModal
          subscriberId={subscriberId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            load();
            pushToast("ok", "Payment recorded.");
          }}
        />
      )}

      {receiptTarget && (
        <ReceiptModal
          subscriberId={subscriberId}
          payment={receiptTarget}
          onClose={() => setReceiptTarget(null)}
        />
      )}

      {refundTarget && (
        <RefundModal
          subscriberId={subscriberId}
          payment={refundTarget}
          alreadyRefunded={refundedFor(refundTarget.id)}
          onClose={() => setRefundTarget(null)}
          onSaved={() => {
            load();
            pushToast("ok", "Refund processed.");
          }}
        />
      )}
    </div>
  );
}