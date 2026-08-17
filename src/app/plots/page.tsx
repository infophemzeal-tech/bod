// app/plots/page.tsx
import { AppShell, PageHeading } from "@/components/AppShell";
import { EstatesPage } from "@/components/EstatesPage"; // adjust path to wherever you place the file

export default function Page() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="BOD Properties"
        title="Plot Inventory"
        description="Register estates and manage plot allocation."
      />
      <EstatesPage />
    </AppShell>
  );
}