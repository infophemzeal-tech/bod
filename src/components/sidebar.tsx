"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserPlus, Users, Building2, type LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "New Subscriber", href: "/", icon: UserPlus, exact: true },
  { label: "Subscribers", href: "/subscribers", icon: Users },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  // "/" should not match everything
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-slate-50/50 dark:bg-slate-900/20">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          <Building2 className="h-5 w-5" />
        </div>
        <span className="text-sm font-bold uppercase tracking-[0.06em] text-slate-900 dark:text-white">
          BOD Properties
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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