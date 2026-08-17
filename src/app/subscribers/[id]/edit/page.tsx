import { PageHeading } from "@/components/AppShell";
import { SubscriberEditForm } from "@/components/subscriber-edit-form";

export default async function SubscriberEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeading eyebrow="Subscriber" title="Edit Subscriber" />
      <SubscriberEditForm id={id} />
    </>
  );
}