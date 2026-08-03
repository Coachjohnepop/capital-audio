import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { QuotesDesk } from "@/components/admin/quotes-desk";
import { listLeads, listQuotes } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;
  const [quotes, leads] = await Promise.all([listQuotes(), listLeads()]);
  const prefillLead = leadId
    ? leads.find((l) => l.id === leadId) ?? null
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Quotes & invoices"
        description="Show rack rate, then apply a favor / launch discount. Stage Ready multi-cam ships as $1,890 rack → $700 friend rate when you use the launch template."
        actions={
          <Link href="/admin/leads" className="ca-btn ca-btn-secondary">
            ← Leads
          </Link>
        }
      />
      <QuotesDesk
        initialQuotes={quotes}
        leads={leads}
        prefillLead={prefillLead}
      />
    </div>
  );
}
