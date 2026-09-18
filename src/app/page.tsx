import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, PageHeading } from "@/components/AppShell";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserPlus, Wallet, Map, Users } from "lucide-react";

const CARDS = [
  {
    href: "/intake",
    icon: UserPlus,
    title: "Subscriber Intake",
    description: "Register a new land subscriber.",
  },
  {
    href: "/subscribers",
    icon: Users,
    title: "Subscribers",
    description: "View and manage registered subscribers.",
  },
  {
    href: "/payments",
    icon: Wallet,
    title: "Payments",
    description: "Track installment plans and receipts.",
  },
  {
    href: "/plots",
    icon: Map,
    title: "Plot Inventory",
    description: "Manage estates and plot allocation.",
  },
];

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

async function getMetrics() {
  const supabase = await createClient();

  const [subscribersRes, estatesRes, paymentsRes] = await Promise.all([
    supabase.from("subscribers").select("*", { count: "exact", head: true }),
    supabase.from("estates").select("total_plots, available_plots"),
    supabase.from("payments").select("amount"),
  ]);

  const subscriberCount = subscribersRes.count ?? 0;

  const estates = estatesRes.data ?? [];
  const totalPlots = estates.reduce((sum, e) => sum + (e.total_plots ?? 0), 0);
  const availablePlots = estates.reduce((sum, e) => sum + (e.available_plots ?? 0), 0);
  const soldPlots = totalPlots - availablePlots;

  const payments = paymentsRes.data ?? [];
  const totalCollected = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    subscriberCount,
    totalPlots,
    availablePlots,
    soldPlots,
    totalCollected,
  };
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="panel p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-navy">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }

  const metrics = await getMetrics();

  return (
    <AppShell>
      <PageHeading
        eyebrow="BOD Properties"
        title="Dashboard"
        description="Quick access to the CRM modules."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Subscribers" value={metrics.subscriberCount.toLocaleString()} />
        <MetricCard
          label="Plots Available"
          value={metrics.availablePlots.toLocaleString()}
          hint={`of ${metrics.totalPlots.toLocaleString()} total`}
        />
        <MetricCard label="Plots Sold" value={metrics.soldPlots.toLocaleString()} />
        <MetricCard label="Total Collected" value={naira.format(metrics.totalCollected)} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href} className="panel p-5 transition-colors hover:border-navy">
            <Icon className="h-6 w-6 text-gold" />
            <h2 className="mt-3 text-sm font-bold text-navy">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}