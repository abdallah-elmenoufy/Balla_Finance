"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  getPinHash,
  hashPin,
  requireAuth,
  setPinHash,
  verifyPin,
} from "@/lib/auth";

export interface AuthState {
  error?: string;
}

export async function setupPin(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (getPinHash()) redirect("/login");
  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (pin.length < 4) return { error: "PIN must be at least 4 digits" };
  if (pin !== confirm) return { error: "PINs do not match" };
  setPinHash(hashPin(pin));
  await createSession();
  redirect("/");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const hash = getPinHash();
  if (!hash) redirect("/setup");
  const pin = String(formData.get("pin") ?? "");
  if (!verifyPin(pin, hash)) return { error: "Wrong PIN" };
  await createSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function changePin(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  await requireAuth();
  const current = String(formData.get("current") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const hash = getPinHash();
  if (!hash || !verifyPin(current, hash)) return { error: "Current PIN is wrong" };
  if (pin.length < 4) return { error: "New PIN must be at least 4 digits" };
  if (pin !== confirm) return { error: "New PINs do not match" };
  setPinHash(hashPin(pin));
  return { error: "✓ PIN changed" };
}
