import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import {
  blobDelPrefix,
  blobGetJson,
  blobList,
  blobPut,
  blobPutJson,
  isCloudStore,
} from "./blob-store";
import { kindFromMime, type MediaItem, type MediaMarker } from "./media-shared";

/** Local-only DB imports are dynamic so Vercel never opens SQLite at load. */
async function localDb() {
  const { db, dbReady } = await import("./db");
  const schema = await import("./db/schema");
  await dbReady();
  return { db, mediaTable: schema.media, markersTable: schema.markers };
}

export type { MediaEdit, MediaItem, MediaKind, MediaMarker, Projection } from "./media-shared";
export { formatBytes, kindFromMime } from "./media-shared";

/**
 * Media store:
 *  - Local: SQLite metadata + .data/media/ files
 *  - Cloud (Vercel): Vercel Blob for files + meta JSON (durable)
 */

const MEDIA_DIR = path.join(process.cwd(), ".data", "media");
const BLOB_MEDIA_PREFIX = "ca/media/";

/** Cloud meta document stored next to the file bytes. */
export type MediaBlobMeta = MediaItem & {
  blobUrl: string;
  blobPathname: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMarker(r: any): MediaMarker {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toItem(row: any, markerRows: any[]): MediaItem {
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

function metaPath(id: string) {
  return `${BLOB_MEDIA_PREFIX}${id}/meta.json`;
}

function filePathname(id: string, ext: string) {
  return `${BLOB_MEDIA_PREFIX}${id}/file${ext}`;
}

// ─── public API ─────────────────────────────────────────────

export async function listMedia(): Promise<MediaItem[]> {
  if (isCloudStore()) return listMediaCloud();
  return listMediaLocal();
}

export async function getMedia(id: string): Promise<MediaItem | null> {
  if (isCloudStore()) return getMediaCloud(id);
  return getMediaLocal(id);
}

/** Public URL for the raw bytes when on cloud (null on local). */
export async function getMediaBlobUrl(id: string): Promise<string | null> {
  if (!isCloudStore()) return null;
  const meta = await blobGetJson<MediaBlobMeta>(
    (await findMetaUrl(id)) ?? metaPath(id),
  );
  return meta?.blobUrl ?? null;
}

export function sanitizeMarkers(raw: unknown): MediaMarker[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m: Record<string, unknown>) => ({
    id: String(m.id),
    t: Math.max(0, Number(m.t) || 0),
    end:
      m.end == null || !isFinite(Number(m.end))
        ? undefined
        : Math.max(0, Number(m.end)),
    label: String(m.label ?? "").slice(0, 200),
    note: m.note ? String(m.note).slice(0, 2000) : undefined,
    by: m.by === "client" ? "client" : "admin",
    author: m.author ? String(m.author).slice(0, 80) : undefined,
  }));
}

export async function saveUpload(file: File): Promise<MediaItem> {
  if (isCloudStore()) return saveUploadCloud(file);
  return saveUploadLocal(file);
}

export async function updateMedia(
  id: string,
  patch: Partial<Pick<MediaItem, "title" | "duration" | "edit" | "projection">>,
): Promise<MediaItem | null> {
  if (isCloudStore()) return updateMediaCloud(id, patch);
  return updateMediaLocal(id, patch);
}

export async function addClientMarker(
  id: string,
  marker: MediaMarker,
): Promise<MediaItem | null> {
  if (isCloudStore()) {
    const item = await getMediaCloud(id);
    if (!item) return null;
    const next = {
      ...item,
      edit: {
        ...item.edit,
        markers: [...item.edit.markers, marker],
      },
    };
    return writeMediaMeta(next);
  }
  const { db, mediaTable, markersTable } = await localDb();
  const { eq } = await import("drizzle-orm");
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
  return getMediaLocal(id);
}

export async function deleteMedia(id: string): Promise<boolean> {
  if (isCloudStore()) {
    const existing = await getMediaCloud(id);
    if (!existing) return false;
    await blobDelPrefix(`${BLOB_MEDIA_PREFIX}${id}/`);
    return true;
  }
  const { db, mediaTable, markersTable } = await localDb();
  const { eq } = await import("drizzle-orm");
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

// ─── cloud ──────────────────────────────────────────────────

async function findMetaUrl(id: string): Promise<string | null> {
  const items = await blobList(`${BLOB_MEDIA_PREFIX}${id}/`);
  return items.find((i) => i.pathname.endsWith("/meta.json"))?.url ?? null;
}

async function listMediaCloud(): Promise<MediaItem[]> {
  const all = await blobList(BLOB_MEDIA_PREFIX);
  const metas = all.filter((b) => b.pathname.endsWith("/meta.json"));
  const items: MediaItem[] = [];
  await Promise.all(
    metas.map(async (m) => {
      const doc = await blobGetJson<MediaBlobMeta>(m.url);
      if (doc?.id) items.push(stripBlobFields(doc));
    }),
  );
  items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  return items;
}

async function getMediaCloud(id: string): Promise<MediaItem | null> {
  const url = await findMetaUrl(id);
  if (!url) return null;
  const doc = await blobGetJson<MediaBlobMeta>(url);
  return doc ? stripBlobFields(doc) : null;
}

function stripBlobFields(doc: MediaBlobMeta): MediaItem {
  const { blobUrl, blobPathname: _p, ...rest } = doc;
  return {
    ...rest,
    // Expose CDN URL so players can load without following our API redirect
    url: blobUrl || rest.url || undefined,
  };
}

async function writeMediaMeta(item: MediaItem & Partial<MediaBlobMeta>): Promise<MediaItem> {
  // preserve blobUrl if we already have it
  let blobUrl = item.blobUrl;
  let blobPathname = item.blobPathname;
  if (!blobUrl) {
    const existing = await blobGetJson<MediaBlobMeta>(
      (await findMetaUrl(item.id)) ?? metaPath(item.id),
    );
    blobUrl = existing?.blobUrl;
    blobPathname = existing?.blobPathname;
  }
  const doc: MediaBlobMeta = {
    ...item,
    blobUrl: blobUrl ?? "",
    blobPathname: blobPathname ?? "",
  };
  await blobPutJson(metaPath(item.id), doc);
  return stripBlobFields(doc);
}

async function saveUploadCloud(file: File): Promise<MediaItem> {
  const kind = kindFromMime(file.type);
  if (!kind) throw new Error(`Unsupported type: ${file.type || "unknown"}`);

  // Server-side put is only for small files (API body limit ~4.5MB on Vercel).
  // Large imports must use client → Blob (see ImportMediaButton + register).
  if (file.size > 4 * 1024 * 1024) {
    throw new Error(
      "File too large for server upload. Use client import (should auto-upgrade).",
    );
  }

  const id = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(file.name) || (kind === "video" ? ".mp4" : ".wav");
  const pathname = filePathname(id, ext);
  const buf = Buffer.from(await file.arrayBuffer());

  const uploaded = await blobPut(pathname, buf, file.type || undefined);

  return registerCloudMedia({
    id,
    kind,
    title: file.name.replace(/\.[^.]+$/, ""),
    filename: path.basename(pathname),
    mime: file.type,
    size: buf.length,
    blobUrl: uploaded.url,
    blobPathname: uploaded.pathname,
  });
}

/** Persist library metadata after a browser → Blob direct upload. */
export async function registerCloudMedia(input: {
  id: string;
  kind: "video" | "audio";
  title: string;
  filename: string;
  mime: string;
  size: number;
  blobUrl: string;
  blobPathname: string;
}): Promise<MediaItem> {
  const item: MediaBlobMeta = {
    id: input.id,
    kind: input.kind,
    title: input.title,
    filename: input.filename,
    mime: input.mime,
    size: input.size,
    uploadedAt: new Date().toISOString(),
    duration: null,
    projection: undefined,
    edit: { trimIn: 0, trimOut: null, markers: [] },
    blobUrl: input.blobUrl,
    blobPathname: input.blobPathname,
  };
  await blobPutJson(metaPath(input.id), item);
  return stripBlobFields(item);
}

async function updateMediaCloud(
  id: string,
  patch: Partial<Pick<MediaItem, "title" | "duration" | "edit" | "projection">>,
): Promise<MediaItem | null> {
  const url = await findMetaUrl(id);
  if (!url) return null;
  const doc = await blobGetJson<MediaBlobMeta>(url);
  if (!doc) return null;
  if (patch.title !== undefined) doc.title = patch.title;
  if (patch.duration !== undefined) doc.duration = patch.duration;
  if (patch.projection !== undefined) doc.projection = patch.projection;
  if (patch.edit !== undefined) doc.edit = patch.edit;
  await blobPutJson(metaPath(id), doc);
  return stripBlobFields(doc);
}

// ─── local ──────────────────────────────────────────────────

async function listMediaLocal(): Promise<MediaItem[]> {
  const { db, mediaTable, markersTable } = await localDb();
  const { asc, desc } = await import("drizzle-orm");
  const rows = await db.select().from(mediaTable).orderBy(desc(mediaTable.uploadedAt));
  const allMarkers = await db.select().from(markersTable).orderBy(asc(markersTable.t));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byMedia = new Map<string, any[]>();
  for (const m of allMarkers) {
    const list = byMedia.get(m.mediaId) ?? [];
    list.push(m);
    byMedia.set(m.mediaId, list);
  }
  return rows.map((r) => toItem(r, byMedia.get(r.id) ?? []));
}

async function getMediaLocal(id: string): Promise<MediaItem | null> {
  const { db, mediaTable, markersTable } = await localDb();
  const { asc, eq } = await import("drizzle-orm");
  const rows = await db.select().from(mediaTable).where(eq(mediaTable.id, id));
  if (rows.length === 0) return null;
  const markerRows = await db
    .select()
    .from(markersTable)
    .where(eq(markersTable.mediaId, id))
    .orderBy(asc(markersTable.t));
  return toItem(rows[0], markerRows);
}

async function saveUploadLocal(file: File): Promise<MediaItem> {
  const { db, mediaTable } = await localDb();
  const kind = kindFromMime(file.type);
  if (!kind) throw new Error(`Unsupported type: ${file.type || "unknown"}`);

  const id = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(file.name) || (kind === "video" ? ".mp4" : ".wav");
  const storedName = `${id}${ext}`;

  await fs.mkdir(MEDIA_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(MEDIA_DIR, storedName), buf);

  await db.insert(mediaTable).values({
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
  });
  return toItem(
    {
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
    },
    [],
  );
}

async function updateMediaLocal(
  id: string,
  patch: Partial<Pick<MediaItem, "title" | "duration" | "edit" | "projection">>,
): Promise<MediaItem | null> {
  const { db, mediaTable, markersTable } = await localDb();
  const { eq } = await import("drizzle-orm");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {};
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
  return getMediaLocal(id);
}
