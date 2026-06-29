export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

// Lesson #8: CORS must explicitly cover the apex AND subdomains. ALLOWED_ORIGIN
// is comma-separated so we can list both without a regex that only matches one form.
export function corsHeaders(origin: string | null, allowedOrigins: string): Record<string, string> {
  if (!origin || !allowedOrigins) return {};
  const list = allowedOrigins.split(",").map((s) => s.trim());
  // Check exact match first (fastest path)
  if (list.includes(origin)) {
    return { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", vary: "origin" };
  }
  // Check subdomain of any listed apex
  for (const allowed of list) {
    try {
      const allowedHost = new URL(allowed).host;
      const originHost = new URL(origin).host;
      if (originHost.endsWith(`.${allowedHost}`)) {
        return { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", vary: "origin" };
      }
    } catch { /* skip invalid entries */ }
  }
  return {};
}
