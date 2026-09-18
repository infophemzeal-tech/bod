import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  branch: string | null;
  is_active?: boolean; // we added this column
};

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, branch, is_active')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function requireRole(allowed: UserRole[]): Promise<Profile> {
  const profile = await getProfile();

  if (!profile) {
    redirect('/login');
  }

  if (profile.is_active === false) {
    redirect('/login?error=deactivated');
  }

  if (!allowed.includes(profile.role)) {
    redirect('/?error=unauthorized');
  }

  return profile;
}

// helper for admin-only
export async function requireAdmin() {
  return requireRole(['Admin']);
}