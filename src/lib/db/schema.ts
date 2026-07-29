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
