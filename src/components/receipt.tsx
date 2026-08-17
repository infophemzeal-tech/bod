"use client";

import { Building2, Printer } from "lucide-react";

export type ReceiptData = {
  receiptNo: string;
  paymentDate: string;
  amount: number;
  method: string | null;
  note: string | null;
  subscriberName: string;
  subscriberPhone: string;
  subscriberEmail: string | null;
  estateName: string | null;
  numberOfPlots: number;
  pricePerPlot: number | null;
  totalDue: number | null;
  totalPaid: number;
  balance: number | null;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-dashed border-border py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function Receipt({ data }: { data: ReceiptData }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-navy-deep"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </button>
      </div>

      <div className="print-modal-content panel border-2 border-navy p-8 print:border-0 print:shadow-none">
        <div className="flex items-center justify-between border-b-2 border-navy pb-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-navy" />
            <div>
              <div className="text-base font-bold uppercase tracking-wide text-navy">
                BOD Properties
              </div>
              <div className="text-xs text-muted-foreground">Official Payment Receipt</div>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Receipt No.</div>
            <div className="font-semibold text-navy">{data.receiptNo}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 py-5">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Received From
            </div>
            <div className="text-sm font-semibold text-navy">{data.subscriberName}</div>
            <div className="text-sm text-muted-foreground">{data.subscriberPhone}</div>
            {data.subscriberEmail && (
              <div className="text-sm text-muted-foreground">{data.subscriberEmail}</div>
            )}
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Date
            </div>
            <div className="text-sm font-semibold text-navy">
              {new Date(data.paymentDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        <div className="rounded-md bg-navy-soft/40 p-4">
          <Row label="Estate" value={data.estateName ?? "—"} />
          <Row label="Number of Plots" value={String(data.numberOfPlots)} />
          {data.pricePerPlot != null && (
            <Row label="Price per Plot" value={naira.format(data.pricePerPlot)} />
          )}
          <Row label="Payment Method" value={data.method ?? "—"} />
          {data.note && <Row label="Note" value={data.note} />}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-md bg-navy px-5 py-4">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary-foreground/90">
            Amount Paid
          </span>
          <span className="text-2xl font-bold text-primary-foreground">
            {naira.format(data.amount)}
          </span>
        </div>

        {data.totalDue != null && (
          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-4 text-center">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total Due
              </div>
              <div className="mt-0.5 text-sm font-bold text-navy">{naira.format(data.totalDue)}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total Paid to Date
              </div>
              <div className="mt-0.5 text-sm font-bold text-emerald-600">
                {naira.format(data.totalPaid)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Outstanding Balance
              </div>
              <div
                className={`mt-0.5 text-sm font-bold ${
                  (data.balance ?? 0) <= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {naira.format(Math.max(data.balance ?? 0, 0))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex items-end justify-between">
          <div className="text-xs text-muted-foreground">
            This receipt is computer-generated and confirms payment received by BOD Properties.
          </div>
          <div className="text-center">
            <div className="mb-6 w-40 border-b border-foreground" />
            <div className="text-xs text-muted-foreground">Authorized Signature</div>
          </div>
        </div>
      </div>

    </div>
  );
}