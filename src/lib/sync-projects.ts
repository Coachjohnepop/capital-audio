import crypto from "crypto";
import { asc, desc, eq } from "drizzle-orm";
import { db, dbReady } from "./db";
import {
  media as mediaTable,
  syncAngles as anglesTable,
  syncProjects as projectsTable,
} from "./db/schema";

/**
 * Multi-angle sync projects — one master audio track (the clock) plus N
 * video angles, each carrying an offsetMs that lines it up against the
 * master. Footage lives in the shared media library; a project stores only
 * references + offsets, so files are uploaded once and never modified.
 */

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

export async function listSyncProjects(): Promise<SyncProjectSummary[]> {
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
  await dbReady();
  const now = new Date().toISOString();
  const row: ProjectRow = {
    id: crypto.randomBytes(8).toString("hex"),
    title: title.trim() || "Untitled session",
    notes: "",
    masterMediaId: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(projectsTable).values(row);
  return toProject(row, []);
}

export async function updateSyncProject(
  id: string,
  patch: Partial<Pick<SyncProject, "title" | "notes" | "masterMediaId" | "angles">>
): Promise<SyncProject | null> {
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
  await dbReady();
  const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (rows.length === 0) return false;
  await db.delete(anglesTable).where(eq(anglesTable.projectId, id));
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  return true;
}
