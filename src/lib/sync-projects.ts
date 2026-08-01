import crypto from "crypto";
import { asc, desc, eq } from "drizzle-orm";
import {
  blobDel,
  blobGetJson,
  blobList,
  blobPutJson,
  isCloudStore,
} from "./blob-store";
import { db, dbReady } from "./db";
import {
  media as mediaTable,
  syncAngles as anglesTable,
  syncProjects as projectsTable,
} from "./db/schema";
import { getMedia, listMedia } from "./media";

/**
 * Multi-angle sync projects — one master audio track (the clock) plus N
 * video angles. Local: SQLite. Cloud: JSON in Vercel Blob.
 */

const BLOB_SYNC_PREFIX = "ca/sync/";

function syncBlobPath(id: string) {
  return `${BLOB_SYNC_PREFIX}${id}.json`;
}

export interface SyncAngle {
  id: string;
  mediaId: string;
  label: string;
  /** Positive = this angle starts AFTER the master's t=0 by this many ms. */
  offsetMs: number;
  position: number;
}

export interface SyncProject {
  id: string;
  title: string;
  notes: string;
  masterMediaId: string | null;
  angles: SyncAngle[];
  createdAt: string;
  updatedAt: string;
}

export interface SyncProjectSummary {
  id: string;
  title: string;
  masterMediaId: string | null;
  masterTitle: string | null;
  angleCount: number;
  createdAt: string;
}

type ProjectRow = typeof projectsTable.$inferSelect;
type AngleRow = typeof anglesTable.$inferSelect;

function toAngle(r: AngleRow): SyncAngle {
  return { id: r.id, mediaId: r.mediaId, label: r.label, offsetMs: r.offsetMs, position: r.position };
}

function toProject(row: ProjectRow, angleRows: AngleRow[]): SyncProject {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    masterMediaId: row.masterMediaId,
    angles: angleRows.map(toAngle),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listSyncProjectsCloud(): Promise<SyncProjectSummary[]> {
  const blobs = await blobList(BLOB_SYNC_PREFIX);
  const media = await listMedia();
  const titles = new Map(media.map((m) => [m.id, m.title]));
  const out: SyncProjectSummary[] = [];
  await Promise.all(
    blobs.map(async (b) => {
      if (!b.pathname.endsWith(".json")) return;
      const p = await blobGetJson<SyncProject>(b.url);
      if (!p?.id) return;
      out.push({
        id: p.id,
        title: p.title,
        masterMediaId: p.masterMediaId,
        masterTitle: p.masterMediaId
          ? (titles.get(p.masterMediaId) ?? null)
          : null,
        angleCount: p.angles.length,
        createdAt: p.createdAt,
      });
    }),
  );
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return out;
}

async function getSyncProjectCloud(id: string): Promise<SyncProject | null> {
  const blobs = await blobList(BLOB_SYNC_PREFIX);
  const hit = blobs.find(
    (b) => b.pathname === syncBlobPath(id) || b.pathname.endsWith(`/${id}.json`),
  );
  if (!hit) return null;
  return blobGetJson<SyncProject>(hit.url);
}

export async function listSyncProjects(): Promise<SyncProjectSummary[]> {
  if (isCloudStore()) return listSyncProjectsCloud();
  await dbReady();
  const rows = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
  const allAngles = await db.select().from(anglesTable);
  const counts = new Map<string, number>();
  for (const a of allAngles) counts.set(a.projectId, (counts.get(a.projectId) ?? 0) + 1);
  const mediaRows = await db
    .select({ id: mediaTable.id, title: mediaTable.title })
    .from(mediaTable);
  const titles = new Map(mediaRows.map((m) => [m.id, m.title]));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    masterMediaId: r.masterMediaId,
    masterTitle: r.masterMediaId ? (titles.get(r.masterMediaId) ?? null) : null,
    angleCount: counts.get(r.id) ?? 0,
    createdAt: r.createdAt,
  }));
}

export async function getSyncProject(id: string): Promise<SyncProject | null> {
  if (isCloudStore()) return getSyncProjectCloud(id);
  await dbReady();
  const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (rows.length === 0) return null;
  const angleRows = await db
    .select()
    .from(anglesTable)
    .where(eq(anglesTable.projectId, id))
    .orderBy(asc(anglesTable.position));
  return toProject(rows[0], angleRows);
}

export async function createSyncProject(title: string): Promise<SyncProject> {
  const now = new Date().toISOString();
  const project: SyncProject = {
    id: crypto.randomBytes(8).toString("hex"),
    title: title.trim() || "Untitled session",
    notes: "",
    masterMediaId: null,
    angles: [],
    createdAt: now,
    updatedAt: now,
  };
  if (isCloudStore()) {
    await blobPutJson(syncBlobPath(project.id), project);
    return project;
  }
  await dbReady();
  await db.insert(projectsTable).values({
    id: project.id,
    title: project.title,
    notes: "",
    masterMediaId: null,
    createdAt: now,
    updatedAt: now,
  });
  return project;
}

export async function updateSyncProject(
  id: string,
  patch: Partial<Pick<SyncProject, "title" | "notes" | "masterMediaId" | "angles">>
): Promise<SyncProject | null> {
  if (isCloudStore()) {
    const existing = await getSyncProjectCloud(id);
    if (!existing) return null;
    const next: SyncProject = {
      ...existing,
      title: patch.title ?? existing.title,
      notes: patch.notes ?? existing.notes,
      masterMediaId:
        patch.masterMediaId !== undefined
          ? patch.masterMediaId
          : existing.masterMediaId,
      angles: patch.angles ?? existing.angles,
      updatedAt: new Date().toISOString(),
    };
    await blobPutJson(syncBlobPath(id), next);
    return next;
  }
  await dbReady();
  const existing = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (existing.length === 0) return null;

  const fields: Partial<ProjectRow> = { updatedAt: new Date().toISOString() };
  if (patch.title !== undefined) fields.title = patch.title;
  if (patch.notes !== undefined) fields.notes = patch.notes;
  if (patch.masterMediaId !== undefined) fields.masterMediaId = patch.masterMediaId;
  await db.update(projectsTable).set(fields).where(eq(projectsTable.id, id));

  if (patch.angles !== undefined) {
    // The payload carries the full angle set — replace wholesale.
    await db.delete(anglesTable).where(eq(anglesTable.projectId, id));
    for (const [i, a] of patch.angles.entries()) {
      await db.insert(anglesTable).values({
        id: a.id,
        projectId: id,
        mediaId: a.mediaId,
        label: a.label,
        offsetMs: a.offsetMs,
        position: i,
      });
    }
  }
  return getSyncProject(id);
}

export async function deleteSyncProject(id: string): Promise<boolean> {
  if (isCloudStore()) {
    const existing = await getSyncProjectCloud(id);
    if (!existing) return false;
    const blobs = await blobList(BLOB_SYNC_PREFIX);
    const hit = blobs.find(
      (b) => b.pathname === syncBlobPath(id) || b.pathname.endsWith(`/${id}.json`),
    );
    if (hit) await blobDel(hit.url);
    return true;
  }
  await dbReady();
  const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (rows.length === 0) return false;
  await db.delete(anglesTable).where(eq(anglesTable.projectId, id));
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  return true;
}
