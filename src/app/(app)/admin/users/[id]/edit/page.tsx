import { createClient } from "@/lib/supabase/server";
import { updateUserInfo } from "../../actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", id).single();

  if (!profile) {
    return (
      <div className="p-8">
        <Link href="/admin/users" className="text-sm text-gray-500">← Back</Link>
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div>User not found for ID: {id}</div>
          <div>Error: {error?.message}</div>
          <div className="mt-2">Check Supabase Table Editor, profiles, copy the exact id.</div>
        </div>
      </div>
    );
  }

  async function action(formData: FormData) {
    "use server";
    const full_name = formData.get("full_name") as string;
    const email = formData.get("email") as string;
    const res = await updateUserInfo(id, { full_name, email });
    if (res.error) throw new Error(res.error);
    redirect("/admin/users");
  }

  return (
    <div className="mx-auto w-full max-w-lg p-8">
      <Link href="/admin/users" className="text-sm text-gray-500 hover:text-black">← Back to Users</Link>
      <h1 className="mt-4 text-2xl font-bold">Edit User</h1>
      <p className="text-xs text-gray-400 break-all">{profile.id}</p>

      <form action={action} className="mt-6 space-y-4 rounded-lg border bg-white p-6">
        <div>
          <label className="text-xs font-semibold uppercase">Full Name</label>
          <input name="full_name" defaultValue={profile.full_name || ""} required className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase">Email</label>
          <input name="email" type="email" defaultValue={profile.email || ""} required className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase">Role</label>
          <input value={profile.role} disabled className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-gray-500" />
        </div>
        <button type="submit" className="w-full rounded bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-900">
          Save Changes
        </button>
      </form>
    </div>
  );
}