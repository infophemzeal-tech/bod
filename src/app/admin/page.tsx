import Link from "next/link";
import { PageHeading } from "@/components/AppShell";
import { Users, UserPlus, ShieldCheck, ArrowRight } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="BOD Properties"
        title="BOD Admin"
        description="Manage system users, roles and access."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/users"
          className="group panel flex items-start justify-between gap-4 p-5 transition-colors hover:border-navy/20 hover:bg-muted/50"
        >
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold/15 text-gold">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-navy">Manage Users</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              View all users, change roles, activate / deactivate accounts.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-navy group-hover:gap-1.5">
              Go to users <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>

        <Link
          href="/admin/users/new"
          className="group panel flex items-start justify-between gap-4 p-5 transition-colors hover:border-navy/20 hover:bg-muted/50"
        >
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-navy text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-navy">Create New User</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Invite a new Staff, Manager or Admin to the system.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-navy group-hover:gap-1.5">
              Create user <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      </div>

      <div className="panel flex items-center gap-3 bg-navy px-4 py-3 text-sm text-primary-foreground">
        <ShieldCheck className="h-4 w-4 text-gold" />
        Only <span className="font-semibold text-gold">Admin</span> users can access this section. Actions are logged.
      </div>
    </div>
  );
}