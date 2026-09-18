import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { UserRowActions } from "./user-actions";
import { PageHeading } from "@/components/AppShell";
import { Users, Plus, Shield } from "lucide-react";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

  const activeCount = profiles?.filter((p) => p.is_active!== false).length?? 0;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Admin"
        title="Manage Users"
        description={`${profiles?.length?? 0} total users • ${activeCount} active`}
        actions={
          <Link
            href="/admin/users/new"
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep"
          >
            <Plus className="h-4 w-4" /> New User
          </Link>
        }
      />

      <div className="panel overflow-hidden">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text- uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Branch</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles?.map((p) => (
                <tr key={p.id} className="hover:bg-muted/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text- font-bold text-white">
                        {(p.full_name || p.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-navy">{p.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium
                      ${p.role === "Admin"? "border-gold/30 bg-gold/10 text-[#8a6a2b]" : p.role === "Manager"? "border-navy/20 bg-navy/5 text-navy" : "border-border bg-muted text-muted-foreground"}
                    `}>
                      {p.role === "Admin" && <Shield className="h-3 w-3" />}
                      {p.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.branch || "—"}</td>
                  <td className="px-5 py-3.5">
                    {p.is_active!== false? (
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20">Active</span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/20">Deactivated</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <UserRowActions profile={p} isSelf={p.id === currentUser?.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-border sm:hidden">
          {profiles?.map((p) => (
            <div key={p.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                    {(p.full_name || p.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-navy">{p.full_name || p.email}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">{p.role}</span>
                      {p.branch && <span className="text-xs text-muted-foreground">{p.branch}</span>}
                      {p.is_active!== false? <span className="text-xs text-green-600">Active</span> : <span className="text-xs text-red-600">Deactivated</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <UserRowActions profile={p} isSelf={p.id === currentUser?.id} />
              </div>
            </div>
          ))}
        </div>

        {(!profiles || profiles.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}