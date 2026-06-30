import type { Env } from "./env";

const API = "https://api.stripe.com/v1";

function stripeHeaders(env: Env) {
  return {
    "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

async function post(env: Env, path: string, body: Record<string, string>): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: stripeHeaders(env),
    body: new URLSearchParams(body).toString(),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe ${res.status}`);
  return data;
}

export async function createCheckoutSession(
  env: Env, studentId: number, email: string, customerId: string | null
): Promise<string> {
  const body: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": env.STRIPE_PRICE_ID!,
    "line_items[0][quantity]": "1",
    success_url: "https://yarmoukmds.com/dashboard?subscribed=1",
    cancel_url: "https://yarmoukmds.com/pricing",
    "metadata[student_id]": String(studentId),
    "subscription_data[metadata][student_id]": String(studentId),
  };
  if (customerId) body.customer = customerId;
  else body.customer_email = email;
  const session = await post(env, "/checkout/sessions", body);
  return session.url;
}

export async function createPortalSession(env: Env, customerId: string): Promise<string> {
  const session = await post(env, "/billing_portal/sessions", {
    customer: customerId,
    return_url: "https://yarmoukmds.com/dashboard",
  });
  return session.url;
}

export async function verifyWebhookSignature(secret: string, body: string, sigHeader: string): Promise<any> {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)]; })
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) throw new Error("missing stripe-signature fields");

  // Replay protection: reject if older than 5 minutes
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(t)) > 300) throw new Error("webhook too old");

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${body}`));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // Constant-time compare
  if (hex.length !== v1.length) throw new Error("signature mismatch");
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  if (diff !== 0) throw new Error("signature mismatch");

  return JSON.parse(body);
}
