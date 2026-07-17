import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { asc, desc, eq } from "drizzle-orm";
import { db, dbReady } from "./db";
import { markers as markersTable, media as mediaTable } from "./db/schema";
import { kindFromMime, type MediaItem, type MediaMarker } from "./media-shared";

export type { MediaEdit, MediaItem, MediaKind, MediaMarker, Projection } from "./media-shared";
export { formatBytes, kindFromMime } from "./media-shared";

/**
 * Media store: metadata in the database (SQLite locally, Turso in prod),
 * file bytes on disk under .data/media/ until the R2 driver lands.
 */

const MEDIA_DIR = path.join(process.cwd(), ".data", "media");

type MediaRow = typeof mediaTable.$inferSelect;
type MarkerRow = typeof markersTable.$inferSelect;

function toMarker(r: MarkerRow): MediaMarker {
  return {
    id: r.id,
    t: r.t,
    end: r.end ?? undefined,
    label: r.label,
    note: r.note ?? undefined,
    by: r.by,
    author: r.author ?? undefined,
  };
}

function toItem(row: MediaRow, markerRows: MarkerRow[]): MediaItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    uploadedAt: row.uploadedAt,
    duration: row.duration,
    projection: row.projection ?? undefined,
    edit: {
      trimIn: row.trimIn,
      trimOut: row.trimOut,
      markers: markerRows.map(toMarker),
    },
  };
}

export async function listMedia(): Promise<MediaItem[]> {
  await dbReady();
  const rows = await db.select().from(mediaTable).orderBy(desc(mediaTable.uploadedAt));
  const allMarkers = await db.select().from(markersTable).orderBy(asc(markersTable.t));
  const byMedia = new Map<string, MarkerRow[]>();
  for (const m of allMarkers) {
    const list = byMedia.get(m.mediaId) ?? [];
    list.push(m);
    byMedia.set(m.mediaId, list);
  }
  return rows.map((r) => toItem(r, byMedia.get(r.id) ?? []));
}

export async function getMedia(id: string): Promise<MediaItem | null> {
  await dbReady();
  const rows = await db.select().from(mediaTable).where(eq(mediaTable.id, id));
  if (rows.length === 0) return null;
  const markerRows = await db
    .select()
    .from(markersTable)
    .where(eq(markersTable.mediaId, id))
    .orderBy(asc(markersTable.t));
  return toItem(rows[0], markerRows);
}

export function sanitizeMarkers(raw: unknown): MediaMarker[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m: Record<string, unknown>) => ({
    id: String(m.id),
    t: Math.max(0, Number(m.t) || 0),
    end:
      m.end == null || !isFinite(Number(m.end)) ? undefined : Math.max(0, Number(m.end)),
    label: String(m.label ?? "").slice(0, 200),
    note: m.note ? String(m.note).slice(0, 2000) : undefined,
    by: m.by === "client" ? "client" : "admin",
    author: m.author ? String(m.author).slice(0, 80) : undefined,
  }));
}

export async function saveUpload(file: File): Promise<MediaItem> {
  await dbReady();
  const kind = kindFromMime(file.type);
  if (!kind) throw new Error(`Unsupported type: ${file.type || "unknown"}`);

  const id = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(file.name) || (kind === "video" ? ".mp4" : ".wav");
  const storedName = `${id}${ext}`;

  await fs.mkdir(MEDIA_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(MEDIA_DIR, storedName), buf);

  const row: MediaRow = {
    id,
    kind,
    title: file.name.replace(/\.[^.]+$/, ""),
    filename: storedName,
    mime: file.type,
    size: buf.length,
    uploadedAt: new Date().toISOString(),
    duration: null,
    projection: null,
    trimIn: 0,
    trimOut: null,
  };
  await db.insert(mediaTable).values(row);
  return toItem(row, []);
}

export async function updateMedia(
  id: string,
  patch: Partial<Pick<MediaItem, "title" | "duration" | "edit" | "projection">>
): Promise<MediaItem | null> {
  await dbReady();
  const fields: Partial<MediaRow> = {};
  if (patch.title !== undefined) fields.title = patch.title;
  if (patch.duration !== undefined) fields.duration = patch.duration;
  if (patch.projection !== undefined) fields.projection = patch.projection;
  if (patch.edit !== undefined) {
    fields.trimIn = patch.edit.trimIn;
    fields.trimOut = patch.edit.trimOut;
  }
  if (Object.keys(fields).length > 0) {
    await db.update(mediaTable).set(fields).where(eq(mediaTable.id, id));
  }
  if (patch.edit !== undefined) {
    // The edit payload carries the full marker set — replace wholesale.
    await db.delete(markersTable).where(eq(markersTable.mediaId, id));
    for (const m of patch.edit.markers) {
      await db.insert(markersTable).values({
        id: m.id,
        mediaId: id,
        t: m.t,
        end: m.end ?? null,
        label: m.label,
        note: m.note ?? null,
        by: m.by,
        author: m.author ?? null,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return getMedia(id);
}

export async function addClientMarker(
  id: string,
  marker: MediaMarker
): Promise<MediaItem | null> {
  await dbReady();
  const existing = await db.select().from(mediaTable).where(eq(mediaTable.id, id));
  if (existing.length === 0) return null;
  await db.insert(markersTable).values({
    id: marker.id,
    mediaId: id,
    t: marker.t,
    end: marker.end ?? null,
    label: marker.label,
    note: marker.note ?? null,
    by: marker.by,
    author: marker.author ?? null,
    createdAt: new Date().toISOString(),
  });
  return getMedia(id);
}

export async function deleteMedia(id: string): Promise<boolean> {
  await dbReady();
  const rows = await db.select().from(mediaTable).where(eq(mediaTable.id, id));
  if (rows.length === 0) return false;
  await db.delete(markersTable).where(eq(markersTable.mediaId, id));
  await db.delete(mediaTable).where(eq(mediaTable.id, id));
  await fs.rm(path.join(MEDIA_DIR, rows[0].filename), { force: true });
  return true;
}

export function getFilePath(item: MediaItem) {
  return path.join(MEDIA_DIR, item.filename);
}
