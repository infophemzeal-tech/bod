"use client";

import { useState, type RefObject } from "react";
import { Download, Loader2 } from "lucide-react";

export function DownloadPdfButton({
  targetRef,
  filename,
  label = "Download PDF",
  className = "",
}: {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
  label?: string;
  className?: string;
}) {
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    if (!targetRef.current) return;
    setGenerating(true);

    try {
      // html2canvas-pro is a maintained, drop-in-compatible fork of
      // html2canvas. The original html2canvas package's color parser
      // predates modern CSS color functions (oklch(), lab(),
      // color-mix()) and throws `Attempting to parse an unsupported
      // color function "..."` the moment it hits a computed style using
      // one — which Tailwind CSS v4's default palette uses everywhere.
      // -pro adds support for those while keeping the same API, so the
      // rest of this file is unchanged.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");

      // A4 in points: 595.28 x 841.89. Scale the captured canvas to fit width,
      // and split across multiple pages if the content is taller than one page.
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      className={
        className ||
        "inline-flex items-center gap-2 rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
      }
    >
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {generating ? "Generating..." : label}
    </button>
  );
}