"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toMinor, todayISO } from "@/lib/money";
import { getCurrency } from "@/lib/queries";

interface ParsedTxn {
  type: string;
  date: string;
  description: string | null;
  account_id: number | null;
  to_account_id: number | null;
  person_id: number | null;
  category_id: number | null;
  amount: number;
  to_amount: number | null;
  person_amount: number | null;
  person_currency: string | null;
  payee: string | null;
  notes: string | null;
}

function num(formData: FormData, key: string): number | null {
  const v = String(formData.get(key) ?? "").trim();
  return v ? Number(v) : null;
}

function accountCurrency(accountId: number | null): string | null {
  if (!accountId) return null;
  const row = db().prepare("SELECT currency FROM accounts WHERE id=?").get(accountId) as
    | { currency: string }
    | undefined;
  return row?.currency ?? null;
}

function parseTxnForm(formData: FormData): ParsedTxn {
  const type = String(formData.get("type") ?? "expense");
  const date = String(formData.get("date") ?? "").trim() || todayISO();
  const description = String(formData.get("description") ?? "").trim() || null;
  const payee = String(formData.get("payee") ?? "").trim() || null;
  let notes = String(formData.get("notes") ?? "").trim() || null;
  const exchangeRateRaw = String(formData.get("exchange_rate") ?? "").trim();
  const exchangeRate = exchangeRateRaw ? Number(exchangeRateRaw) : null;
  const account_id = num(formData, "account_id");
  const to_account_id = num(formData, "to_account_id");
  let person_id = num(formData, "person_id");
  const category_id = num(formData, "category_id");

  const accCur = accountCurrency(account_id);
  const accDec = accCur ? (getCurrency(accCur)?.decimals ?? 2) : 2;

  const amountRaw = String(formData.get("amount") ?? "").trim();
  let amount = amountRaw ? toMinor(amountRaw, accDec) : 0;

  let to_amount: number | null = null;
  let person_amount: number | null = null;
  let person_currency: string | null = null;

  if (type === "transfer") {
    if (!account_id || !to_account_id) throw new Error("Transfer needs both accounts");
    if (account_id === to_account_id) throw new Error("Cannot transfer to the same account");
    const toCur = accountCurrency(to_account_id);
    const toDec = toCur ? (getCurrency(toCur)?.decimals ?? 2) : 2;
    const toRaw = String(formData.get("to_amount") ?? "").trim();
    to_amount = toRaw ? toMinor(toRaw, toDec) : amount;
    person_id = null;
  }

  if (type === "person_in" || type === "person_out" || (type === "expense" && person_id)) {
    if (type !== "expense" && !person_id) throw new Error("Choose a person");
    if (person_id) {
      person_currency =
        String(formData.get("person_currency") ?? "").trim() || accCur || "EGP";
      const pDec = getCurrency(person_currency)?.decimals ?? 2;
      const pRaw = String(formData.get("person_amount") ?? "").trim();
      person_amount = pRaw ? toMinor(pRaw, pDec) : person_currency === accCur ? amount : null;
      if (person_amount === null && exchangeRate && exchangeRate > 0 && amount > 0) {
        // e.g. amount in EGP, debt in USD => USD amount = EGP / rate
        const pUnits = (amount / 10 ** accDec) / exchangeRate;
        person_amount = Math.round(pUnits * 10 ** pDec);
      }
      if (person_amount === null)
        throw new Error("Enter the amount in the person's currency");

      if (exchangeRate && exchangeRate > 0 && person_currency !== accCur) {
        const rateNote = `سعر التحويل: 1 ${person_currency} = ${exchangeRate} ${accCur ?? "EGP"}`;
        notes = notes ? `${notes} • ${rateNote}` : rateNote;
      }
    }
  }

  if (type === "adjustment") {
    const target = String(formData.get("adjust_target") ?? "account");
    if (target === "person") {
      if (!person_id) throw new Error("Choose a person");
      person_currency = String(formData.get("person_currency") ?? "EGP").trim() || "EGP";
      const pDec = getCurrency(person_currency)?.decimals ?? 2;
      const pRaw = String(formData.get("person_amount") ?? "").trim();
      if (!pRaw) throw new Error("Enter the adjustment amount");
      person_amount = toMinor(pRaw, pDec);
      amount = 0;
      return {
        type, date, description, account_id: null, to_account_id: null,
        person_id, category_id: null, amount, to_amount: null,
        person_amount, person_currency, payee, notes,
      };
    }
    if (!account_id) throw new Error("Choose an account");
    person_id = null;
  }

  if (type !== "adjustment" && amount <= 0) throw new Error("Amount must be positive");
  if ((type === "income" || type === "expense" || type === "person_in" || type === "person_out") && !account_id)
    throw new Error("Choose an account");

  return {
    type, date, description, account_id, to_account_id: type === "transfer" ? to_account_id : null,
    person_id, category_id: type === "income" || type === "expense" ? category_id : null,
    amount, to_amount, person_amount, person_currency, payee, notes,
  };
}

