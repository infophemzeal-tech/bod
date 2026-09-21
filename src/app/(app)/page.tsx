import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { PageHeading } from "@/components/AppShell";
import { DashboardOverview } from "@/components/DashboardOverview";
import { toTitleCase } from "@/lib/text";

export default async function DashboardPage() {
  const profile = await getProfile();
  const displayName = profile?.full_name ? toTitleCase(profile.full_name) : null;
  const firstName = displayName?.split(" ")[0] || displayName;

  return (
    <>
      
      <DashboardOverview />
    </>
  );
}