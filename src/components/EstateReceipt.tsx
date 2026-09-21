"use client";

import { Printer, X } from "lucide-react";

export type ReceiptData = {
  receiptNo: string;
  date: string;
  customerName: string;
  customerId: string;
  itemInvoice: string;
  description: string;
  subtotal: number;
  discountAmount: number;
  amountPaid: number;
  paymentMethod: string;
  currentBalance: number;
};

const COMPANY = {
  name: "BOD PROPERTIES",
  tagline: "REAL ESTATE CONSULTANTS",
  address: "11 Kudirat Abiola Way, Oregun, Ikeja, Lagos.",
  phone: "+234 708 788 3335, +234 701 008 0322",
  website: "www.bodproperties.com",
  footer: "…creating real value in property and places.",
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** Deterministic short receipt number from a subscriber/record id. */
export function makeReceiptNumber(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 900000) + 100000; // 6-digit number
  return `R${num}`;
}

export function EstateReceipt({
  data,
  onClose,
}: {
  data: ReceiptData;
  onClose: () => void;
}) {
  function handlePrint() {
    window.print();
  }

  return (
    <div
      id="receipt-modal-root"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:static print:bg-transparent print:p-0 print:backdrop-blur-none"
    >
      {/*
        Print isolation: when printing, hide everything on the page
        except this modal root and, within it, the receipt itself
        (#receipt-print-area). display:none is used (not
        visibility:hidden) so hidden content doesn't leave behind
        blank pages — but that means every ANCESTOR of the receipt
        must also be explicitly kept visible, since a display:none
        parent hides its children regardless of their own display
        value. #receipt-modal-root is that ancestor.
      */}
      <style>{`
        @media print {
          /*
            Hide everything on the page except #receipt-modal-root and
            everything inside it. Using :not() to exclude the receipt
            up front (rather than hiding everything and trying to
            selectively un-hide it again) means nothing inside the
            receipt is ever touched, so there's no display value to
            restore and no specificity conflicts to fight.
          */
          body *:not(#receipt-modal-root):not(#receipt-modal-root *) {
            display: none !important;
          }
          #receipt-modal-root {
            display: block !important;
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
          }
          #receipt-modal-root .no-print {
            display: none !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
          #receipt-print-area {
            position: absolute !important;
            top: 0;
            left: 0;
            width: 100% !important;
            max-height: none !important;
            max-width: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 24px !important;
          }
        }
      `}</style>

      <div
        id="receipt-print-area"
        className="panel flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden shadow-xl print:max-h-none print:overflow-visible"
      >
        <div className="no-print flex items-center justify-between border-b border-border bg-navy-soft/40 px-6 py-4">
          <h2 className="text-lg font-bold text-navy">Payment Receipt</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 print:overflow-visible">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-extrabold tracking-tight text-navy">
                {COMPANY.name}
              </div>
              <div className="text-xs font-bold tracking-wide text-amber-600">
                {COMPANY.tagline}
              </div>
              <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                <div>{COMPANY.address}</div>
                <div>{COMPANY.phone}</div>
                <div>{COMPANY.website}</div>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              No. <span className="font-bold text-navy">{data.receiptNo}</span>
            </div>
          </div>

          <div className="my-6 flex justify-center">
            <div className="rounded-full bg-navy px-6 py-2 text-sm font-bold tracking-wider text-white">
              PAYMENT RECEIPT
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Customer Name: </span>
              <span className="font-semibold text-navy">{data.customerName}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Date: </span>
              <span className="font-semibold text-navy">{data.date}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Customer ID: </span>
              <span className="font-semibold text-navy">{data.customerId}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Reference: </span>
              <span className="font-semibold text-navy">{data.paymentMethod}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <div className="grid grid-cols-[1fr_2fr_auto] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div>Item/Invoice</div>
              <div>Description</div>
              <div className="text-right">Amount</div>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_2fr_auto] gap-2 border-t border-border pt-3 text-sm">
              <div className="text-navy">{data.itemInvoice}</div>
              <div className="text-navy">{data.description}</div>
              <div className="text-right font-semibold text-navy">
                {naira.format(data.subtotal)}
              </div>
            </div>

            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-navy">{naira.format(data.subtotal)}</span>
              </div>
              {data.discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Sales Discount</span>
                  <span className="font-semibold">-{naira.format(data.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-1">
                <span className="font-bold text-navy">Total Due</span>
                <span className="font-bold text-navy">
                  {naira.format(data.subtotal - data.discountAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-1.5 border-t border-border pt-4 text-sm">
            <div>
              <span className="text-muted-foreground">Payment Method: </span>
              <span className="font-semibold text-navy">{data.paymentMethod}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Your current balance is =N= </span>
              <span className="font-semibold text-navy">{naira.format(data.currentBalance)}</span>
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between">
            <div className="rounded-md bg-navy-soft/60 px-4 py-2 text-sm font-semibold text-navy">
              Amount Paid: {naira.format(data.amountPaid)}
            </div>
            <div className="text-center text-xs text-muted-foreground">
              <div className="mb-1 w-40 border-t border-muted-foreground/50" />
              Authorised Signature
            </div>
          </div>

          <div className="mt-8 text-center text-xs italic text-muted-foreground">
            {COMPANY.footer}
          </div>
        </div>

        <div className="no-print flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}