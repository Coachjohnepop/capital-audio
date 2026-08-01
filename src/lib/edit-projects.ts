import crypto from "crypto";
import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  blobDel,
  blobDelPrefix,
  blobGetJson,
  blobList,
  blobPutJson,
  isCloudStore,
} from "./blob-store";
import { db, dbReady } from "./db";
import {
  editClips as clipsTable,
  editEffects as effectsTable,
  editMarkers as markersTable,
  editProjects as projectsTable,
  editTracks as tracksTable,
} from "./db/schema";

/**
 * Timeline sessions (GarageBand multi-track feeds).
 * Local: SQLite. Cloud (Vercel): JSON docs in Vercel Blob.
 */

const BLOB_EDITS_PREFIX = "ca/edits/";

/** Folder per project so we can pick the newest revision reliably. */
function editBlobDir(id: string) {
  return `${BLOB_EDITS_PREFIX}${id}/`;
}

function editBlobPath(id: string) {
  // Fixed "head" path + versioned writes; readers pick max(updatedAt).
  return `${editBlobDir(id)}doc.json`;
}

export interface EditEffect {
  id: string;
  kind: string;
  /** JSON document — effect-specific params (and later, keyframes). */
  params: string;
  orderIdx: number;
}

export interface EditClip {
  id: string;
  mediaId: string;
  startMs: number;
  srcInMs: number;
  srcOutMs: number;
  speed: number;
  muted: boolean;
  gainDb: number;
  opacity: number;
  fadeInMs: number;
  fadeOutMs: number;
  label: string;
  effects: EditEffect[];
}

export interface EditTrack {
  id: string;
  kind: "video" | "audio";
  name: string;
  orderIdx: number;
  muted: boolean;
  locked: boolean;
  volume: number;
  clips: EditClip[];
}

export interface EditMarker {
  id: string;
  /** null = pinned to the timeline; set = offsetMs into that clip. */
  clipId: string | null;
  tMs: number;
  label: string;
  note: string | null;
  color: string | null;
  createdAt: string;
}

export interface EditProject {
  id: string;
  title: string;
  notes: string;
  tracks: EditTrack[];
  markers: EditMarker[];
  createdAt: string;
  updatedAt: string;
}

export interface EditProjectSummary {
  id: string;
  title: string;
  clipCount: number;
  durationMs: number;
  createdAt: string;
  updatedAt: string;
}

export const clipDurationMs = (c: Pick<EditClip, "srcInMs" | "srcOutMs" | "speed">) =>
  Math.max(0, Math.round((c.srcOutMs - c.srcInMs) / (c.speed || 1)));

