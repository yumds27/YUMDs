// Run after every deploy, before pointing real traffic at it (lesson #13).
// node scripts/smoke.mjs <base-url>

const base = process.argv[2] || "http://localhost:8787";

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   - ${name}`);
  } catch (err) {
    console.error(`FAIL - ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

await check("health check reports all bindings present", async () => {
  const res = await fetch(`${base}/api/health`);
  const body = await res.json();
  if (!res.ok) throw new Error(`status ${res.status}: ${JSON.stringify(body)}`);
  const missing = body.bindings.required.filter((b) => !b.present).map((b) => b.name);
  if (missing.length > 0) throw new Error(`missing bindings: ${missing.join(", ")}`);
});

// TODO as features land: signup+login round-trip, one gated endpoint
// (403 unsubscribed / 200 active), Stripe webhook signature validation,
// admin login.
