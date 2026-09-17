import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  branch: string | null;
};

// Returns the logged-in user's profile (with role), or null if not logged in.
// proxy.ts already redirects unauthenticated requests to /login, so null
// here mainly matters for pages that are reachable without a session.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, branch')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

// Call at the top of a Server Component page to restrict it to certain roles.
// Redirects to / with an error flag if the user's role isn't allowed.
export async function requireRole(allowed: UserRole[]): Promise<Profile> {
  const profile = await getProfile();

  if (!profile) {
    redirect('/login');
  }

  if (!allowed.includes(profile.role)) {
    redirect('/?error=unauthorized');
  }

  return profile;
}