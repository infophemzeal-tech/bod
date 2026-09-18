"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectedFrom = searchParams.get("redirectedFrom");
  const unauthorized = searchParams.get("error") === "unauthorized";

  // prevent open redirect vulnerability - only allow internal paths
  const getSafeRedirect = (path: string | null) => {
    if (!path) return "/";
    if (!path.startsWith("/") || path.startsWith("//")) return "/";
    return path;
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // This maintains your server context / middleware session
      router.replace(getSafeRedirect(redirectedFrom));
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
      <div className="mb-6 text-center">
        <div className="text-xl font-extrabold tracking-tight text-navy">
          BOD <span className="font-medium">PROPERTIES</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      {unauthorized && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          You don&apos;t have permission to view that page.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy"
            placeholder="you@bodproperties.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-lg bg-muted" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
} 