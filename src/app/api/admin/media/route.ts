import { listMedia, saveUpload } from "@/lib/media";

export async function GET() {
  return Response.json(await listMedia());
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
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 415 }
    );
  }
}