function summarizeProject(p: EditProject): EditProjectSummary {
  let clipCount = 0;
  let durationMs = 0;
  for (const t of p.tracks) {
    for (const c of t.clips) {
      clipCount += 1;
      durationMs = Math.max(
        durationMs,
        c.startMs + clipDurationMs(c),
      );
    }
  }
  return {
    id: p.id,
    title: p.title,
    clipCount,
    durationMs,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * Load every JSON revision under ca/edits/{id}/ and return the newest by updatedAt.
 * Fixes a prod bug where list() could return a stale empty create-doc after PATCH.
 */
async function getEditProjectCloud(id: string): Promise<EditProject | null> {
  const blobs = await blobList(editBlobDir(id));
  // Legacy flat path from first cloud version
  const legacy = await blobList(BLOB_EDITS_PREFIX);
  const candidates = [
    ...blobs,
    ...legacy.filter(
      (b) =>
        b.pathname === `${BLOB_EDITS_PREFIX}${id}.json` ||
        b.pathname.endsWith(`/${id}.json`),
    ),
  ].filter((b) => b.pathname.endsWith(".json"));

  if (candidates.length === 0) return null;

  const docs: EditProject[] = [];
  await Promise.all(
    candidates.map(async (b) => {
      // Bust CDN: append query (Blob URLs usually ignore unknown query)
      const bust = b.url.includes("?") ? `${b.url}&t=${Date.now()}` : `${b.url}?t=${Date.now()}`;
      const p = await blobGetJson<EditProject>(bust);
      if (p?.id === id) docs.push(p);
    }),
  );
  if (docs.length === 0) return null;
  docs.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return docs[0];
}

async function writeEditProjectCloud(project: EditProject): Promise<EditProject> {
  // Unique revision + head pointer. Readers pick max(updatedAt) across all.
  const rev = `${editBlobDir(project.id)}rev-${Date.now()}.json`;
  const putRev = await blobPutJson(rev, project);
  await blobPutJson(editBlobPath(project.id), project);
  // Verify via the URL we just wrote (not list — list can lag)
  const verified = await blobGetJson<EditProject>(putRev.url);
  if (verified && (verified.tracks?.length ?? 0) !== (project.tracks?.length ?? 0)) {
    console.warn("[edits] write verify track mismatch", {
      id: project.id,
      expected: project.tracks.length,
      got: verified.tracks?.length,
    });
  }
  return project;
}

async function listEditProjectsCloud(): Promise<EditProjectSummary[]> {
  const blobs = await blobList(BLOB_EDITS_PREFIX);
  // Group by project id
  const byId = new Map<string, { url: string; pathname: string }[]>();
  for (const b of blobs) {
    if (!b.pathname.endsWith(".json")) continue;
    // ca/edits/{id}/doc.json  or  ca/edits/{id}.json  or  ca/edits/{id}/rev-….json
    const parts = b.pathname.replace(BLOB_EDITS_PREFIX, "").split("/");
    const id = parts[0]?.replace(/\.json$/, "");
    if (!id) continue;
    const list = byId.get(id) ?? [];
    list.push(b);
    byId.set(id, list);
  }

  const summaries: EditProjectSummary[] = [];
  await Promise.all(
    Array.from(byId.keys()).map(async (id) => {
      const p = await getEditProjectCloud(id);
      if (p) summaries.push(summarizeProject(p));
    }),
  );
  summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return summaries;
}

export async function listEditProjects(): Promise<EditProjectSummary[]> {
  if (isCloudStore()) return listEditProjectsCloud();
  await dbReady();
  const rows = await db.select().from(projectsTable).orderBy(desc(projectsTable.updatedAt));
  const trackRows = await db.select().from(tracksTable);
  const clipRows = await db.select().from(clipsTable);
  const projectByTrack = new Map(trackRows.map((t) => [t.id, t.projectId]));
  const counts = new Map<string, number>();
  const ends = new Map<string, number>();
  for (const c of clipRows) {
    const pid = projectByTrack.get(c.trackId);
    if (!pid) continue;
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
    const end =
      c.startMs + clipDurationMs({ srcInMs: c.srcInMs, srcOutMs: c.srcOutMs, speed: c.speed });
    ends.set(pid, Math.max(ends.get(pid) ?? 0, end));
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    clipCount: counts.get(r.id) ?? 0,
    durationMs: ends.get(r.id) ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getEditProject(id: string): Promise<EditProject | null> {
  if (isCloudStore()) return getEditProjectCloud(id);
  await dbReady();
  const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (rows.length === 0) return null;
  const trackRows = await db
    .select()
    .from(tracksTable)
    .where(eq(tracksTable.projectId, id))
    .orderBy(asc(tracksTable.orderIdx));
  const trackIds = trackRows.map((t) => t.id);
  const clipRows = trackIds.length
    ? await db.select().from(clipsTable).where(inArray(clipsTable.trackId, trackIds))
    : [];
  const clipIds = clipRows.map((c) => c.id);
  const effectRows = clipIds.length
    ? await db
        .select()
        .from(effectsTable)
        .where(inArray(effectsTable.clipId, clipIds))
        .orderBy(asc(effectsTable.orderIdx))
    : [];
  const markerRows = await db
    .select()
    .from(markersTable)
    .where(eq(markersTable.projectId, id))
    .orderBy(asc(markersTable.tMs));

  const effectsByClip = new Map<string, EditEffect[]>();
  for (const e of effectRows) {
    const list = effectsByClip.get(e.clipId) ?? [];
    list.push({ id: e.id, kind: e.kind, params: e.params, orderIdx: e.orderIdx });
    effectsByClip.set(e.clipId, list);
  }

  return {
    id: rows[0].id,
    title: rows[0].title,
    notes: rows[0].notes,
    createdAt: rows[0].createdAt,
    updatedAt: rows[0].updatedAt,
    markers: markerRows.map((m) => ({
      id: m.id,
      clipId: m.clipId,
      tMs: m.tMs,
      label: m.label,
      note: m.note,
      color: m.color,
      createdAt: m.createdAt,
    })),
    tracks: trackRows.map((t) => ({
      id: t.id,
      kind: t.kind,
      name: t.name,
      orderIdx: t.orderIdx,
      muted: !!t.muted,
      locked: !!t.locked,
      volume: t.volume,
      clips: clipRows
        .filter((c) => c.trackId === t.id)
        .sort((a, b) => a.startMs - b.startMs)
        .map((c) => ({
          id: c.id,
          mediaId: c.mediaId,
          startMs: c.startMs,
          srcInMs: c.srcInMs,
          srcOutMs: c.srcOutMs,
          speed: c.speed,
          muted: !!c.muted,
          gainDb: c.gainDb,
          opacity: c.opacity,
          fadeInMs: c.fadeInMs,
          fadeOutMs: c.fadeOutMs,
          label: c.label,
          effects: effectsByClip.get(c.id) ?? [],
        })),
    })),
  };
}

/**
 * New projects start empty (GarageBand-style multi-track session).
 * Each imported feed becomes its own parallel track — not an iMovie
 * magnetic storyline. `mode` is reserved for future defaults only.
 */
export async function createEditProject(
  title: string,
  _mode: "audio" | "audio-video" = "audio-video",
): Promise<EditProject> {
  const now = new Date().toISOString();
  const id = crypto.randomBytes(8).toString("hex");
  const project: EditProject = {
    id,
    title: title.trim() || "Untitled session",
    notes: "",
    tracks: [],
    markers: [],
    createdAt: now,
    updatedAt: now,
  };
  if (isCloudStore()) {
    return writeEditProjectCloud(project);
  }
  await dbReady();
  await db.insert(projectsTable).values({
    id,
    title: project.title,
    notes: "",
    createdAt: now,
    updatedAt: now,
  });
  return (await getEditProject(id))!;
}

export async function updateEditProject(
  id: string,
  patch: Partial<Pick<EditProject, "title" | "notes" | "tracks" | "markers">>
): Promise<EditProject | null> {
  if (isCloudStore()) {
    const existing = await getEditProjectCloud(id);
    if (!existing) return null;
    const next: EditProject = {
      ...existing,
      title: patch.title ?? existing.title,
      notes: patch.notes ?? existing.notes,
      tracks: patch.tracks ?? existing.tracks,
      markers: patch.markers ?? existing.markers,
      updatedAt: new Date().toISOString(),
    };
    return writeEditProjectCloud(next);
  }
  await dbReady();
  const existing = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (existing.length === 0) return null;

  const fields: Partial<typeof projectsTable.$inferSelect> = {
    updatedAt: new Date().toISOString(),
  };
  if (patch.title !== undefined) fields.title = patch.title;
  if (patch.notes !== undefined) fields.notes = patch.notes;
  await db.update(projectsTable).set(fields).where(eq(projectsTable.id, id));

  if (patch.tracks !== undefined) {
    // Full-document replace, same convention as sync projects. Explicit
    // child-first deletes — no reliance on FK cascade being enabled.
    const oldTracks = await db
      .select({ id: tracksTable.id })
      .from(tracksTable)
      .where(eq(tracksTable.projectId, id));
    const oldTrackIds = oldTracks.map((t) => t.id);
    if (oldTrackIds.length) {
      const oldClips = await db
        .select({ id: clipsTable.id })
        .from(clipsTable)
        .where(inArray(clipsTable.trackId, oldTrackIds));
      const oldClipIds = oldClips.map((c) => c.id);
      if (oldClipIds.length) {
        await db.delete(effectsTable).where(inArray(effectsTable.clipId, oldClipIds));
        await db.delete(clipsTable).where(inArray(clipsTable.trackId, oldTrackIds));
      }
      await db.delete(tracksTable).where(eq(tracksTable.projectId, id));
    }
    for (const [ti, t] of patch.tracks.entries()) {
      await db.insert(tracksTable).values({
        id: t.id,
        projectId: id,
        kind: t.kind,
        name: t.name,
        orderIdx: ti,
        muted: t.muted ? 1 : 0,
        locked: t.locked ? 1 : 0,
        volume: t.volume,
      });
      for (const c of t.clips) {
        await db.insert(clipsTable).values({
          id: c.id,
          trackId: t.id,
          mediaId: c.mediaId,
          startMs: c.startMs,
          srcInMs: c.srcInMs,
          srcOutMs: c.srcOutMs,
          speed: c.speed,
          muted: c.muted ? 1 : 0,
          gainDb: c.gainDb,
          opacity: c.opacity,
          fadeInMs: c.fadeInMs,
          fadeOutMs: c.fadeOutMs,
          label: c.label,
        });
        for (const e of c.effects) {
          await db.insert(effectsTable).values({
            id: e.id,
            clipId: c.id,
            kind: e.kind,
            params: e.params,
            orderIdx: e.orderIdx,
          });
        }
      }
    }
  }

  if (patch.markers !== undefined) {
    await db.delete(markersTable).where(eq(markersTable.projectId, id));
    for (const m of patch.markers) {
      await db.insert(markersTable).values({
        id: m.id,
        projectId: id,
        clipId: m.clipId,
        tMs: m.tMs,
        label: m.label,
        note: m.note,
        color: m.color,
        createdAt: m.createdAt,
      });
    }
  }

  return getEditProject(id);
}

export async function deleteEditProject(id: string): Promise<boolean> {
  if (isCloudStore()) {
    const existing = await getEditProjectCloud(id);
    if (!existing) return false;
    // Remove folder + legacy flat file
    await blobDelPrefix(editBlobDir(id));
    const legacy = await blobList(BLOB_EDITS_PREFIX);
    for (const b of legacy) {
      if (
        b.pathname === `${BLOB_EDITS_PREFIX}${id}.json` ||
        b.pathname.endsWith(`/${id}.json`)
      ) {
        await blobDel(b.url);
      }
    }
    return true;
  }
  await dbReady();
  const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (rows.length === 0) return false;
  const trackRows = await db
    .select({ id: tracksTable.id })
    .from(tracksTable)
    .where(eq(tracksTable.projectId, id));
  const trackIds = trackRows.map((t) => t.id);
  if (trackIds.length) {
    const clipRows = await db
      .select({ id: clipsTable.id })
      .from(clipsTable)
      .where(inArray(clipsTable.trackId, trackIds));
    const clipIds = clipRows.map((c) => c.id);
    if (clipIds.length) {
      await db.delete(effectsTable).where(inArray(effectsTable.clipId, clipIds));
      await db.delete(clipsTable).where(inArray(clipsTable.trackId, trackIds));
    }
    await db.delete(tracksTable).where(eq(tracksTable.projectId, id));
  }
  await db.delete(markersTable).where(eq(markersTable.projectId, id));
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  return true;
}
