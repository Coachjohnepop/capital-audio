import { kindFromMime } from "@/lib/media-shared";
import { registerCloudMedia } from "@/lib/media";
import { isCloudStore } from "@/lib/blob-store";

/**
 * After a client-side Blob upload, register metadata in the media library.
 * Body is small JSON — never the file bytes (avoids 413).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      title?: string;
      mime?: string;
      size?: number;
      blobUrl?: string;
      blobPathname?: string;
      filename?: string;
    };

    const id = String(body.id ?? "").trim();
    const blobUrl = String(body.blobUrl ?? "").trim();
    const mime = String(body.mime ?? "application/octet-stream");
    const size = Number(body.size) || 0;
    const kind = kindFromMime(mime) ?? (mime.startsWith("video") ? "video" : null);

    if (!id || !blobUrl) {
      return Response.json(
        { error: "id and blobUrl are required" },
        { status: 400 },
      );
    }
    if (!kind) {
      return Response.json(
        { error: `Unsupported type: ${mime}` },
        { status: 415 },
      );
    }

    // On local without cloud store, still allow registering if blob URL given
    // (e.g. CA_CLOUD_STORE=1). Otherwise reject.
    if (!isCloudStore() && process.env.CA_CLOUD_STORE !== "1") {
      // Local dev: client should use FormData POST /api/admin/media instead
      return Response.json(
        {
          error:
            "Cloud register only on Vercel. Locally use the standard import path.",
        },
        { status: 400 },
      );
    }

    const item = await registerCloudMedia({
      id,
      kind,
      title:
        String(body.title ?? "").trim() ||
        id,
      filename: String(body.filename ?? body.blobPathname ?? `${id}`),
      mime,
      size,
      blobUrl,
      blobPathname: String(body.blobPathname ?? ""),
    });

    return Response.json(item, { status: 201 });
  } catch (err) {
    console.error("[media register]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Register failed" },
      { status: 500 },
    );
  }
}
