import crypto from "crypto";
import { desc, eq } from "drizzle-orm";
import {
  blobGetJson,
  blobPutJson,
  isCloudStore,
} from "./blob-store";
import { db, dbReady } from "./db";
import { leads as leadsTable, quotes as quotesTable } from "./db/schema";
import { formatMoney, packages, type PackageId } from "./site";

/** Lead pipeline statuses */
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "quoted",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "booking",
  "manual",
  "quote",
  "referral",
  "web",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "declined",
  "invoiced",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export interface QuoteLineItem {
  id: string;
  description: string;
  qty: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  source: LeadSource | string;
  status: LeadStatus | string;
  packageId: string | null;
  eventDate: string | null;
  venue: string | null;
  city: string | null;
  notes: string;
  bookingRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  leadId: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  company: string | null;
  title: string;
  status: QuoteStatus | string;
  packageId: string | null;
  lineItems: QuoteLineItem[];
  rackSubtotalCents: number;
  discountCents: number;
  discountLabel: string | null;
  totalCents: number;
  notes: string;
  terms: string;
  validUntil: string | null;
  eventDate: string | null;
  venue: string | null;
  createdAt: string;
  updatedAt: string;
}

const BLOB_LEADS = "ca/crm/leads.json";
const BLOB_QUOTES = "ca/crm/quotes.json";

