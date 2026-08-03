import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteDocument } from "@/components/admin/quote-document";
import { getQuote } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Link
          href="/admin/quotes"
          className="text-sm text-ca-gold hover:underline"
        >
          ← Quotes
        </Link>
      </div>
      <QuoteDocument initialQuote={quote} />
    </div>
  );
}
