'use server';

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function createUser(formData: FormData) {
  await requireRole(['Admin']);

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;
  const role = formData.get('role') as string;
  const branch = formData.get('branch') as string;

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification — internal staff accounts
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    redirect(`/users?error=${encodeURIComponent(error?.message ?? 'Failed to create user')}`);
  }

  // The handle_new_user trigger already inserted a profile row defaulted to
  // 'Staff' — update it with the role/branch chosen in the form.
  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role, branch: branch || null })
    .eq('id', data.user.id);

  if (profileError) {
    redirect(`/users?error=${encodeURIComponent(profileError.message)}`);
  }

  redirect(`/users?success=${encodeURIComponent(`${fullName} created`)}`);
}

export async function updateUser(formData: FormData) {
  await requireRole(['Admin']);

  const id = formData.get('id') as string;
  const role = formData.get('role') as string;
  const branch = formData.get('branch') as string;

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role, branch: branch || null })
    .eq('id', id);

  if (error) {
    redirect(`/users?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/users?success=Updated');
}

export async function deleteUser(formData: FormData) {
  const currentUser = await requireRole(['Admin']);
  const id = formData.get('id') as string;

  if (id === currentUser.id) {
    redirect('/users?error=You+can%27t+delete+your+own+account');
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    redirect(`/users?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/users?success=User+removed');
}