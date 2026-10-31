"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toMinor } from "@/lib/money";
import { accountTxnCount, getCurrency } from "@/lib/queries";

function parseAccountForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "other");
  const currency = String(formData.get("currency") ?? "EGP");
  const dec = getCurrency(currency)?.decimals ?? 2;
  const openingRaw = String(formData.get("opening_balance") ?? "").trim();
  const opening = openingRaw ? toMinor(openingRaw, dec) : 0;
  const creditRaw = String(formData.get("credit_limit") ?? "").trim();
  const credit_limit = creditRaw ? toMinor(creditRaw, dec) : null;
  const dueRaw = String(formData.get("due_day") ?? "").trim();
  const due_day = dueRaw ? Math.min(31, Math.max(1, Number(dueRaw))) : null;
  const statementRaw = String(formData.get("statement_day") ?? "").trim();
  const statement_day = statementRaw ? Math.min(31, Math.max(1, Number(statementRaw))) : null;
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  return { name, type, currency, opening, credit_limit, due_day, statement_day, emoji };
}

export async function createAccount(formData: FormData): Promise<void> {
  await requireAuth();
  const f = parseAccountForm(formData);
  if (!f.name) return;
  db()
    .prepare(
      "INSERT INTO accounts (name, type, currency, opening_balance, credit_limit, due_day, statement_day, emoji) VALUES (?,?,?,?,?,?,?,?)"
    )
    .run(f.name, f.type, f.currency, f.opening, f.credit_limit, f.due_day, f.statement_day, f.emoji);
  revalidatePath("/", "layout");
}

export async function updateAccount(id: number, formData: FormData): Promise<void> {
  await requireAuth();
  const f = parseAccountForm(formData);
  if (!f.name) return;
  db()
    .prepare(
      "UPDATE accounts SET name=?, type=?, currency=?, opening_balance=?, credit_limit=?, due_day=?, statement_day=?, emoji=? WHERE id=?"
    )
    .run(f.name, f.type, f.currency, f.opening, f.credit_limit, f.due_day, f.statement_day, f.emoji, id);
  revalidatePath("/", "layout");
}

/** Archives if the account has transactions, hard-deletes if empty. */
export async function deleteAccount(id: number): Promise<void> {
  await requireAuth();
  if (accountTxnCount(id) > 0) {
    db().prepare("UPDATE accounts SET archived=1 WHERE id=?").run(id);
  } else {
    db().prepare("DELETE FROM accounts WHERE id=?").run(id);
  }
  revalidatePath("/", "layout");
}

export async function unarchiveAccount(id: number): Promise<void> {
  await requireAuth();
  db().prepare("UPDATE accounts SET archived=0 WHERE id=?").run(id);
  revalidatePath("/", "layout");
}
