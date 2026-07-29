import {
  deleteEditProject,
  getEditProject,
  updateEditProject,
  type EditClip,
  type EditMarker,
  type EditTrack,
} from "@/lib/edit-projects";

type Ctx = { params: Promise<{ id: string }> };

const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function sanitizeClip(raw: Record<string, unknown>): EditClip | null {
  const mediaId = String(raw.mediaId ?? "");
  if (!mediaId) return null;
  const srcInMs = Math.max(0, Math.round(num(raw.srcInMs, 0)));
  const srcOutMs = Math.max(srcInMs + 50, Math.round(num(raw.srcOutMs, srcInMs + 50)));
  const effects = Array.isArray(raw.effects) ? raw.effects : [];
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    mediaId,
    startMs: Math.max(0, Math.round(num(raw.startMs, 0))),
    srcInMs,
    srcOutMs,
    speed: clamp(num(raw.speed, 1), 0.1, 8),
    muted: !!raw.muted,
    gainDb: clamp(num(raw.gainDb, 0), -60, 12),
    opacity: clamp(num(raw.opacity, 1), 0, 1),
    fadeInMs: Math.max(0, Math.round(num(raw.fadeInMs, 0))),
    fadeOutMs: Math.max(0, Math.round(num(raw.fadeOutMs, 0))),
    label: String(raw.label ?? "").slice(0, 200),
    effects: effects.map((e, i) => {
      const fx = e as Record<string, unknown>;
      let params = "{}";
      try {
        params = JSON.stringify(JSON.parse(String(fx.params ?? "{}"))).slice(0, 20000);
      } catch {
        // malformed params — store an empty document rather than reject
      }
      return {
        id: String(fx.id ?? crypto.randomUUID()),
        kind: String(fx.kind ?? "unknown").slice(0, 100),
        params,
        orderIdx: i,
      };
    }),
  };
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const project = await getEditProject(id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    notes?: string;
    tracks?: EditTrack[];
    markers?: EditMarker[];
  };
  const patch: Parameters<typeof updateEditProject>[1] = {};
  if (typeof body.title === "string") patch.title = body.title.slice(0, 200);
  if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 5000);
  if (Array.isArray(body.tracks)) {
    patch.tracks = body.tracks.map((t, ti) => {
      const raw = t as unknown as Record<string, unknown>;
      const clips = Array.isArray(raw.clips) ? raw.clips : [];
      return {
        id: String(raw.id ?? crypto.randomUUID()),
        kind: raw.kind === "audio" ? "audio" : "video",
        name: String(raw.name ?? `Track ${ti + 1}`).slice(0, 100),
        orderIdx: ti,
        muted: !!raw.muted,
        locked: !!raw.locked,
        volume: clamp(num(raw.volume, 1), 0, 2),
        clips: clips
          .map((c) => sanitizeClip(c as Record<string, unknown>))
          .filter((c): c is EditClip => c !== null),
      };
    });
  }
  if (Array.isArray(body.markers)) {
    patch.markers = body.markers.map((m) => {
      const raw = m as unknown as Record<string, unknown>;
      return {
        id: String(raw.id ?? crypto.randomUUID()),
        clipId: raw.clipId ? String(raw.clipId) : null,
        tMs: Math.max(0, Math.round(num(raw.tMs, 0))),
        label: String(raw.label ?? "Marker").slice(0, 200),
        note: raw.note == null ? null : String(raw.note).slice(0, 2000),
        color: raw.color == null ? null : String(raw.color).slice(0, 30),
        createdAt: String(raw.createdAt ?? new Date().toISOString()),
      };
    });
  }
  const project = await updateEditProject(id, patch);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteEditProject(id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
