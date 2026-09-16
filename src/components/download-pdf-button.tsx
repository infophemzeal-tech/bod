"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type Props<T extends HTMLElement = HTMLElement> = {
  targetRef: React.RefObject<T | null>;
  filename: string;
  label?: string;
};

export function DownloadPdfButton({ targetRef, filename, label = "Download PDF" }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!targetRef.current) return;
    
    setLoading(true);
    try {
      // dynamic import so it only loads on client
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {loading ? "Downloading..." : label}
    </button>
  );
}