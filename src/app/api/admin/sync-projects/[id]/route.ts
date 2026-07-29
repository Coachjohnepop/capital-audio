import {
  deleteSyncProject,
  getSyncProject,
  updateSyncProject,
  type SyncAngle,
} from "@/lib/sync-projects";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const project = await getSyncProject(id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    notes?: string;
    masterMediaId?: string | null;
    angles?: SyncAngle[];
  };
  const patch: Parameters<typeof updateSyncProject>[1] = {};
  if (typeof body.title === "string") patch.title = body.title.slice(0, 200);
  if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 5000);
  if (body.masterMediaId !== undefined) {
    patch.masterMediaId = body.masterMediaId ? String(body.masterMediaId) : null;
  }
  if (Array.isArray(body.angles)) {
    patch.angles = body.angles.map((a, i) => ({
      id: String(a.id),
      mediaId: String(a.mediaId),
      label: String(a.label ?? "Angle").slice(0, 200),
      offsetMs: Math.round(Number(a.offsetMs) || 0),
      position: i,
    }));
  }
  const project = await updateSyncProject(id, patch);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteSyncProject(id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
