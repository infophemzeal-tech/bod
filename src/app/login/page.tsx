"use client";

import { Suspense, useState, type FormEvent, useEffect } from "react";
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
  const deactivated = searchParams.get("error") === "deactivated";

  const getSafeRedirect = (path: string | null) => {
    // Default landing page after a plain login (no redirectedFrom) is
    // now /plots instead of the dashboard root.
    if (!path) return "/";
    if (!path.startsWith("/") || path.startsWith("//")) return "/";
    if (path.includes(":")) return "/";
    return path;
  };

  // If someone who's already signed in lands on /login (e.g. clicked a
  // stale bookmark, or hit back after logging in), skip the form and
  // send them straight on instead of asking them to sign in again.
  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active && session) {
        router.replace(getSafeRedirect(redirectedFrom));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUnhandled = (e: PromiseRejectionEvent) => {
      if (e.reason?.name === "AbortError" && String(e.reason?.message).includes("play()")) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => window.removeEventListener("unhandledrejection", onUnhandled);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.session) {
        setError("Login failed - no session created. Check Supabase URL/Anon key.");
        return;
      }

      // CRITICAL: replace first, then refresh to sync server cookie
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
      {deactivated && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          This account has been deactivated. Contact admin.
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
          className="flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-50"
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