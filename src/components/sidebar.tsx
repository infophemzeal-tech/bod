"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserPlus, Users, Building2, type LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { label: "New Subscriber", href: "/", icon: UserPlus },
  { label: "Subscribers", href: "/subscribers", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-navy-soft/30">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
        <Building2 className="h-5 w-5 text-navy" />
        <span className="text-sm font-bold uppercase tracking-[0.06em] text-navy">
          BOD Properties
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-navy text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        Subscriber management
      </div>
    </aside>
  );
}