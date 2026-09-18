"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Admin only");
  return user;
}
export async function updateUserInfo(userId: string, data: { full_name: string; email: string }) {
  await requireAdmin();
  const adminClient = createAdminClient();

  if (!data.email || !data.full_name) return { error: "Name and email required" };

  // 1. Update Auth user (email + metadata)
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    email: data.email.trim(),
    user_metadata: { full_name: data.full_name.trim() },
    email_confirm: true, // auto-confirm if you change email
  });
  if (authError) return { error: authError.message };

  // 2. Update profile table
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ 
      email: data.email.trim(), 
      full_name: data.full_name.trim() 
    })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  revalidatePath("/admin/users");
  return { success: true };
}
export async function createUser(formData: FormData) {
  try {
    await requireAdmin();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = (formData.get("role") as string) || "agent";
    const fullName = formData.get("fullName") as string;
    if (!email || !password) return { error: "Email and password required" };

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (error) return { error: error.message };

    if (data.user) {
      await adminClient.from("profiles").insert({
        id: data.user.id,
        email: email.trim(),
        full_name: fullName,
        role,
        is_active: true,
      });
    }
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  await requireAdmin();
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("profiles").update({ role: newRole }).eq("id", userId);
  if (error) return { error: error.message };
  await adminClient.auth.admin.updateUserById(userId, { user_metadata: { role: newRole } });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserActive(userId: string, currentActive: boolean) {
  await requireAdmin();
  const adminClient = createAdminClient();
  
  // 1. Update profile
  const { error } = await adminClient.from("profiles").update({ is_active: !currentActive }).eq("id", userId);
  if (error) return { error: error.message };

  // 2. Ban / Unban in Auth so they can't login when deactivated
  if (currentActive) {
    // Deactivating -> ban for 100 years
    await adminClient.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  } else {
    // Activating -> remove ban
    await adminClient.auth.admin.updateUserById(userId, { ban_duration: "none" });
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  const adminClient = createAdminClient();
  await adminClient.from("profiles").delete().eq("id", userId);
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { success: true };
}