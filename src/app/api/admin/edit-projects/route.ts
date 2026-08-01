import { createEditProject, listEditProjects } from "@/lib/edit-projects";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ projects: await listEditProjects() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    mode?: "audio" | "audio-video";
  };
  const mode = body.mode === "audio" ? "audio" : "audio-video";
  const project = await createEditProject(String(body.title ?? ""), mode);
  return Response.json({ project }, { status: 201 });
}
