export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

// Lesson #8: a CORS allowlist that only matched subdomains broke the apex
// domain rollout in JUMED. Test both https://example.com and
// https://www.example.com / https://api.example.com explicitly.
export function corsHeaders(origin: string | null, allowedOrigin: string): Record<string, string> {
  if (!origin || !allowedOrigin) return {};
  const allowedHost = new URL(allowedOrigin).host;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return {};
  }
  const isApex = originHost === allowedHost;
  const isSubdomain = originHost.endsWith(`.${allowedHost}`);
  if (!isApex && !isSubdomain) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "vary": "origin",
  };
}
