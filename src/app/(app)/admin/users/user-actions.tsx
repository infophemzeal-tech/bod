"use client";
import { useState } from "react";
import { updateUserRole, toggleUserActive } from "./actions";
import { Loader2 } from "lucide-react";

export function UserRowActions({ profile, isSelf }: { profile: any; isSelf: boolean }) {
  const [loading, setLoading] = useState(false);

  async function onRoleChange(newRole: string) {
    setLoading(true);
    await updateUserRole(profile.id, newRole);
    setLoading(false);
    window.location.reload();
  }

  async function onToggle() {
    if (isSelf) return alert("You can't deactivate yourself");
    setLoading(true);
    await toggleUserActive(profile.id, !profile.is_active);
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        defaultValue={profile.role}
        onChange={(e) => onRoleChange(e.target.value)}
        disabled={loading || isSelf}
        className="rounded-md border border-input bg-surface px-2 py-1 text-xs"
      >
        <option value="Staff">Staff</option>
        <option value="Manager">Manager</option>
        <option value="Admin">Admin</option>
      </select>
      <button
        onClick={onToggle}
        disabled={loading || isSelf}
        className={`rounded-md px-2.5 py-1 text-xs font-medium ${profile.is_active !== false ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : profile.is_active !== false ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}