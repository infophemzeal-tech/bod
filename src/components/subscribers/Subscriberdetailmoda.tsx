"use client";

import { X, Phone, Briefcase, Building2, User, CreditCard, Landmark } from "lucide-react";

type Payment = {
  id: string;
  created_at: string;
  amount: number;
  method: string | null;
  reference: string | null;
};

type Subscriber = {
  id: string;
  created_at: string;
  title: string | null;
  surname: string;
  other_names: string;
  date_of_birth: string | null;
  email: string | null;
  phone: string;
  contact_address: string | null;
  profession: string | null;
  occupation: string | null;
  employer_name: string | null;
  payment_option: string;
  number_of_plots: number;
  preferred_estate: string;
  amount_deposited: number; 
  total_cost: number; // The amount of the land bought
  payments?: Payment[]; 
  referrer_name: string | null;
  status: "draft" | "registered";
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-sm font-medium ${value ? "text-navy" : "text-muted-foreground/60"}`}>
        {value || "—"}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-navy">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {title}
    </div>
  );
}

export function SubscriberDetailModal({
  subscriber,
  onClose,
}: {
  subscriber: Subscriber;
  onClose: () => void;
}) {
  const fullName = [subscriber.title, subscriber.surname, subscriber.other_names]
    .filter(Boolean)
    .join(" ");

  const initials = `${subscriber.surname?.charAt(0) || ""}${
    subscriber.other_names?.charAt(0) || ""
  }`.toUpperCase();

  // Financial Calculations
  const totalLandCost = subscriber.total_cost || 0;
  const hasLandCost = totalLandCost > 0;
  
  // Use payments array if available, otherwise fall back to amount_deposited
  const totalPaid = subscriber.payments && subscriber.payments.length > 0
    ? subscriber.payments.reduce((sum, p) => sum + p.amount, 0)
    : subscriber.amount_deposited || 0;

  const balance = totalLandCost - totalPaid;
  const isFullyPaid = hasLandCost && balance <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden shadow-2xl">
        
        {/* Header Section */}
        <div className="flex items-start justify-between border-b border-border bg-navy-soft/40 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy text-base font-bold text-primary-foreground">
              {initials || <User className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy">{fullName}</h2>
              <p className="text-xs text-muted-foreground">
                Added on{" "}
                {new Date(subscriber.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          
          {/* Contact & Personal Info */}
          <div className="space-y-4">
            <SectionTitle icon={Phone} title="Contact & Personal Info" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Phone" value={subscriber.phone} />
              <Field label="Email" value={subscriber.email} />
              <Field
                label="Date of Birth"
                value={
                  subscriber.date_of_birth
                    ? new Date(subscriber.date_of_birth).toLocaleDateString()
                    : null
                }
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Contact Address" value={subscriber.contact_address} />
              </div>
              <Field label="Referrer Name" value={subscriber.referrer_name} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Work Info */}
          <div className="space-y-4">
            <SectionTitle icon={Briefcase} title="Employment History" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Profession" value={subscriber.profession} />
              <Field label="Occupation" value={subscriber.occupation} />
              <Field label="Employer Name" value={subscriber.employer_name} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Plot & Subscription Info */}
          <div className="space-y-4">
            <SectionTitle icon={Building2} title="Plot & Subscription" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Preferred Estate" value={subscriber.preferred_estate} />
              <Field label="Number of Plots" value={subscriber.number_of_plots} />
              <Field label="Payment Option" value={subscriber.payment_option} />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </div>
                {subscriber.status === "registered" ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Registered
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Draft
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Payment Details & Running Balance */}
          <div className="space-y-4">
            <SectionTitle icon={CreditCard} title="Payment & Financial Summary" />
            
            {/* Large Prominent Total Cost */}
            <div className="rounded-lg border border-navy-soft bg-navy-soft/40 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Amount of Land Bought (Total Cost)
              </div>
              <div className="mt-1 text-2xl font-bold text-navy">
                {hasLandCost ? naira.format(totalLandCost) : "Not set"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Total Paid */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                  Total Paid So Far
                </div>
                <div className="mt-1 text-xl font-bold text-emerald-700">
                  {naira.format(totalPaid)}
                </div>
              </div>

              {/* Running Balance */}
              <div className={`rounded-lg border p-4 ${
                isFullyPaid 
                  ? "border-emerald-200 bg-emerald-50" 
                  : "border-red-200 bg-red-50"
              }`}>
                <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isFullyPaid ? "text-emerald-700" : "text-red-700"
                }`}>
                  {isFullyPaid ? "Fully Paid" : "Outstanding Balance"}
                </div>
                <div className={`mt-1 text-xl font-bold ${
                  isFullyPaid ? "text-emerald-700" : "text-red-700"
                }`}>
                  {!hasLandCost ? "—" : isFullyPaid ? "₦0" : naira.format(Math.abs(balance))}
                </div>
              </div>
            </div>

            {/* Payment History Table */}
            {subscriber.payments && subscriber.payments.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Date</th>
                      <th className="px-4 py-2 font-semibold">Method</th>
                      <th className="px-4 py-2 font-semibold">Reference</th>
                      <th className="px-4 py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {subscriber.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-navy">
                          {new Date(p.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Landmark className="h-3.5 w-3.5" />
                            {p.method || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {p.reference || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                          {naira.format(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                {totalPaid > 0 
                  ? "Initial deposit recorded. No subsequent itemized payments found." 
                  : "No payments recorded yet."}
              </div>
            )}
          </div>

        </div>

        {/* Footer Section */}
        <div className="flex items-center justify-end border-t border-border bg-muted/30 px-6 py-3">
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