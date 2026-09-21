"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loginWithUsername(
  username: string,
  password: string
): Promise<{ error: string | null }> {
  const trimmed = username.trim();

  if (!trimmed || !password) {
    return { error: "Username and password are required." };
  }

  // Look up the email for this username. Uses the admin client because
  // regular (anon/authenticated) users should not be able to read other
  // users' emails directly via RLS.
  const admin = createAdminClient();
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("email")
    .ilike("username", trimmed)
    .single();

  if (lookupError || !profile?.email) {
    // Same generic message as a bad password, so we don't leak which
    // usernames exist.
    return { error: "Invalid username or password." };
  }

  // Sign in using the server (cookie-aware) client so the session cookie
  // is set on this request/response.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (signInError) {
    return { error: "Invalid username or password." };
  }

  return { error: null };
}