"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addMonths, toMinor, todayISO } from "@/lib/money";
import { getCurrency } from "@/lib/queries";

export async function createPlan(formData: FormData): Promise<void> {
  await requireAuth();
  const account_id = Number(formData.get("account_id"));
  const description = String(formData.get("description") ?? "").trim();
  const purchase_date = String(formData.get("purchase_date") ?? "").trim() || todayISO();
  const first_due_date = String(formData.get("first_due_date") ?? "").trim();
  const count = Number(formData.get("installment_count"));
  if (!account_id || !description || !first_due_date || !count || count < 1)
    throw new Error("Missing plan fields");

  const acc = db().prepare("SELECT currency FROM accounts WHERE id=?").get(account_id) as
    | { currency: string }
    | undefined;
  const dec = acc ? (getCurrency(acc.currency)?.decimals ?? 2) : 2;
  const principal = toMinor(String(formData.get("principal") ?? "0"), dec);
  const feesRaw = String(formData.get("fees_total") ?? "").trim();
  const fees_total = feesRaw ? toMinor(feesRaw, dec) : 0;
  const total = principal + fees_total;
  if (total <= 0) throw new Error("Amount must be positive");

  const d = db();
  const tx = d.transaction(() => {
    const purchase = d
      .prepare(
        `INSERT INTO transactions (type, date, description, account_id, category_id, amount)
         VALUES ('expense', ?, ?, ?, (SELECT id FROM categories WHERE name='أقساط' AND kind='expense' LIMIT 1), ?)`
      )
      .run(purchase_date, `${description} (BNPL)`, account_id, total);
    const plan = d
      .prepare(
        `INSERT INTO bnpl_plans (account_id, description, purchase_date, principal, fees_total, installment_count, first_due_date, purchase_transaction_id)
         VALUES (?,?,?,?,?,?,?,?)`
      )
      .run(account_id, description, purchase_date, principal, fees_total, count, first_due_date, purchase.lastInsertRowid);
    const per = Math.floor(total / count);
    const ins = d.prepare(
      "INSERT INTO bnpl_installments (plan_id, seq, due_date, amount) VALUES (?,?,?,?)"
    );

    // Check for custom schedule from form
    const customScheduleRaw = formData.get("custom_schedule_json");
    let customItems: { seq: number; due_date: string; amount: number }[] | null = null;
    if (customScheduleRaw) {
      try {
        const parsed = JSON.parse(String(customScheduleRaw)) as {
          seq: number;
          due_date: string;
          amount: string | number;
        }[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          customItems = parsed.map((item, idx) => ({
            seq: idx + 1,
            due_date: String(item.due_date).trim(),
            amount: toMinor(String(item.amount), dec),
          }));
        }
      } catch {}
    }

    if (customItems && customItems.length > 0) {
      for (const item of customItems) {
        ins.run(plan.lastInsertRowid, item.seq, item.due_date, item.amount);
      }
    } else {
      for (let i = 0; i < count; i++) {
        const amount = i === count - 1 ? total - per * (count - 1) : per;
        ins.run(plan.lastInsertRowid, i + 1, addMonths(first_due_date, i), amount);
      }
    }
  });
  tx();
  revalidatePath("/", "layout");
  redirect("/bnpl");
}

