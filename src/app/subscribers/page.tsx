import { PageHeading } from "@/components/AppShell";
import { SubscribersPage } from "@/components/subscribers/SubscribersTable";

export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="Directory"
        title="Subscribers"
        description="Search, filter and review every subscriber that has registered or saved a draft."
      />
      <SubscribersPage />
    </>
  );
}