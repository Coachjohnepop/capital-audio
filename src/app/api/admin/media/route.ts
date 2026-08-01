import { listMedia, saveUpload } from "@/lib/media";
import { isCloudStore } from "@/lib/blob-store";

export const runtime = "nodejs";
/** Large multi-cam uploads need headroom on Vercel. */
export const maxDuration = 60;

export async function GET() {
  try {
    const items = await listMedia();
    return Response.json(items, {
      headers: {
        "x-ca-store": isCloudStore() ? "blob" : "local",
      },
    });
  } catch (err) {
    console.error("[media GET]", err);
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Failed to list media",
        store: isCloudStore() ? "blob" : "local",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  try {
    const item = await saveUpload(file);
    return Response.json(item, { status: 201 });
  } catch (err) {
    console.error("[media POST]", err);
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Upload failed",
        store: isCloudStore() ? "blob" : "local",
      },
      { status: 415 },
    );
  }
}
