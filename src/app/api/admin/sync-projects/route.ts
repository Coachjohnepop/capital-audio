import { createSyncProject, listSyncProjects } from "@/lib/sync-projects";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ projects: await listSyncProjects() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const project = await createSyncProject(String(body.title ?? ""));
  return Response.json({ project }, { status: 201 });
}
