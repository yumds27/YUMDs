export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  CONFIG: KVNamespace;
  ALLOWED_ORIGIN: string;
  ADMIN_SECRET_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  DEEPSEEK_API_KEY?: string;
  CLAUDE_API_KEY?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
}

// Lesson #7 / #10: a missing binding or env var should fail loudly in a log
// and be visible at /api/health, not silently 500 per-request.
export function checkBindings(env: Env) {
  const required: Array<[string, unknown]> = [
    ["DB", env.DB],
    ["FILES", env.FILES],
    ["CONFIG", env.CONFIG],
    ["ALLOWED_ORIGIN", env.ALLOWED_ORIGIN],
  ];
  const optional: Array<[string, unknown]> = [
    ["ADMIN_SECRET_KEY", env.ADMIN_SECRET_KEY],
    ["STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY],
    ["STRIPE_WEBHOOK_SECRET", env.STRIPE_WEBHOOK_SECRET],
    ["DEEPSEEK_API_KEY", env.DEEPSEEK_API_KEY],
    ["CLAUDE_API_KEY", env.CLAUDE_API_KEY],
    ["GOOGLE_OAUTH_CLIENT_ID", env.GOOGLE_OAUTH_CLIENT_ID],
  ];

  const missingRequired = required.filter(([, v]) => v === undefined || v === null || v === "").map(([k]) => k);
  if (missingRequired.length > 0) {
    console.error(`[startup] missing required bindings: ${missingRequired.join(", ")}`);
  }

  return {
    required: required.map(([k, v]) => ({ name: k, present: v !== undefined && v !== null && v !== "" })),
    optional: optional.map(([k, v]) => ({ name: k, present: v !== undefined && v !== null && v !== "" })),
    ok: missingRequired.length === 0,
  };
}
