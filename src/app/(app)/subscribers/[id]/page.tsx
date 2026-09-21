import { PageHeading } from "@/components/AppShell";
import { SubscriberDetail } from "@/components/subscriber-detail";

export default async function SubscriberViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeading eyebrow="Subscriber" title="Subscriber Details" />
      <SubscriberDetail id={id} />
    </>
  );
}