type CloudDoc<T> = { items: T[]; updatedAt: string };

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function parseLineItems(raw: string | QuoteLineItem[]): QuoteLineItem[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// —— Cloud blob helpers ——

async function cloudListLeads(): Promise<Lead[]> {
  const doc = await blobGetJson<CloudDoc<Lead>>(BLOB_LEADS);
  return doc?.items ?? [];
}

async function cloudSaveLeads(items: Lead[]) {
  await blobPutJson(BLOB_LEADS, {
    items,
    updatedAt: nowIso(),
  } satisfies CloudDoc<Lead>);
}

async function cloudListQuotes(): Promise<Quote[]> {
  const doc = await blobGetJson<CloudDoc<Quote>>(BLOB_QUOTES);
  return doc?.items ?? [];
}

async function cloudSaveQuotes(items: Quote[]) {
  await blobPutJson(BLOB_QUOTES, {
    items,
    updatedAt: nowIso(),
  } satisfies CloudDoc<Quote>);
}

// —— Leads ——

export async function listLeads(): Promise<Lead[]> {
  if (isCloudStore()) {
    const items = await cloudListLeads();
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  await dbReady();
  const rows = await db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
  return rows.map(rowToLead);
}

export async function getLead(id: string): Promise<Lead | null> {
  if (isCloudStore()) {
    return (await cloudListLeads()).find((l) => l.id === id) ?? null;
  }
  await dbReady();
  const rows = await db.select().from(leadsTable).where(eq(leadsTable.id, id)).limit(1);
  return rows[0] ? rowToLead(rows[0]) : null;
}

export type LeadInput = {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  source?: LeadSource | string;
  status?: LeadStatus | string;
  packageId?: string | null;
  eventDate?: string | null;
  venue?: string | null;
  city?: string | null;
  notes?: string;
  bookingRef?: string | null;
};

export async function createLead(input: LeadInput): Promise<Lead> {
  const ts = nowIso();
  const lead: Lead = {
    id: newId("lead"),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    company: input.company?.trim() || null,
    source: input.source || "manual",
    status: input.status || "new",
    packageId: input.packageId || null,
    eventDate: input.eventDate || null,
    venue: input.venue?.trim() || null,
    city: input.city?.trim() || null,
    notes: input.notes?.trim() || "",
    bookingRef: input.bookingRef || null,
    createdAt: ts,
    updatedAt: ts,
  };

  if (isCloudStore()) {
    const items = await cloudListLeads();
    items.unshift(lead);
    await cloudSaveLeads(items);
    return lead;
  }

  await dbReady();
  await db.insert(leadsTable).values({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    source: lead.source,
    status: lead.status,
    packageId: lead.packageId,
    eventDate: lead.eventDate,
    venue: lead.venue,
    city: lead.city,
    notes: lead.notes,
    bookingRef: lead.bookingRef,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  });
  return lead;
}

export async function updateLead(
  id: string,
  patch: Partial<LeadInput>,
): Promise<Lead | null> {
  const existing = await getLead(id);
  if (!existing) return null;
  const next: Lead = {
    ...existing,
    name: patch.name?.trim() ?? existing.name,
    email: patch.email?.trim().toLowerCase() ?? existing.email,
    phone: patch.phone !== undefined ? patch.phone?.trim() || null : existing.phone,
    company:
      patch.company !== undefined ? patch.company?.trim() || null : existing.company,
    source: patch.source ?? existing.source,
    status: patch.status ?? existing.status,
    packageId:
      patch.packageId !== undefined ? patch.packageId : existing.packageId,
    eventDate:
      patch.eventDate !== undefined ? patch.eventDate : existing.eventDate,
    venue: patch.venue !== undefined ? patch.venue?.trim() || null : existing.venue,
    city: patch.city !== undefined ? patch.city?.trim() || null : existing.city,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    bookingRef:
      patch.bookingRef !== undefined ? patch.bookingRef : existing.bookingRef,
    updatedAt: nowIso(),
  };

  if (isCloudStore()) {
    const items = await cloudListLeads();
    const i = items.findIndex((l) => l.id === id);
    if (i < 0) return null;
    items[i] = next;
    await cloudSaveLeads(items);
    return next;
  }

  await dbReady();
  await db
    .update(leadsTable)
    .set({
      name: next.name,
      email: next.email,
      phone: next.phone,
      company: next.company,
      source: next.source,
      status: next.status,
      packageId: next.packageId,
      eventDate: next.eventDate,
      venue: next.venue,
      city: next.city,
      notes: next.notes,
      bookingRef: next.bookingRef,
      updatedAt: next.updatedAt,
    })
    .where(eq(leadsTable.id, id));
  return next;
}

// —— Quotes ——

export async function listQuotes(): Promise<Quote[]> {
  if (isCloudStore()) {
    const items = await cloudListQuotes();
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  await dbReady();
  const rows = await db.select().from(quotesTable).orderBy(desc(quotesTable.createdAt));
  return rows.map(rowToQuote);
}

export async function getQuote(id: string): Promise<Quote | null> {
  if (isCloudStore()) {
    return (await cloudListQuotes()).find((q) => q.id === id) ?? null;
  }
  await dbReady();
  const rows = await db.select().from(quotesTable).where(eq(quotesTable.id, id)).limit(1);
  return rows[0] ? rowToQuote(rows[0]) : null;
}

export type QuoteInput = {
  leadId?: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  company?: string | null;
  title: string;
  status?: QuoteStatus | string;
  packageId?: string | null;
  lineItems: QuoteLineItem[];
  rackSubtotalCents: number;
  discountCents?: number;
  discountLabel?: string | null;
  totalCents: number;
  notes?: string;
  terms?: string;
  validUntil?: string | null;
  eventDate?: string | null;
  venue?: string | null;
};

async function nextQuoteNumber(): Promise<string> {
  const all = await listQuotes();
  const n = all.length + 1;
  return `CA-Q-${String(n).padStart(4, "0")}`;
}

export async function createQuote(input: QuoteInput): Promise<Quote> {
  const ts = nowIso();
  const quote: Quote = {
    id: newId("quote"),
    quoteNumber: await nextQuoteNumber(),
    leadId: input.leadId || null,
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail.trim().toLowerCase(),
    clientPhone: input.clientPhone?.trim() || null,
    company: input.company?.trim() || null,
    title: input.title.trim(),
    status: input.status || "draft",
    packageId: input.packageId || null,
    lineItems: input.lineItems,
    rackSubtotalCents: input.rackSubtotalCents,
    discountCents: input.discountCents ?? 0,
    discountLabel: input.discountLabel ?? null,
    totalCents: input.totalCents,
    notes: input.notes?.trim() || "",
    terms: input.terms?.trim() || defaultTerms(),
    validUntil: input.validUntil || null,
    eventDate: input.eventDate || null,
    venue: input.venue?.trim() || null,
    createdAt: ts,
    updatedAt: ts,
  };

  if (isCloudStore()) {
    const items = await cloudListQuotes();
    items.unshift(quote);
    await cloudSaveQuotes(items);
  } else {
    await dbReady();
    await db.insert(quotesTable).values(quoteToRow(quote));
  }

  if (quote.leadId) {
    await updateLead(quote.leadId, { status: "quoted" }).catch(() => null);
  }
  return quote;
}

export async function updateQuote(
  id: string,
  patch: Partial<QuoteInput> & { status?: QuoteStatus | string },
): Promise<Quote | null> {
  const existing = await getQuote(id);
  if (!existing) return null;

  const lineItems = patch.lineItems ?? existing.lineItems;
  const rack =
    patch.rackSubtotalCents !== undefined
      ? patch.rackSubtotalCents
      : existing.rackSubtotalCents;
  const discount =
    patch.discountCents !== undefined ? patch.discountCents : existing.discountCents;
  const total =
    patch.totalCents !== undefined
      ? patch.totalCents
      : Math.max(0, rack - discount);

  const next: Quote = {
    ...existing,
    leadId: patch.leadId !== undefined ? patch.leadId : existing.leadId,
    clientName: patch.clientName?.trim() ?? existing.clientName,
    clientEmail:
      patch.clientEmail?.trim().toLowerCase() ?? existing.clientEmail,
    clientPhone:
      patch.clientPhone !== undefined
        ? patch.clientPhone?.trim() || null
        : existing.clientPhone,
    company:
      patch.company !== undefined ? patch.company?.trim() || null : existing.company,
    title: patch.title?.trim() ?? existing.title,
    status: patch.status ?? existing.status,
    packageId:
      patch.packageId !== undefined ? patch.packageId : existing.packageId,
    lineItems,
    rackSubtotalCents: rack,
    discountCents: discount,
    discountLabel:
      patch.discountLabel !== undefined
        ? patch.discountLabel
        : existing.discountLabel,
    totalCents: total,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    terms: patch.terms !== undefined ? patch.terms : existing.terms,
    validUntil:
      patch.validUntil !== undefined ? patch.validUntil : existing.validUntil,
    eventDate:
      patch.eventDate !== undefined ? patch.eventDate : existing.eventDate,
    venue:
      patch.venue !== undefined ? patch.venue?.trim() || null : existing.venue,
    updatedAt: nowIso(),
  };

  if (isCloudStore()) {
    const items = await cloudListQuotes();
    const i = items.findIndex((q) => q.id === id);
    if (i < 0) return null;
    items[i] = next;
    await cloudSaveQuotes(items);
  } else {
    await dbReady();
    await db.update(quotesTable).set(quoteToRow(next)).where(eq(quotesTable.id, id));
  }
  return next;
}

// —— Domain helpers ——

export function defaultTerms() {
  return [
    "50% deposit to hold the date; balance due on delivery of masters.",
    "Travel may apply outside the Sacramento metro area.",
    "Client provides load-in access and FOH liaison on show day.",
    "Quote valid 30 days unless otherwise noted.",
  ].join("\n");
}

/** Stage Ready multi-cam rack → $700 launch / birthday favor quote. */
export function buildStageReadyLaunchQuote(opts: {
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  company?: string | null;
  eventDate?: string | null;
  venue?: string | null;
  leadId?: string | null;
}): QuoteInput {
  const pkg = packages.find((p) => p.id === "stage-ready")!;
  const rackCents = pkg.priceFrom * 100; // $1,890
  const totalCents = 700_00; // $700
  const discountCents = rackCents - totalCents;

  return {
    leadId: opts.leadId ?? null,
    clientName: opts.clientName,
    clientEmail: opts.clientEmail,
    clientPhone: opts.clientPhone ?? null,
    company: opts.company ?? null,
    title: `${pkg.name} — multi-cam live capture`,
    status: "sent",
    packageId: pkg.id as PackageId,
    lineItems: [
      {
        id: "line_stage_ready",
        description: `${pkg.name} package — ${pkg.tagline}. Includes: ${pkg.includes.join("; ")}.`,
        qty: 1,
        unitPriceCents: rackCents,
        amountCents: rackCents,
      },
    ],
    rackSubtotalCents: rackCents,
    discountCents,
    discountLabel:
      "Birthday gift / launch favor — friend rate to help Capital Audio get off the ground, in exchange for a fair rate & good word",
    totalCents,
    notes:
      "Rack rate shown for transparency. Discount applied as a personal favor while we launch — thank you for betting on us early.",
    terms: defaultTerms(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    eventDate: opts.eventDate ?? null,
    venue: opts.venue ?? null,
  };
}

export function formatCents(cents: number) {
  return formatMoney(cents / 100);
}

export function leadStatusLabel(s: string) {
  const map: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    quoted: "Quoted",
    won: "Won",
    lost: "Lost",
  };
  return map[s] || s;
}

export function quoteStatusLabel(s: string) {
  const map: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    declined: "Declined",
    invoiced: "Invoiced",
  };
  return map[s] || s;
}

/** Idempotent seed of the launch multi-cam quote (and lead if missing). */
export async function ensureLaunchQuoteSeed(seed: {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  company?: string;
  venue?: string;
  eventDate?: string;
}): Promise<{ lead: Lead; quote: Quote; created: boolean }> {
  const email = seed.clientEmail.trim().toLowerCase();
  const quotes = await listQuotes();
  const existing = quotes.find(
    (q) =>
      q.packageId === "stage-ready" &&
      q.totalCents === 700_00 &&
      q.clientEmail === email,
  );
  if (existing) {
    const lead = existing.leadId
      ? await getLead(existing.leadId)
      : null;
    return {
      lead:
        lead ||
        (await createLead({
          name: seed.clientName,
          email,
          phone: seed.clientPhone,
          company: seed.company,
          source: "quote",
          status: "quoted",
          packageId: "stage-ready",
        })),
      quote: existing,
      created: false,
    };
  }

  const leads = await listLeads();
  let lead = leads.find((l) => l.email === email) ?? null;
  if (!lead) {
    lead = await createLead({
      name: seed.clientName,
      email,
      phone: seed.clientPhone,
      company: seed.company,
      source: "quote",
      status: "quoted",
      packageId: "stage-ready",
      eventDate: seed.eventDate,
      venue: seed.venue,
      notes:
        "Launch favor multi-cam quote — rack Stage Ready, friend rate $700.",
    });
  } else {
    lead =
      (await updateLead(lead.id, {
        status: "quoted",
        packageId: "stage-ready",
        notes: [lead.notes, "Launch favor multi-cam quote attached."]
          .filter(Boolean)
          .join("\n"),
      })) || lead;
  }

  const quote = await createQuote(
    buildStageReadyLaunchQuote({
      leadId: lead.id,
      clientName: seed.clientName,
      clientEmail: email,
      clientPhone: seed.clientPhone,
      company: seed.company,
      eventDate: seed.eventDate,
      venue: seed.venue,
    }),
  );

  return { lead, quote, created: true };
}

// —— row mappers ——

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLead(r: any): Lead {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone ?? null,
    company: r.company ?? null,
    source: r.source,
    status: r.status,
    packageId: r.packageId ?? r.package_id ?? null,
    eventDate: r.eventDate ?? r.event_date ?? null,
    venue: r.venue ?? null,
    city: r.city ?? null,
    notes: r.notes ?? "",
    bookingRef: r.bookingRef ?? r.booking_ref ?? null,
    createdAt: r.createdAt ?? r.created_at,
    updatedAt: r.updatedAt ?? r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToQuote(r: any): Quote {
  return {
    id: r.id,
    quoteNumber: r.quoteNumber ?? r.quote_number,
    leadId: r.leadId ?? r.lead_id ?? null,
    clientName: r.clientName ?? r.client_name,
    clientEmail: r.clientEmail ?? r.client_email,
    clientPhone: r.clientPhone ?? r.client_phone ?? null,
    company: r.company ?? null,
    title: r.title,
    status: r.status,
    packageId: r.packageId ?? r.package_id ?? null,
    lineItems: parseLineItems(r.lineItems ?? r.line_items),
    rackSubtotalCents: r.rackSubtotalCents ?? r.rack_subtotal_cents ?? 0,
    discountCents: r.discountCents ?? r.discount_cents ?? 0,
    discountLabel: r.discountLabel ?? r.discount_label ?? null,
    totalCents: r.totalCents ?? r.total_cents ?? 0,
    notes: r.notes ?? "",
    terms: r.terms ?? "",
    validUntil: r.validUntil ?? r.valid_until ?? null,
    eventDate: r.eventDate ?? r.event_date ?? null,
    venue: r.venue ?? null,
    createdAt: r.createdAt ?? r.created_at,
    updatedAt: r.updatedAt ?? r.updated_at,
  };
}

function quoteToRow(q: Quote) {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    leadId: q.leadId,
    clientName: q.clientName,
    clientEmail: q.clientEmail,
    clientPhone: q.clientPhone,
    company: q.company,
    title: q.title,
    status: q.status,
    packageId: q.packageId,
    lineItems: JSON.stringify(q.lineItems),
    rackSubtotalCents: q.rackSubtotalCents,
    discountCents: q.discountCents,
    discountLabel: q.discountLabel,
    totalCents: q.totalCents,
    notes: q.notes,
    terms: q.terms,
    validUntil: q.validUntil,
    eventDate: q.eventDate,
    venue: q.venue,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}
