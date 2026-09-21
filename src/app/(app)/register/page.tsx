"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useActionState } from "react";
import { register } from "./actions";

function RegisterForm() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const redirectedFrom = searchParams.get("redirectedFrom") || "/";

  const [state, formAction, isPending] = useActionState(register, null as any);

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
      <div className="mb-6 text-center">
        <div className="text-xl font-extrabold tracking-tight text-navy">
          BOD <span className="font-medium">PROPERTIES</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Create an account</p>
      </div>

      {state?.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectedFrom" value={redirectedFrom} />

        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@bodproperties.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Repeat password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href={`/login?redirectedFrom=${encodeURIComponent(redirectedFrom)}`} className="font-semibold text-navy hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}