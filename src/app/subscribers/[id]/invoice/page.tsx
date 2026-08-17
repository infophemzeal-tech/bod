import { InvoiceLoader } from "@/components/invoice-loader";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceLoader subscriberId={id} />;
}