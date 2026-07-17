import { createReadStream, promises as fs } from "fs";
import { Readable } from "stream";
import { getFilePath, getMedia } from "@/lib/media";

type Ctx = { params: Promise<{ id: string }> };

/** Serves the raw media file with HTTP Range support so players can scrub. */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const item = await getMedia(id);
  if (!item) return new Response("Not found", { status: 404 });

  const filePath = getFilePath(item);
  let size: number;
  try {
    size = (await fs.stat(filePath)).size;
  } catch {
    return new Response("File missing on disk", { status: 404 });
  }

  const range = request.headers.get("range");
  const common = {
    "Content-Type": item.mime || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? parseInt(match[1], 10) : 0;
    const end = match?.[2] ? Math.min(parseInt(match[2], 10), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const stream = Readable.toWeb(
      createReadStream(filePath, { start, end })
    ) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        ...common,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    status: 200,
    headers: { ...common, "Content-Length": String(size) },
  });
}