export async function createTxn(formData: FormData): Promise<void> {
  await requireAuth();
  const t = parseTxnForm(formData);
  db()
    .prepare(
      `INSERT INTO transactions (type, date, description, account_id, to_account_id, person_id, category_id, amount, to_amount, person_amount, person_currency, payee, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      t.type, t.date, t.description, t.account_id, t.to_account_id, t.person_id,
      t.category_id, t.amount, t.to_amount, t.person_amount, t.person_currency,
      t.payee, t.notes
    );
  revalidatePath("/", "layout");
  let back = String(formData.get("redirect_to") ?? "").trim();
  if (back) {
    if (t.type === "person_out" || (t.type === "expense" && t.person_id)) {
      const sep = back.includes("?") ? "&" : "?";
      const aCur = accountCurrency(t.account_id) || "EGP";
      const pAmt = t.person_amount ?? t.amount;
      const pCur = t.person_currency || aCur;
      back = `${back}${sep}celebrate=debt_repaid&amount=${t.amount}&currency=${aCur}&person_amount=${pAmt}&person_currency=${pCur}`;
    } else if (t.type === "person_in" && t.person_id) {
      const sep = back.includes("?") ? "&" : "?";
      const aCur = accountCurrency(t.account_id) || "EGP";
      const pAmt = t.person_amount ?? t.amount;
      const pCur = t.person_currency || aCur;
      back = `${back}${sep}celebrate=receivable_collected&amount=${t.amount}&currency=${aCur}&person_amount=${pAmt}&person_currency=${pCur}`;
    } else if (t.type === "transfer" && t.to_account_id) {
      const toAcc = db().prepare("SELECT type FROM accounts WHERE id=?").get(t.to_account_id) as { type: string } | undefined;
      if (toAcc?.type === "credit_card") {
        const sep = back.includes("?") ? "&" : "?";
        back = `${back}${sep}celebrate=card_paid&amount=${t.amount}`;
      }
    }
    redirect(back);
  }
}

export async function updateTxn(id: number, formData: FormData): Promise<void> {
  await requireAuth();
  const t = parseTxnForm(formData);
  db()
    .prepare(
      `UPDATE transactions SET type=?, date=?, description=?, account_id=?, to_account_id=?, person_id=?, category_id=?, amount=?, to_amount=?, person_amount=?, person_currency=?, payee=?, notes=? WHERE id=?`
    )
    .run(
      t.type, t.date, t.description, t.account_id, t.to_account_id, t.person_id,
      t.category_id, t.amount, t.to_amount, t.person_amount, t.person_currency,
      t.payee, t.notes, id
    );
  revalidatePath("/", "layout");
  const back = String(formData.get("redirect_to") ?? "").trim();
  redirect(back || "/transactions");
}

export async function deleteTxn(id: number): Promise<void> {
  await requireAuth();
  const d = db();
  const purchase = d
    .prepare("SELECT id FROM bnpl_plans WHERE purchase_transaction_id=?")
    .get(id);
  if (purchase) throw new Error("This is a BNPL purchase — delete the plan instead");
  d.prepare(
    "UPDATE bnpl_installments SET status='pending', paid_transaction_id=NULL WHERE paid_transaction_id=?"
  ).run(id);
  d.prepare("DELETE FROM transactions WHERE id=?").run(id);
  revalidatePath("/", "layout");
}
