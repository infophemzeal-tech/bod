"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  children,
  maxWidthClass = "max-w-3xl",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8 print:static print:z-auto print:h-auto print:overflow-visible print:bg-transparent print:p-0">
      <div className={`relative w-full ${maxWidthClass} print:max-w-none print-modal-content`}>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="absolute -right-3 -top-3 z-10 rounded-full border border-border bg-surface p-1.5 text-muted-foreground shadow-md hover:bg-muted hover:text-navy print:hidden"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}