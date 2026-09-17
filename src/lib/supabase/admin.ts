import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Admin client for privileged operations (e.g. creating users, bypassing RLS).
// Uses the service role key — NEVER expose this client or its key to the browser.
// Only import this file from server-only code (Server Actions, Route Handlers, etc.).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}