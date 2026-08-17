"use client";

import { Printer, X } from "lucide-react";

// ---- Edit this to match your real company details ----
const COMPANY = {
  name: "YOUR PROPERTIES LTD",
  tagline: "REAL ESTATE CONSULTANTS",
  address: "11 Example Way, Ikeja, Lagos.",
  phone: "+234 700 000 0000",
  website: "www.yourcompany.com",
};
// --------------------------------------------------------

export type ReceiptData = {
  receiptNo: string;
  date: string; // already formatted, e.g. "Sep 30, 2025"
  customerName: string;
  customerId: string;
  itemInvoice: string;
  description: string;
  amountPaid: number;
  paymentMethod: string;
  currentBalance: number;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** Deterministic short receipt number from a subscriber id + date. */
export function makeReceiptNumber(subscriberId: string, date = new Date()) {
  const digits = subscriberId.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
  const y = date.getFullYear().toString().slice(-2);
  return `R${y}${digits}`;
}

export function EstateReceipt({
  data,
  onClose,
}: {
  data: ReceiptData;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:bg-white print:p-0">
      <div className="panel w-full max-w-xl overflow-hidden print:max-w-none print:shadow-none print:border-none">
        {/* Toolbar — hidden on print */}
        <div className="flex items-center justify-between border-b border-input bg-muted/40 px-4 py-2 print:hidden">
          <span className="text-xs font-medium text-muted-foreground">
            Payment Receipt
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Receipt body */}
        <div className="p-6 text-navy">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold leading-tight tracking-tight">
                {COMPANY.name}
              </div>
              <div className="text-[10px] font-semibold tracking-widest text-amber-700">
                {COMPANY.tagline}
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                <div>{COMPANY.address}</div>
                <div>{COMPANY.phone}</div>
                <div>{COMPANY.website}</div>
              </div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              No.{" "}
              <span className="font-semibold text-navy">{data.receiptNo}</span>
            </div>
          </div>

          <div className="my-4 flex justify-center">
            <div className="rounded-full bg-navy px-8 py-1.5 text-sm font-bold tracking-wide text-white">
              PAYMENT RECEIPT
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
            <div>
              <span className="text-muted-foreground">Customer Name: </span>
              <span className="font-medium">{data.customerName}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Date: </span>
              <span className="font-medium">{data.date}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Customer ID: </span>
              <span className="font-medium">{data.customerId}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Reference: </span>
              <span className="font-medium">{data.paymentMethod}</span>
            </div>
          </div>

          <div className="mt-4 border-y border-input py-3">
            <div className="grid grid-cols-[80px_1fr_100px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Item/Invoice</span>
              <span>Description</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="mt-1 grid grid-cols-[80px_1fr_100px] gap-2 text-[12px]">
              <span>{data.itemInvoice}</span>
              <span>{data.description}</span>
              <span className="text-right font-medium">
                {naira.format(data.amountPaid)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span>
              <span className="text-muted-foreground">Payment Method: </span>
              <span className="font-medium">{data.paymentMethod}</span>
            </span>
          </div>

          <div className="mt-1 text-[12px]">
            <span className="text-muted-foreground">Your current balance is =N= </span>
            <span className="font-semibold">
              {naira.format(data.currentBalance)}
            </span>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <div className="rounded-md bg-navy-soft/40 px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">Amount Paid: </span>
              <span className="font-bold">{naira.format(data.amountPaid)}</span>
            </div>
            <div className="text-center">
              <div className="mb-1 h-10 w-36 border-b border-navy/40" />
              <div className="text-[10px] text-muted-foreground">
                Authorised Signature
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] italic text-muted-foreground">
            …creating real value in property and places.
          </div>
        </div>
      </div>
    </div>
  );
}