import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { LeadsDesk } from "@/components/admin/leads-desk";
import { listLeads, listQuotes } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const [leads, quotes] = await Promise.all([listLeads(), listQuotes()]);
  const quoteCountByLead = new Map<string, number>();
  for (const q of quotes) {
    if (!q.leadId) continue;
    quoteCountByLead.set(q.leadId, (quoteCountByLead.get(q.leadId) || 0) + 1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Leads"
        description="Track booking inquiries and manual leads. Quotes attach here when you send a package price."
        actions={
          <Link href="/admin/quotes" className="ca-btn ca-btn-secondary">
            Quotes →
          </Link>
        }
      />
      <LeadsDesk
        initialLeads={leads}
        quoteCounts={Object.fromEntries(quoteCountByLead)}
      />
    </div>
  );
}
