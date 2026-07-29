import { createEditProject, listEditProjects } from "@/lib/edit-projects";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ projects: await listEditProjects() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const project = await createEditProject(String(body.title ?? ""));
  return Response.json({ project }, { status: 201 });
}
