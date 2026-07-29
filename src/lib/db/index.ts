import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { promises as fs } from "fs";
import path from "path";
import * as schema from "./schema";

/**
 * DATABASE_URL:
 *  - unset / file:  → local SQLite at .data/capital-audio.db (dev)
 *  - libsql://…     → Turso (production; set DATABASE_AUTH_TOKEN too)
 */
const url = process.env.DATABASE_URL ?? "file:.data/capital-audio.db";

const client = createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

let ready: Promise<void> | null = null;

/** Creates tables on first use and imports the legacy JSON manifest once. */
export function dbReady(): Promise<void> {
  ready ??= (async () => {
    if (url.startsWith("file:")) {
      await fs.mkdir(path.dirname(url.slice(5)), { recursive: true });
    }
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        uploaded_at TEXT NOT NULL,
        duration REAL,
        projection TEXT,
        trim_in REAL NOT NULL DEFAULT 0,
        trim_out REAL
      );
      CREATE TABLE IF NOT EXISTS markers (
        id TEXT PRIMARY KEY,
        media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
        t REAL NOT NULL,
        "end" REAL,
        label TEXT NOT NULL,
        note TEXT,
        by TEXT NOT NULL,
        author TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_markers_media ON markers(media_id);
      CREATE TABLE IF NOT EXISTS edit_projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS edit_tracks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES edit_projects(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        order_idx INTEGER NOT NULL DEFAULT 0,
        muted INTEGER NOT NULL DEFAULT 0,
        locked INTEGER NOT NULL DEFAULT 0,
        volume REAL NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_edit_tracks_project ON edit_tracks(project_id);
      CREATE TABLE IF NOT EXISTS edit_clips (
        id TEXT PRIMARY KEY,
        track_id TEXT NOT NULL REFERENCES edit_tracks(id) ON DELETE CASCADE,
        media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
        start_ms INTEGER NOT NULL DEFAULT 0,
        src_in_ms INTEGER NOT NULL DEFAULT 0,
        src_out_ms INTEGER NOT NULL,
        speed REAL NOT NULL DEFAULT 1,
        muted INTEGER NOT NULL DEFAULT 0,
        gain_db REAL NOT NULL DEFAULT 0,
        opacity REAL NOT NULL DEFAULT 1,
        fade_in_ms INTEGER NOT NULL DEFAULT 0,
        fade_out_ms INTEGER NOT NULL DEFAULT 0,
        label TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_edit_clips_track ON edit_clips(track_id);
      CREATE TABLE IF NOT EXISTS edit_markers (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES edit_projects(id) ON DELETE CASCADE,
        clip_id TEXT REFERENCES edit_clips(id) ON DELETE CASCADE,
        t_ms INTEGER NOT NULL,
        label TEXT NOT NULL,
        note TEXT,
        color TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_edit_markers_project ON edit_markers(project_id);
      CREATE TABLE IF NOT EXISTS edit_effects (
        id TEXT PRIMARY KEY,
        clip_id TEXT NOT NULL REFERENCES edit_clips(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        params TEXT NOT NULL DEFAULT '{}',
        order_idx INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_edit_effects_clip ON edit_effects(clip_id);
      CREATE TABLE IF NOT EXISTS sync_projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        master_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_angles (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES sync_projects(id) ON DELETE CASCADE,
        media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        offset_ms INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_sync_angles_project ON sync_angles(project_id);
    `);
    await importLegacyManifest();
  })();
  return ready;
}

/** One-time import of the pre-database .data/media.json manifest. */
async function importLegacyManifest() {
  const manifestPath = path.join(process.cwd(), ".data", "media.json");
  let legacy: Array<Record<string, unknown>>;
  try {
    legacy = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    return; // no legacy manifest — nothing to do
  }
  const existing = await db.select({ id: schema.media.id }).from(schema.media);
  const known = new Set(existing.map((r) => r.id));

  for (const raw of legacy) {
    const id = String(raw.id);
    if (known.has(id)) continue;
    const edit = (raw.edit ?? {}) as Record<string, unknown>;
    await db.insert(schema.media).values({
      id,
      kind: raw.kind === "audio" ? "audio" : "video",
      title: String(raw.title ?? id),
      filename: String(raw.filename),
      mime: String(raw.mime ?? ""),
      size: Number(raw.size) || 0,
      uploadedAt: String(raw.uploadedAt ?? new Date().toISOString()),
      duration: raw.duration == null ? null : Number(raw.duration),
      projection: raw.projection === "360" ? "360" : null,
      trimIn: Number(edit.trimIn) || 0,
      trimOut: edit.trimOut == null ? null : Number(edit.trimOut),
    });
    const ms = Array.isArray(edit.markers) ? edit.markers : [];
    for (const m of ms as Array<Record<string, unknown>>) {
      await db.insert(schema.markers).values({
        id: `${id}-${String(m.id)}`,
        mediaId: id,
        t: Number(m.t) || 0,
        end: m.end == null ? null : Number(m.end),
        label: String(m.label ?? ""),
        note: m.note == null ? null : String(m.note),
        by: m.by === "client" ? "client" : "admin",
        author: m.author == null ? null : String(m.author),
        createdAt: String(raw.uploadedAt ?? new Date().toISOString()),
      });
    }
  }
  // Leave the JSON file in place, renamed, as a safety backup
  await fs.rename(manifestPath, `${manifestPath}.imported`).catch(() => {});
}
