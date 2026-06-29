import type { Env } from "./lib/env";
import { corsHeaders, json } from "./lib/http";
import { handleHealth } from "./routes/health";
import {
  handleSignup, handleLogin, handleGoogleSignIn,
  handleVerifyEmail, handleForgotPassword, handleResetPassword,
  handleMe, handleAdminLogin,
} from "./routes/auth";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
          "access-control-allow-headers": "content-type,authorization",
        },
      });
    }

    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    let response: Response;

    if (pathname === "/api/health") {
      response = await handleHealth(env);
    } else if (pathname === "/api/auth/signup"       && method === "POST") { response = await handleSignup(request, env);
    } else if (pathname === "/api/auth/login"         && method === "POST") { response = await handleLogin(request, env);
    } else if (pathname === "/api/auth/google"        && method === "POST") { response = await handleGoogleSignIn(request, env);
    } else if (pathname === "/api/auth/verify-email"  && method === "GET")  { response = await handleVerifyEmail(request, env);
    } else if (pathname === "/api/auth/forgot-password" && method === "POST") { response = await handleForgotPassword(request, env);
    } else if (pathname === "/api/auth/reset-password"  && method === "POST") { response = await handleResetPassword(request, env);
    } else if (pathname === "/api/auth/me"            && method === "GET")  { response = await handleMe(request, env);
    } else if (pathname === "/api/admin/login"        && method === "POST") { response = await handleAdminLogin(request, env);
    } else {
      response = json({ error: "not found" }, { status: 404 });
    }

    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
    return response;
  },
};
