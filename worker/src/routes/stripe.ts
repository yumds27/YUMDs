import type { Env } from "../lib/env";
import { json } from "../lib/http";
import { requireStudent, requireActiveSubscription } from "../lib/auth";
import { createCheckoutSession, createPortalSession, verifyWebhookSignature } from "../lib/stripe";

export async function handleCreateCheckout(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return json({ error: "payments not configured" }, { status: 503 });
  }
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });

  const sub = await env.DB.prepare(
    "SELECT stripe_customer_id, status FROM subscriptions WHERE student_id = ?"
  ).bind(student.sub).first<{ stripe_customer_id: string | null; status: string }>();

  if (sub?.status === "active") return json({ error: "already subscribed" }, { status: 400 });

  try {
    const url = await createCheckoutSession(env, student.sub, student.email, sub?.stripe_customer_id ?? null);
    return json({ url });
  } catch (e: any) {
    console.error("[stripe checkout]", e.message);
    return json({ error: "could not create checkout session" }, { status: 502 });
  }
}

export async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: "not configured" }, { status: 503 });

  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: any;
  try {
    event = await verifyWebhookSignature(env.STRIPE_WEBHOOK_SECRET, body, sig);
  } catch (e: any) {
    console.error("[stripe webhook] verification failed:", e.message);
    return json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    await handleEvent(env, event);
  } catch (e: any) {
    console.error("[stripe webhook] handler error:", e.message);
    // Return 200 so Stripe doesn't retry — log the error for investigation
  }
  return json({ ok: true });
}

async function handleEvent(env: Env, event: any) {
  const type: string = event.type;

  if (type === "checkout.session.completed") {
    const session = event.data.object;
    const studentId = parseInt(session.metadata?.student_id ?? "0");
    if (!studentId) return;
    await env.DB.prepare(`
      INSERT INTO subscriptions (student_id, stripe_customer_id, stripe_subscription_id, status, current_period_end)
      VALUES (?, ?, ?, 'active', NULL)
      ON CONFLICT(student_id) DO UPDATE SET
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        status = 'active'
    `).bind(studentId, session.customer, session.subscription).run();

  } else if (type === "customer.subscription.updated") {
    const sub = event.data.object;
    const studentId = parseInt(sub.metadata?.student_id ?? "0");
    const status = sub.status === "active" ? "active" : "inactive";
    if (studentId) {
      await env.DB.prepare(`
        UPDATE subscriptions SET status = ?, current_period_end = ?, stripe_subscription_id = ?
        WHERE student_id = ?
      `).bind(status, sub.current_period_end, sub.id, studentId).run();
    } else {
      await env.DB.prepare(`
        UPDATE subscriptions SET status = ?, current_period_end = ?
        WHERE stripe_subscription_id = ?
      `).bind(status, sub.current_period_end, sub.id).run();
    }

  } else if (type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await env.DB.prepare(`
      UPDATE subscriptions SET status = 'inactive', current_period_end = ?
      WHERE stripe_subscription_id = ?
    `).bind(sub.current_period_end, sub.id).run();
  }
}

export async function handleCreatePortal(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "payments not configured" }, { status: 503 });

  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });

  const sub = await env.DB.prepare(
    "SELECT stripe_customer_id FROM subscriptions WHERE student_id = ?"
  ).bind(student.sub).first<{ stripe_customer_id: string | null }>();

  if (!sub?.stripe_customer_id) return json({ error: "no subscription found" }, { status: 404 });

  try {
    const url = await createPortalSession(env, sub.stripe_customer_id);
    return json({ url });
  } catch (e: any) {
    console.error("[stripe portal]", e.message);
    return json({ error: "could not create portal session" }, { status: 502 });
  }
}

export async function handleSubscriptionStatus(request: Request, env: Env): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });

  const sub = await env.DB.prepare(
    "SELECT status, current_period_end FROM subscriptions WHERE student_id = ?"
  ).bind(student.sub).first<{ status: string; current_period_end: number | null }>();

  const active = sub?.status === "active";
  return json({ active, current_period_end: sub?.current_period_end ?? null });
}
