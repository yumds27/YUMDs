const PBKDF2_ITERS = 100_000;
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function _pbkdf2(pw: string, salt: Uint8Array, iters: number): Promise<string> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iters, hash: "SHA-256" }, km, 256);
  return b64(bits);
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await _pbkdf2(pw, salt, PBKDF2_ITERS);
  return `pbkdf2$${PBKDF2_ITERS}$${b64(salt.buffer as ArrayBuffer)}$${hash}`;
}

export async function checkPassword(pw: string, stored: string): Promise<boolean> {
  if (typeof stored !== "string" || !stored.startsWith("pbkdf2$")) return false;
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const iters = parseInt(parts[1], 10) || PBKDF2_ITERS;
  let salt: Uint8Array;
  try { salt = unb64(parts[2]); } catch { return false; }
  const computed = await _pbkdf2(pw, salt, iters);
  // Constant-time compare to avoid timing attacks
  if (computed.length !== parts[3].length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ parts[3].charCodeAt(i);
  return diff === 0;
}
