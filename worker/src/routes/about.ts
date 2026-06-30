import type { Env } from "../lib/env";
import { json } from "../lib/http";
import { requireAdmin } from "../lib/auth";

export async function handleGetAbout(request: Request, env: Env): Promise<Response> {
  const raw = await env.CONFIG.get("about");
  if (!raw) return json({ title: "About YUMDs", body: "", updated_at: null });
  return json(JSON.parse(raw));
}

export async function handleAdminUpdateAbout(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { title, body } = await request.json() as { title?: string; body?: string };
  const payload = {
    title: title?.trim() || "About YUMDs",
    body:  body?.trim()  || "",
    updated_at: Date.now(),
  };
  await env.CONFIG.put("about", JSON.stringify(payload));
  return json({ ok: true });
}
