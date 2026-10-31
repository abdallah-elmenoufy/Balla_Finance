"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toMinor } from "@/lib/money";
import { getCurrency, personTxnCount } from "@/lib/queries";

export async function createPerson(formData: FormData): Promise<void> {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const initialCurrency = String(formData.get("initial_currency") ?? "EGP").trim() || "EGP";
  const dec = getCurrency(initialCurrency)?.decimals ?? 2;
  const initialDebtRaw = String(formData.get("initial_debt") ?? "").trim();
  const initialDebt = initialDebtRaw ? toMinor(initialDebtRaw, dec) : 0;
  if (!name) return;
  db()
    .prepare(
      "INSERT INTO people (name, note, initial_debt, initial_currency) VALUES (?,?,?,?)"
    )
    .run(name, note, initialDebt, initialCurrency);
  revalidatePath("/", "layout");
}

export async function updatePerson(id: number, formData: FormData): Promise<void> {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const initialCurrency = String(formData.get("initial_currency") ?? "EGP").trim() || "EGP";
  const dec = getCurrency(initialCurrency)?.decimals ?? 2;
  const initialDebtRaw = String(formData.get("initial_debt") ?? "").trim();
  const initialDebt = initialDebtRaw ? toMinor(initialDebtRaw, dec) : 0;
  if (!name) return;
  db()
    .prepare(
      "UPDATE people SET name=?, note=?, initial_debt=?, initial_currency=? WHERE id=?"
    )
    .run(name, note, initialDebt, initialCurrency, id);
  revalidatePath("/", "layout");
}

/** Archives if the person has ledger entries, hard-deletes if empty. */
export async function deletePerson(id: number): Promise<void> {
  await requireAuth();
  if (personTxnCount(id) > 0) {
    db().prepare("UPDATE people SET archived=1 WHERE id=?").run(id);
  } else {
    db().prepare("DELETE FROM people WHERE id=?").run(id);
  }
  revalidatePath("/", "layout");
}

export async function unarchivePerson(id: number): Promise<void> {
  await requireAuth();
  db().prepare("UPDATE people SET archived=0 WHERE id=?").run(id);
  revalidatePath("/", "layout");
}
