import { ReceiptLoader } from "@/components/receipt-loader";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const { id, paymentId } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ReceiptLoader subscriberId={id} paymentId={paymentId} />
    </div>
  );
}