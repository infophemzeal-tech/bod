"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  LayoutDashboard,
  UserPlus,
  Wallet,
  Map,
  Users,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plots", label: "Plot Inventory", icon: Map },
  { href: "/intake", label: "Register Customer", icon: UserPlus },
  { href: "/subscribers", label: "Subscribers", icon: Users },

  { href: "/admin", label: "Admin", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setAuthChecked(true);
    });

    // Keep this in sync if the user signs in/out in another tab, or via
    // the login page's own redirect-on-existing-session check.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setAuthChecked(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const Nav = () => (
    <>
      <div className="flex items-center gap-2 px-5 py-5">
        <Building2 className="h-6 w-6 text-gold" />
        <span className="text-sm font-bold uppercase tracking-[0.08em] text-primary-foreground">
          BOD Properties
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-navy-soft text-navy"
                  : "text-primary-foreground/80 hover:bg-navy-soft hover:text-primary-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-navy-soft px-3 py-3">
        {!authChecked ? null : isAuthenticated ? (
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-navy-soft hover:text-primary-foreground"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        ) : (
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-navy-soft hover:text-primary-foreground"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-navy px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gold" />
          <span className="text-sm font-bold uppercase text-primary-foreground">BOD Properties</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-md p-2 text-primary-foreground hover:bg-navy-soft">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col overflow-y-auto border-r border-border bg-navy lg:flex">
        <Nav />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto bg-navy lg:hidden">
            <Nav />
          </aside>
        </>
      )}

      {/* Page content - FIXED GAP HERE */}
      <div className="pt-14 lg:pl-64 lg:pt-0">
        <main className="w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gold">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-xl font-bold text-navy md:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}