import type { Env } from "../lib/env";
import { checkBindings } from "../lib/env";
import { json } from "../lib/http";

export async function handleHealth(env: Env): Promise<Response> {
  const bindings = checkBindings(env);
  return json(
    { status: bindings.ok ? "ok" : "degraded", bindings },
    { status: bindings.ok ? 200 : 500 },
  );
}
