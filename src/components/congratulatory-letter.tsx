"use client";

import { Printer } from "lucide-react";

export type CongratulatoryLetterData = {
  date: string;
  salutationTitle: string;
  recipientName: string;
  addressLines: string[];
  plotDescription: string;
  estateName: string;
  estateLocation: string;
  costOfLand: number;
  costInWords: string;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CongratulatoryLetter({ data }: { data: CongratulatoryLetterData }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-navy-deep"
        >
          <Printer className="h-4 w-4" />
          Print Letter
        </button>
      </div>

      <div
        id="letter-print-area"
        className="panel flex min-h-[900px] flex-col border border-border p-10 print:border-0 print:shadow-none"
      >
        {/* Letterhead */}
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0 text-[#4b3f8f]" fill="none">
            <path d="M4 36V4h14a8 8 0 0 1 0 16H4" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 20h16a8 8 0 0 1 0 16H4" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <div className="text-xl font-extrabold leading-tight tracking-tight text-[#4b3f8f]">
              BOD <span className="font-medium">PROPERTIES</span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-red-600">
              Real Estate Consultant
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-10 flex-1 space-y-4 text-sm leading-relaxed text-foreground">
          <p>{formatDate(data.date)}</p>

          <div>
            <p className="font-semibold">{data.recipientName}</p>
            {data.addressLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <p className="pt-3">Dear {data.salutationTitle},</p>

          <h2 className="pt-1 text-center text-base font-bold uppercase tracking-wide text-navy underline underline-offset-4">
            Congratulatory Letter
          </h2>

          <p>
            The entire management of <span className="font-semibold">BOD Properties Limited</span>, Real Estate
            Consultants wishes to congratulate you for being part of this great vision.
          </p>

          <p>
            We acknowledge the receipt of your payment for {data.plotDescription} in Our Estate,{" "}
            <span className="font-semibold">
              {data.estateName}, {data.estateLocation}
            </span>
            .
          </p>

          <p>Based on your subscription and part payment find below the following details for your consumption:</p>

          <ol className="list-decimal space-y-2 pl-5">
            <li>
              All further payments shall be made in Cheques or Paid into Our Accounts in favor of{" "}
              <span className="font-semibold">BOD Properties Nigeria Limited</span>. Cash payment should not be
              made through our members of Staff or via any of our External Marketers, because it shall be at the
              Client&apos;s risk.
            </li>
            <li>
              The cost of the land is {naira.format(data.costOfLand)} ({data.costInWords}) only.
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-border pt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          <p>
            11, Kudirat Abiola Way, Oregun, Ikeja, Lagos | 234 708 788 3335, 234 701 008 0322 | 12122, Huntington
            Part Drive, Houston, Texas 77099
          </p>
          <p>info@bodproperties.com | www.bodproperties.com</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #letter-print-area,
          #letter-print-area * {
            visibility: visible;
          }
          #letter-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}