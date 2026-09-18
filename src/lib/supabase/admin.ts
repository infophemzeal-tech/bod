import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceRoleKey || !anonKey) {
    console.error("❌ MISSING ENV VARS:", {
      NEXT_PUBLIC_SUPABASE_URL: !!url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceRoleKey,
      cwd: process.cwd(),
    });
    throw new Error(
      `Missing env vars in .env.local - URL:${!!url} ANON:${!!anonKey} SERVICE:${!!serviceRoleKey}. Make sure .env.local is in project root next to package.json and restart server.`
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}