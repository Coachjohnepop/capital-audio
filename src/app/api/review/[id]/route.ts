import { addClientMarker, getMedia } from "@/lib/media";
import crypto from "crypto";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const item = await getMedia(id);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(item);
}

/** Clients may only add marks/notes — never trim, retitle, or delete. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();

  const t = Number(body.t);
  const end = body.end == null ? undefined : Number(body.end);
  if (!isFinite(t) || t < 0 || (end !== undefined && (!isFinite(end) || end <= t))) {
    return Response.json({ error: "Invalid marker times" }, { status: 400 });
  }
  const label = String(body.label ?? "").slice(0, 200).trim();
  if (!label) return Response.json({ error: "A label is required" }, { status: 400 });

  const item = await addClientMarker(id, {
    id: crypto.randomBytes(4).toString("hex"),
    t,
    end,
    label,
    note: body.note ? String(body.note).slice(0, 2000) : undefined,
    by: "client",
    author: body.author ? String(body.author).slice(0, 80) : undefined,
  });
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(item, { status: 201 });
}
