import { CongratulatoryLetterLoader } from "@/components/congratulatory-letter-loader";

export default async function LetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CongratulatoryLetterLoader subscriberId={id} />;
}