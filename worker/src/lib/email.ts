import type { Env } from "./env";

const FROM = { email: "noreply@yarmoukmds.com", name: "YarmoukMDS" };
const BASE_URL = "https://yarmoukmds.com";

async function send(env: Env, to: string, subject: string, html: string, text: string) {
  if (!env.EMAIL) {
    // Email sending not yet enabled. Enable via:
    // npx wrangler email sending enable yarmoukmds.com
    // Then add: [[send_email]] name = "EMAIL"  to wrangler.toml
    console.warn(`[email] EMAIL binding not configured — skipping send to ${to}`);
    return;
  }
  await (env.EMAIL as { send: (o: unknown) => Promise<void> }).send({ to, from: FROM, subject, html, text });
}

export async function sendVerificationEmail(env: Env, to: string, token: string) {
  const url = `${BASE_URL}/verify-email?token=${token}`;
  await send(env, to, "Verify your YarmoukMDS email",
    `<p>Welcome to YarmoukMDS! Click below to verify your email address:</p><p><a href="${url}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
    `Verify your YarmoukMDS email:\n${url}\n\nThis link expires in 24 hours.`,
  );
}

export async function sendPasswordResetEmail(env: Env, to: string, token: string) {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  await send(env, to, "Reset your YarmoukMDS password",
    `<p>Click below to reset your password:</p><p><a href="${url}">Reset password</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    `Reset your YarmoukMDS password:\n${url}\n\nThis link expires in 1 hour.`,
  );
}
