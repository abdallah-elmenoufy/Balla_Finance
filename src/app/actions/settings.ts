"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function addCurrency(formData: FormData): Promise<void> {
  await requireAuth();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim() || code;
  const decimals = Number(formData.get("decimals") ?? 2);
  if (!code || !name) return;
  db()
    .prepare(
      "INSERT INTO currencies (code, name, symbol, decimals) VALUES (?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, symbol=excluded.symbol, decimals=excluded.decimals"
    )
    .run(code, name, symbol, decimals);
  revalidatePath("/", "layout");
}

export async function deleteCurrency(code: string): Promise<void> {
  await requireAuth();
  const used = db()
    .prepare(
      "SELECT (SELECT COUNT(*) FROM accounts WHERE currency=?) + (SELECT COUNT(*) FROM transactions WHERE person_currency=?) AS n"
    )
    .get(code, code) as { n: number };
  if (used.n > 0) return;
  db().prepare("DELETE FROM currencies WHERE code=?").run(code);
  revalidatePath("/", "layout");
}
