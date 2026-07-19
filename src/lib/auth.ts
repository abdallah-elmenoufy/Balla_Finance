import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { db } from "./db";

const COOKIE = "balla_session";
const SESSION_DAYS = 90;

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const h = crypto.scryptSync(pin, salt, 32).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function getPinHash(): string | null {
  const row = db()
    .prepare("SELECT value FROM settings WHERE key='pin_hash'")
    .get() as { value: string } | undefined;
  return row?.value ?? null;
}

export function setPinHash(hash: string): void {
  db()
    .prepare(
      "INSERT INTO settings (key, value) VALUES ('pin_hash', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
    )
    .run(hash);
}

export async function createSession(): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_DAYS * 24 * 3600 * 1000);
  db()
    .prepare("INSERT INTO sessions (token, created_at, expires_at) VALUES (?,?,?)")
    .run(token, now.toISOString(), exp.toISOString());
  db().prepare("DELETE FROM sessions WHERE expires_at < ?").run(now.toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: exp,
  });
}

export async function isAuthed(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const row = db()
    .prepare("SELECT token FROM sessions WHERE token=? AND expires_at > ?")
    .get(token, new Date().toISOString());
  return !!row;
}

/** Call at the top of every page and server action. */
export async function requireAuth(): Promise<void> {
  if (!getPinHash()) redirect("/setup");
  if (!(await isAuthed())) redirect("/login");
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token=?").run(token);
  c.delete(COOKIE);
}
