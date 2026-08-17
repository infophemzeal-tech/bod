import { PageHeading } from "@/components/AppShell";
import { IntakeForm } from "@/components/intake/IntakeForm";

export default function IntakePage() {
  return (
    <>
      <PageHeading
        eyebrow="New Subscriber"
        title="Subscriber Intake"
        description="Capture personal, employment, subscription and referral details for a new plot subscriber."
      />
      <IntakeForm />
    </>
  );
}