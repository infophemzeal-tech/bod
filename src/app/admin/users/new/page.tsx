"use client";

import { useState, type FormEvent } from "react";
import { createUser } from "../actions";
import { Loader2, UserPlus, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeading } from "@/components/AppShell";

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/users");
        router.refresh();
      }, 800);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Admin"
        title="Create New User"
        description="Invite a new Staff, Manager or Admin. They will be able to log in immediately."
        actions={
          <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy">
            <ArrowLeft className="h-4 w-4" /> Back to users
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-lg">
        <div className="panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-navy">User details</h2>
              <p className="text-xs text-muted-foreground">All fields required</p>
            </div>
          </div>

          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {success && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">User created! Redirecting...</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">Full Name</label>
              <input name="fullName" required placeholder="e.g. John Doe" className="field" />
            </div>

            <div>
              <label className="label-field">Email Address</label>
              <input name="email" type="email" required placeholder="user@bodproperties.com" className="field" />
            </div>

            <div>
              <label className="label-field">Password</label>
              <input name="password" type="password" required placeholder="Min. 8 characters" className="field" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-field">Role</label>
                <select name="role" defaultValue="Staff" className="field">
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="label-field">Branch (optional)</label>
                <input name="branch" placeholder="e.g. Lagos" className="field" />
              </div>
            </div>

            <button
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating..." : "Create User"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          New users are active by default. You can deactivate from Manage Users.
        </p>
      </div>
    </div>
  );
}