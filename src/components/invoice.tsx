"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { DownloadPdfButton } from "@/components/download-pdf-button";

export type InvoiceLineItem = {
  id: string;
  plots: number;
  item: string;
  description: string;
  unitPrice: number;
  amount: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string | null;
  salesRepName: string | null;
  landLocation: string | null;
  subscriptionMethod: string | null;
  paymentTermMonths: number | null;
  paymentTermExpiryDate: string | null;
  billToName: string;
  billToAddress: string | null;
  lineItems: InvoiceLineItem[];
  salesDiscount: number;
  authorizedBy?: string | null;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-navy">{value}</div>
    </div>
  );
}

export function Invoice({ data }: { data: InvoiceData }) {
  const printRef = useRef<HTMLDivElement>(null);

  // Coerce every numeric input with Number(): line item amounts, unit
  // prices, and the sales discount are all backed by Postgres `numeric`
  // columns, which Supabase frequently returns as strings rather than
  // JS numbers. `reduce`'s `+` operator does STRING CONCATENATION when
  // either side is a string (unlike `-`, which always coerces to a
  // number), so without this, subtotal — and everything computed from
  // it, including the discounted total — can come out as a garbled
  // concatenated string instead of a real sum.
  const subtotal = data.lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
  const discount = Number(data.salesDiscount) || 0;
  const total = Math.max(subtotal - discount, 0);

  return (
    <div id="invoice-print-root" className="mx-auto max-w-3xl">
      {/*
        Print isolation: hide everything on the page except this root
        and what's inside it, the same way EstateReceipt does it. But
        unlike EstateReceipt's modal — a near-direct child of body —
        #invoice-print-root sits many levels deep inside the app shell
        (Next.js root layout, the page wrapper, InvoiceLoader's own
        wrapper div). A plain
        `*:not(#invoice-print-root):not(#invoice-print-root *)` rule
        also matches those ancestor wrapper divs, since they're
        neither the root nor descendants of it, so it hides them too —
        and a hidden ancestor hides everything inside it, including
        the invoice. That produces a fully blank print/PDF output.

        Fix: hide everything by default, then for any element that
        *contains* #invoice-print-root (its ancestors), use
        display:contents so it stays structurally present — passing
        its child through — without rendering as a box or hiding it.
        Only the invoice root and its own contents get their real
        display value back.

        Also force the navy background blocks (header contact bar,
        totals footer) to actually print: browsers drop background
        colors by default on print unless print-color-adjust is set,
        so without this the invoice total row prints as white-on-white.

        Finally, two things that push this onto a second, mostly-blank
        page: the browser's own default print margins (often ~1in/25mm
        on each side) eat into the usable page height before the
        content even starts, and without break-inside guidance a grid
        row or the totals box can split right at the page boundary,
        dragging a sliver of itself onto page two. @page tightens the
        margin (letting the content actually fit in one page's worth
        of height) and break-inside: avoid keeps each block whole.
      */}
      <style>{`
        @page {
          margin: 10mm;
        }
        @media print {
          body * {
            display: none !important;
          }
          body *:has(#invoice-print-root) {
            display: contents !important;
          }
          #invoice-print-root {
            display: block !important;
            margin: 0 !important;
            max-width: none !important;
          }
          #invoice-print-root * {
            display: revert !important;
          }
          #invoice-print-root .print\\:hidden {
            display: none !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
          #invoice-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-modal-content {
            box-shadow: none !important;
            border: none !important;
          }
          #invoice-print-root .p-8 {
            padding: 1.25rem !important;
          }
          #invoice-print-root .grid,
          #invoice-print-root table,
          #invoice-print-root tbody tr,
          #invoice-print-root .rounded-md {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <DownloadPdfButton targetRef={printRef as unknown as React.RefObject<HTMLElement>} filename={`invoice-${data.invoiceNumber}`} label="Download PDF" />
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-navy-deep"
        >
          <Printer className="h-4 w-4" />
          Print Invoice
        </button>
      </div>

      <div
        ref={printRef}
        className="print-modal-content panel overflow-hidden border border-border p-0 print:border-0 print:shadow-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-8 pb-5">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0 text-navy" fill="none">
              <path d="M4 36V4h14a8 8 0 0 1 0 16H4" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 20h16a8 8 0 0 1 0 16H4" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div className="text-2xl font-extrabold leading-tight tracking-tight text-navy">
                BOD <span className="font-medium">PROPERTIES</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-orange-600">
                Real Estate Consultants
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block rounded-sm bg-navy px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-foreground">
              Invoice
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Invoice Number
              <div className="text-sm font-semibold text-navy">{data.invoiceNumber}</div>
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              Invoice Date
              <div className="text-sm font-semibold text-navy">{formatDate(data.invoiceDate)}</div>
            </div>
          </div>
        </div>

        {/* Contact bar */}
        <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 bg-navy px-8 py-2 text-[11px] font-medium text-primary-foreground/90">
          <span>11 Kudirat Abiola Way, Oregun, Ikeja, Lagos</span>
          <span>+234 708 788 3335, +234 701 008 0322</span>
          <span>www.bodproperties.com</span>
        </div>

        <div className="p-8">
          {/* Bill To + Invoice No */}
          <div className="grid grid-cols-[1fr_auto] gap-6 border-b border-border pb-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Bill To
              </div>
              <div className="mt-1 text-sm font-bold text-navy">{data.billToName}</div>
              {data.billToAddress && (
                <div className="mt-0.5 max-w-xs text-sm text-muted-foreground">{data.billToAddress}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">No.</div>
              <div className="mt-1 font-mono text-lg font-bold text-navy">{data.invoiceNumber}</div>
            </div>
          </div>

          {/* Summary grid */}
          <div className="grid grid-cols-1 divide-y divide-border rounded-md border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <InfoCell label="Customer ID" value={data.customerId ?? "—"} />
            <InfoCell label="Land Location" value={data.landLocation ?? "—"} />
            <InfoCell
              label="Payment Terms"
              value={data.paymentTermMonths ? `${data.paymentTermMonths} MONTHS` : "—"}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 divide-y divide-border rounded-md border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <InfoCell label="Sales Rep Name" value={data.salesRepName ?? "—"} />
            <InfoCell label="Subscription Method" value={data.subscriptionMethod ?? "—"} />
            <InfoCell label="Payment Term Expiry Date" value={formatDate(data.paymentTermExpiryDate)} />
          </div>

          {/* Line items */}
          <div className="mt-6 overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-soft/50 text-left text-[11px] font-semibold uppercase tracking-wide text-navy">
                  <th className="px-3 py-2.5">No. of Plot(s)</th>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5 text-right">Unit Price</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.lineItems.map((li) => (
                  <tr key={li.id} className="align-top">
                    <td className="px-3 py-3 font-medium text-navy">{Number(li.plots)}</td>
                    <td className="px-3 py-3 text-foreground">{li.item}</td>
                    <td className="whitespace-pre-line px-3 py-3 text-muted-foreground">{li.description}</td>
                    <td className="px-3 py-3 text-right text-foreground">{naira.format(Number(li.unitPrice) || 0)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-navy">{naira.format(Number(li.amount) || 0)}</td>
                  </tr>
                ))}
                {data.lineItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No line items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs overflow-hidden rounded-md border border-border">
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{naira.format(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between border-t border-border px-4 py-2 text-sm">
                  <span className="text-muted-foreground">Sales Discount</span>
                  <span className="font-medium text-red-600">-{naira.format(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border bg-navy px-4 py-3">
                <span className="text-sm font-bold uppercase tracking-wide text-primary-foreground">
                  Invoice Total
                </span>
                <span className="text-base font-bold text-primary-foreground">{naira.format(total)}</span>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="mt-10 flex items-end justify-end">
            <div className="text-center">
              <div className="mb-1 w-48 border-b border-foreground/60" />
              <div className="text-xs text-muted-foreground">Authorised Signature</div>
              {data.authorizedBy && (
                <div className="mt-0.5 text-xs font-medium text-navy">{data.authorizedBy}</div>
              )}
            </div>
          </div>

          {/* Tagline */}
          <div className="mt-8 border-t border-border pt-4 text-center text-xs italic text-muted-foreground">
            ...creating real value in property and places.
          </div>
        </div>
      </div>
    </div>
  );
}