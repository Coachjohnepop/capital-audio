import {
  deleteMedia,
  getMedia,
  sanitizeMarkers,
  updateMedia,
  type MediaEdit,
  type Projection,
} from "@/lib/media";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const item = await getMedia(id);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(item);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();

  const patch: {
    title?: string;
    duration?: number;
    edit?: MediaEdit;
    projection?: Projection;
  } = {};
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.duration === "number" && body.duration > 0) patch.duration = body.duration;
  if (body.projection === "flat" || body.projection === "360") {
    patch.projection = body.projection;
  }
  if (body.edit && typeof body.edit === "object") {
    patch.edit = {
      trimIn: Math.max(0, Number(body.edit.trimIn) || 0),
      trimOut: body.edit.trimOut == null ? null : Math.max(0, Number(body.edit.trimOut)),
      markers: sanitizeMarkers(body.edit.markers),
    };
  }

  const item = await updateMedia(id, patch);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(item);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteMedia(id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
