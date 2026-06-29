import type { Env } from "./lib/env";
import { corsHeaders, json } from "./lib/http";
import { handleHealth } from "./routes/health";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...cors, "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", "access-control-allow-headers": "content-type,authorization" },
      });
    }

    const url = new URL(request.url);
    let response: Response;

    if (url.pathname === "/api/health") {
      response = await handleHealth(env);
    } else {
      response = json({ error: "not found" }, { status: 404 });
    }

    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
    return response;
  },
};
