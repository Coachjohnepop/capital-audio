import { ADMIN_COOKIE, adminToken } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return Response.json({ ok: true, note: "auth disabled in dev" });
  }
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || body.password !== password) {
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  const token = await adminToken(password);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`,
    },
  });
}
