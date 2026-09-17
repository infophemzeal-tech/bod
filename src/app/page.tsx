import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, PageHeading } from "@/components/AppShell";
import { getProfile } from "@/lib/auth";
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

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="BOD Properties"
        title="Dashboard"
        description="Quick access to the CRM modules."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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