import { execSync } from "child_process";
import { webcrypto } from "crypto";

const [email, password] = process.argv.slice(2);
if (!email || !password) { console.error("Usage: node create-admin.mjs <email> <password>"); process.exit(1); }

const enc = new TextEncoder();
const saltBytes = webcrypto.getRandomValues(new Uint8Array(16));
const salt = Buffer.from(saltBytes).toString("base64");
const keyMaterial = await webcrypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await webcrypto.subtle.deriveBits(
  { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 100000 }, keyMaterial, 256
);
const hash = Buffer.from(bits).toString("base64");
const passwordHash = `pbkdf2$100000$${salt}$${hash}`;

const sql = `INSERT INTO admins (email, password_hash) VALUES ('${email}', '${passwordHash}')`;
console.log("Inserting admin:", email);
execSync(`npx wrangler d1 execute yarmoukmds-db --remote --command "${sql}"`, { cwd: "worker", stdio: "inherit" });
console.log("Done! Admin created.");
