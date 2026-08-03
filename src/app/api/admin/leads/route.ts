import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminCookie } from "@/lib/admin-auth";
import { createLead, listLeads, type LeadInput } from "@/lib/crm";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const password = process.env.ADMIN_PASSWORD;
  const jar = await cookies();
  const ok = await isValidAdminCookie(jar.get("ca-admin")?.value, password);
  return ok;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const leads = await listLeads();
  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  // Public booking form may post without admin cookie; still create a lead.
  // Admin UI posts with cookie. Both allowed — source distinguishes.
  let body: Partial<LeadInput> & { name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  if (!name || !email?.includes("@")) {
    return NextResponse.json(
      { error: "Name and valid email are required." },
      { status: 400 },
    );
  }

  const isAdmin = await requireAdmin();
  const lead = await createLead({
    name,
    email,
    phone: body.phone,
    company: body.company,
    source: body.source || (isAdmin ? "manual" : "booking"),
    status: body.status || "new",
    packageId: body.packageId,
    eventDate: body.eventDate,
    venue: body.venue,
    city: body.city,
    notes: body.notes,
    bookingRef: body.bookingRef,
  });

  return NextResponse.json({ ok: true, lead });
}
