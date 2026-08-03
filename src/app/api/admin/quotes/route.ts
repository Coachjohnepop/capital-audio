import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminCookie } from "@/lib/admin-auth";
import {
  buildStageReadyLaunchQuote,
  createQuote,
  ensureLaunchQuoteSeed,
  listQuotes,
  type QuoteInput,
  type QuoteLineItem,
} from "@/lib/crm";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const password = process.env.ADMIN_PASSWORD;
  const jar = await cookies();
  return isValidAdminCookie(jar.get("ca-admin")?.value, password);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const quotes = await listQuotes();
  return NextResponse.json({ quotes });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Seed the launch multi-cam $700 favor quote
  if (body.seed === "stage-ready-launch") {
    const result = await ensureLaunchQuoteSeed({
      clientName: String(body.clientName || "Launch client"),
      clientEmail: String(body.clientEmail || "client@example.com"),
      clientPhone: body.clientPhone ? String(body.clientPhone) : undefined,
      company: body.company ? String(body.company) : undefined,
      venue: body.venue ? String(body.venue) : undefined,
      eventDate: body.eventDate ? String(body.eventDate) : undefined,
    });
    return NextResponse.json({
      ok: true,
      created: result.created,
      lead: result.lead,
      quote: result.quote,
    });
  }

  // Quick Stage Ready template from form fields
  if (body.template === "stage-ready-launch") {
    const input = buildStageReadyLaunchQuote({
      clientName: String(body.clientName || ""),
      clientEmail: String(body.clientEmail || ""),
      clientPhone: body.clientPhone ? String(body.clientPhone) : null,
      company: body.company ? String(body.company) : null,
      venue: body.venue ? String(body.venue) : null,
      eventDate: body.eventDate ? String(body.eventDate) : null,
      leadId: body.leadId ? String(body.leadId) : null,
    });
    if (!input.clientName || !input.clientEmail.includes("@")) {
      return NextResponse.json(
        { error: "Client name and email required." },
        { status: 400 },
      );
    }
    const quote = await createQuote(input);
    return NextResponse.json({ ok: true, quote });
  }

  const clientName = String(body.clientName || "").trim();
  const clientEmail = String(body.clientEmail || "").trim();
  const title = String(body.title || "").trim();
  if (!clientName || !clientEmail.includes("@") || !title) {
    return NextResponse.json(
      { error: "Client name, email, and title are required." },
      { status: 400 },
    );
  }

  const lineItems = (Array.isArray(body.lineItems)
    ? body.lineItems
    : []) as QuoteLineItem[];

  const input: QuoteInput = {
    leadId: body.leadId ? String(body.leadId) : null,
    clientName,
    clientEmail,
    clientPhone: body.clientPhone ? String(body.clientPhone) : null,
    company: body.company ? String(body.company) : null,
    title,
    status: body.status ? String(body.status) : "draft",
    packageId: body.packageId ? String(body.packageId) : null,
    lineItems,
    rackSubtotalCents: Number(body.rackSubtotalCents) || 0,
    discountCents: Number(body.discountCents) || 0,
    discountLabel: body.discountLabel ? String(body.discountLabel) : null,
    totalCents: Number(body.totalCents) || 0,
    notes: body.notes ? String(body.notes) : "",
    terms: body.terms ? String(body.terms) : undefined,
    validUntil: body.validUntil ? String(body.validUntil) : null,
    eventDate: body.eventDate ? String(body.eventDate) : null,
    venue: body.venue ? String(body.venue) : null,
  };

  const quote = await createQuote(input);
  return NextResponse.json({ ok: true, quote });
}
