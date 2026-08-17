"use client";

import { useState } from "react";
import { Loader2, RotateCcw, X, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PaymentRef = {
  id: string;
  amount: number;
  payment_date: string;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function RefundModal({
  subscriberId,
  payment,
  alreadyRefunded,
  onClose,
  onSaved,
}: {
  subscriberId: string;
  payment: PaymentRef;
  alreadyRefunded: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const remaining = Math.max(payment.amount - alreadyRefunded, 0);

  const [amount, setAmount] = useState(String(remaining));
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("");
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
    if (numericAmount > remaining) {
      setError(`Cannot refund more than ${naira.format(remaining)} (the unrefunded portion of this payment).`);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("refunds").insert({
      payment_id: payment.id,
      subscriber_id: subscriberId,
      amount: numericAmount,
      refund_date: date,
      reason: reason.trim() || null,
      method: method.trim() || null,
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
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-red-600" />
            <h2 className="text-sm font-bold text-navy">Process Refund</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-md bg-navy-soft/40 px-3 py-2 text-xs text-muted-foreground">
          Original payment: <span className="font-semibold text-navy">{naira.format(payment.amount)}</span> on{" "}
          {new Date(payment.payment_date).toLocaleDateString()}
          {alreadyRefunded > 0 && (
            <>
              <br />
              Already refunded:{" "}
              <span className="font-semibold text-red-600">{naira.format(alreadyRefunded)}</span> · Remaining
              refundable: <span className="font-semibold text-navy">{naira.format(remaining)}</span>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="label-field">Refund Amount (₦)</label>
            <input
              className="field"
              type="number"
              min="1"
              max={remaining}
              step="1"
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
            <label className="label-field">Reason (optional)</label>
            <input
              className="field"
              placeholder="e.g. Subscriber cancelled"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Method (optional)</label>
            <input
              className="field"
              placeholder="Bank transfer, cash..."
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
              disabled={saving || remaining <= 0}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Process Refund
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}