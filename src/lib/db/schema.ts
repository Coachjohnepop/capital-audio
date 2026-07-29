import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Drizzle schema — the single source of truth for the database.
 * Local dev uses a SQLite file (.data/capital-audio.db); production points
 * DATABASE_URL + DATABASE_AUTH_TOKEN at Turso. Same driver either way.
 */

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["video", "audio"] }).notNull(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  duration: real("duration"),
  projection: text("projection", { enum: ["flat", "360"] }),
  trimIn: real("trim_in").notNull().default(0),
  trimOut: real("trim_out"),
});

export const markers = sqliteTable("markers", {
  id: text("id").primaryKey(),
  mediaId: text("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  t: real("t").notNull(),
  end: real("end"),
  label: text("label").notNull(),
  note: text("note"),
  by: text("by", { enum: ["admin", "client"] }).notNull(),
  author: text("author"),
  createdAt: text("created_at").notNull(),
});

/**
 * Edit timelines (the "Edits" module). An edit project is an arrangement of
 * clips on tracks; every clip is a REFERENCE into a media-library file
 * (srcInMs..srcOutMs) — originals are never modified, and a saved timeline
 * doubles as the recipe a future server-side export job renders from.
 *
 * Plumbed beyond the current UI on purpose (multiple video tracks, speed,
 * opacity, per-clip effects) so pro features land without schema changes.
 */
export const editProjects = sqliteTable("edit_projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const editTracks = sqliteTable("edit_tracks", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => editProjects.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["video", "audio"] }).notNull(),
  name: text("name").notNull(),
  orderIdx: integer("order_idx").notNull().default(0),
  muted: integer("muted").notNull().default(0),
  locked: integer("locked").notNull().default(0),
  volume: real("volume").notNull().default(1),
});

export const editClips = sqliteTable("edit_clips", {
  id: text("id").primaryKey(),
  trackId: text("track_id")
    .notNull()
    .references(() => editTracks.id, { onDelete: "cascade" }),
  mediaId: text("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  /** Where the clip sits on the timeline. Video track 0 is magnetic — the
   *  app recomputes these so clips stay contiguous; audio clips float. */
  startMs: integer("start_ms").notNull().default(0),
  srcInMs: integer("src_in_ms").notNull().default(0),
  srcOutMs: integer("src_out_ms").notNull(),
  /** Playback rate; timeline duration = (srcOut - srcIn) / speed. */
  speed: real("speed").notNull().default(1),
  muted: integer("muted").notNull().default(0),
  gainDb: real("gain_db").notNull().default(0),
  opacity: real("opacity").notNull().default(1),
  fadeInMs: integer("fade_in_ms").notNull().default(0),
  fadeOutMs: integer("fade_out_ms").notNull().default(0),
  label: text("label").notNull().default(""),
});

/** Markers ride on a clip (offsetMs into the clip — they travel when the
 *  clip is rearranged); clipId NULL = a marker pinned to the timeline. */
export const editMarkers = sqliteTable("edit_markers", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => editProjects.id, { onDelete: "cascade" }),
  clipId: text("clip_id").references(() => editClips.id, {
    onDelete: "cascade",
  }),
  tMs: integer("t_ms").notNull(),
  label: text("label").notNull(),
  note: text("note"),
  color: text("color"),
  createdAt: text("created_at").notNull(),
});

/** Future transitions / filters / keyframes — params is a JSON document, so
 *  new effect kinds need no migration. No UI yet; the render path ignores
 *  kinds it doesn't know. */
export const editEffects = sqliteTable("edit_effects", {
  id: text("id").primaryKey(),
  clipId: text("clip_id")
    .notNull()
    .references(() => editClips.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  params: text("params").notNull().default("{}"),
  orderIdx: integer("order_idx").notNull().default(0),
});

export const syncProjects = sqliteTable("sync_projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  masterMediaId: text("master_media_id").references(() => media.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const syncAngles = sqliteTable("sync_angles", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => syncProjects.id, { onDelete: "cascade" }),
  mediaId: text("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  offsetMs: integer("offset_ms").notNull().default(0),
  position: integer("position").notNull().default(0),
});