export async function updateInstallment(id: number, formData: FormData): Promise<void> {
  await requireAuth();
  const d = db();
  const inst = d
    .prepare(
      `SELECT i.*, a.currency FROM bnpl_installments i
       JOIN bnpl_plans pl ON pl.id = i.plan_id
       JOIN accounts a ON a.id = pl.account_id
       WHERE i.id=?`
    )
    .get(id) as { id: number; currency: string } | undefined;
  if (!inst) return;
  const dec = getCurrency(inst.currency)?.decimals ?? 2;
  const due_date = String(formData.get("due_date") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw ? toMinor(amountRaw, dec) : undefined;
  if (!due_date && amount === undefined) return;

  if (due_date && amount !== undefined) {
    d.prepare("UPDATE bnpl_installments SET due_date=?, amount=? WHERE id=?").run(
      due_date,
      amount,
      id
    );
  } else if (due_date) {
    d.prepare("UPDATE bnpl_installments SET due_date=? WHERE id=?").run(due_date, id);
  } else if (amount !== undefined) {
    d.prepare("UPDATE bnpl_installments SET amount=? WHERE id=?").run(amount, id);
  }
  revalidatePath("/", "layout");
}

export async function payInstallment(formData: FormData): Promise<void> {
  await requireAuth();
  const installment_id = Number(formData.get("installment_id"));
  const funding_account_id = Number(formData.get("funding_account_id"));
  const date = String(formData.get("date") ?? "").trim() || todayISO();
  if (!installment_id || !funding_account_id) throw new Error("Missing fields");

  const d = db();
  const inst = d
    .prepare(
      `SELECT i.*, pl.account_id AS bnpl_account_id, pl.description AS plan_description
       FROM bnpl_installments i JOIN bnpl_plans pl ON pl.id = i.plan_id WHERE i.id=?`
    )
    .get(installment_id) as
    | { id: number; amount: number; seq: number; status: string; bnpl_account_id: number; plan_description: string }
    | undefined;
  if (!inst || inst.status === "paid") return;

  const tx = d.transaction(() => {
    const payment = d
      .prepare(
        `INSERT INTO transactions (type, date, description, account_id, to_account_id, amount, to_amount)
         VALUES ('transfer', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        date,
        `قسط ${inst.seq} — ${inst.plan_description}`,
        funding_account_id,
        inst.bnpl_account_id,
        inst.amount,
        inst.amount
      );
    d.prepare(
      "UPDATE bnpl_installments SET status='paid', paid_transaction_id=? WHERE id=?"
    ).run(payment.lastInsertRowid, installment_id);
  });
  tx();
  revalidatePath("/", "layout");
}

export async function undoInstallment(id: number): Promise<void> {
  await requireAuth();
  const d = db();
  const inst = d
    .prepare("SELECT paid_transaction_id FROM bnpl_installments WHERE id=?")
    .get(id) as { paid_transaction_id: number | null } | undefined;
  if (!inst) return;
  const tx = d.transaction(() => {
    d.prepare(
      "UPDATE bnpl_installments SET status='pending', paid_transaction_id=NULL WHERE id=?"
    ).run(id);
    if (inst.paid_transaction_id)
      d.prepare("DELETE FROM transactions WHERE id=?").run(inst.paid_transaction_id);
  });
  tx();
  revalidatePath("/", "layout");
}

/** Deletes the plan, its installments, the purchase transaction and any payment transactions. */
export async function deletePlan(id: number): Promise<void> {
  await requireAuth();
  const d = db();
  const plan = d
    .prepare("SELECT purchase_transaction_id FROM bnpl_plans WHERE id=?")
    .get(id) as { purchase_transaction_id: number | null } | undefined;
  if (!plan) return;
  const payments = d
    .prepare(
      "SELECT paid_transaction_id AS tid FROM bnpl_installments WHERE plan_id=? AND paid_transaction_id IS NOT NULL"
    )
    .all(id) as { tid: number }[];
  const tx = d.transaction(() => {
    d.prepare("DELETE FROM bnpl_installments WHERE plan_id=?").run(id);
    d.prepare("DELETE FROM bnpl_plans WHERE id=?").run(id);
    for (const p of payments)
      d.prepare("DELETE FROM transactions WHERE id=?").run(p.tid);
    if (plan.purchase_transaction_id)
      d.prepare("DELETE FROM transactions WHERE id=?").run(plan.purchase_transaction_id);
  });
  tx();
  revalidatePath("/", "layout");
  redirect("/bnpl");
}
