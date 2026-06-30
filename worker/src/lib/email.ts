import type { Env } from "./env";

const FROM = "YarmoukMDS <noreply@yarmoukmds.com>";
const BASE_URL = "https://yarmoukmds.com";

async function send(env: Env, to: string, subject: string, html: string, text: string) {
  if (!env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — skipping send to ${to}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[email] Resend error ${res.status} for ${to}: ${err}`);
  }
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
