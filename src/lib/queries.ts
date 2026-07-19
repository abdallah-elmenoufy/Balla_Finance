import { db } from "./db";
import type {
  AccountWithBalance,
  BnplInstallment,
  BnplPlan,
  Category,
  Currency,
  Person,
  PersonBalance,
  Txn,
} from "./types";

export function getCurrencies(): Currency[] {
  return db().prepare("SELECT * FROM currencies ORDER BY code").all() as Currency[];
}

export function getCurrency(code: string): Currency | undefined {
  return db().prepare("SELECT * FROM currencies WHERE code=?").get(code) as
    | Currency
    | undefined;
}

const BALANCE_SQL = `a.opening_balance
  + COALESCE((SELECT SUM(CASE t.type
      WHEN 'income' THEN t.amount
      WHEN 'person_in' THEN t.amount
      WHEN 'adjustment' THEN t.amount
      WHEN 'expense' THEN -t.amount
      WHEN 'person_out' THEN -t.amount
      WHEN 'transfer' THEN -t.amount
      ELSE 0 END) FROM transactions t WHERE t.account_id = a.id), 0)
  + COALESCE((SELECT SUM(t2.to_amount) FROM transactions t2 WHERE t2.type='transfer' AND t2.to_account_id = a.id), 0)`;

export function getAccounts(includeArchived = false): AccountWithBalance[] {
  const where = includeArchived ? "" : "WHERE a.archived = 0";
  return db()
    .prepare(
      `SELECT a.*, ${BALANCE_SQL} AS balance FROM accounts a ${where} ORDER BY a.sort_order, a.id`
    )
    .all() as AccountWithBalance[];
}

export function getAccount(id: number): AccountWithBalance | undefined {
  return db()
    .prepare(`SELECT a.*, ${BALANCE_SQL} AS balance FROM accounts a WHERE a.id = ?`)
    .get(id) as AccountWithBalance | undefined;
}

export function accountTxnCount(id: number): number {
  const r = db()
    .prepare(
      "SELECT COUNT(*) AS n FROM transactions WHERE account_id=? OR to_account_id=?"
    )
    .get(id, id) as { n: number };
  return r.n;
}

export function getPeople(includeArchived = false): Person[] {
  const where = includeArchived ? "" : "WHERE archived = 0";
  return db()
    .prepare(`SELECT * FROM people ${where} ORDER BY name`)
    .all() as Person[];
}

export function getPerson(id: number): Person | undefined {
  return db().prepare("SELECT * FROM people WHERE id=?").get(id) as Person | undefined;
}

export function personTxnCount(id: number): number {
  const r = db()
    .prepare("SELECT COUNT(*) AS n FROM transactions WHERE person_id=?")
    .get(id) as { n: number };
  return r.n;
}

/** Positive balance = I am holding their money (I owe them). Negative = they owe me. */
export function getPersonBalances(): PersonBalance[] {
  return db()
    .prepare(
      `SELECT person_id, person_currency AS currency,
        SUM(CASE type
          WHEN 'person_in' THEN person_amount
          WHEN 'person_out' THEN -person_amount
          WHEN 'expense' THEN -person_amount
          WHEN 'adjustment' THEN person_amount
          ELSE 0 END) AS balance
       FROM transactions
       WHERE person_id IS NOT NULL AND person_currency IS NOT NULL
       GROUP BY person_id, person_currency`
    )
    .all() as PersonBalance[];
}

export function getCategories(): Category[] {
  return db()
    .prepare("SELECT * FROM categories ORDER BY kind, sort_order, id")
    .all() as Category[];
}

export interface TxnRow extends Txn {
  account_name: string | null;
  account_currency: string | null;
  to_account_name: string | null;
  to_account_currency: string | null;
  person_name: string | null;
  category_name: string | null;
  category_emoji: string | null;
}

const TXN_SELECT = `SELECT t.*,
  a.name AS account_name, a.currency AS account_currency,
  b.name AS to_account_name, b.currency AS to_account_currency,
  p.name AS person_name,
  c.name AS category_name, c.emoji AS category_emoji
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  LEFT JOIN accounts b ON b.id = t.to_account_id
  LEFT JOIN people p ON p.id = t.person_id
  LEFT JOIN categories c ON c.id = t.category_id`;

export interface TxnFilters {
  month?: string; // YYYY-MM
  accountId?: number;
  personId?: number;
  type?: string;
}

export function getTxns(filters: TxnFilters = {}, limit = 300): TxnRow[] {
  const conds: string[] = [];
  const params: (string | number)[] = [];
  if (filters.month) {
    conds.push("t.date LIKE ?");
    params.push(`${filters.month}-%`);
  }
  if (filters.accountId) {
    conds.push("(t.account_id = ? OR t.to_account_id = ?)");
    params.push(filters.accountId, filters.accountId);
  }
  if (filters.personId) {
    conds.push("t.person_id = ?");
    params.push(filters.personId);
  }
  if (filters.type) {
    conds.push("t.type = ?");
    params.push(filters.type);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  return db()
    .prepare(`${TXN_SELECT} ${where} ORDER BY t.date DESC, t.id DESC LIMIT ?`)
    .all(...params, limit) as TxnRow[];
}

export function getTxn(id: number): TxnRow | undefined {
  return db().prepare(`${TXN_SELECT} WHERE t.id = ?`).get(id) as TxnRow | undefined;
}

export interface LedgerEntry {
  txn: TxnRow;
  delta: number;
  balance: number;
}

/** Ledger of an account, newest first, with running balance. */
export function accountLedger(accountId: number): LedgerEntry[] {
  const account = getAccount(accountId);
  if (!account) return [];
  const txns = db()
    .prepare(
      `${TXN_SELECT} WHERE t.account_id = ? OR (t.type='transfer' AND t.to_account_id = ?) ORDER BY t.date, t.id`
    )
    .all(accountId, accountId) as TxnRow[];
  let bal = account.opening_balance;
  const entries: LedgerEntry[] = [];
  for (const t of txns) {
    let delta = 0;
    if (t.account_id === accountId) {
      switch (t.type) {
        case "income":
        case "person_in":
          delta = t.amount;
          break;
        case "adjustment":
          delta = t.amount;
          break;
        case "expense":
        case "person_out":
        case "transfer":
          delta = -t.amount;
          break;
      }
    }
    if (t.type === "transfer" && t.to_account_id === accountId) {
      delta += t.to_amount ?? 0;
    }
    bal += delta;
    entries.push({ txn: t, delta, balance: bal });
  }
  entries.reverse();
  return entries;
}

/**
 * Person ledger entries oldest-first with per-currency running balance
 * (positive = I hold their money / I owe them).
 * `opening` seeds the running balances (used for statements with a from-date).
 */
export function personLedger(
  personId: number,
  from?: string,
  to?: string,
  opening?: Map<string, number>
): LedgerEntry[] {
  const conds = ["t.person_id = ?"];
  const params: (string | number)[] = [personId];
  if (from) {
    conds.push("t.date >= ?");
    params.push(from);
  }
  if (to) {
    conds.push("t.date <= ?");
    params.push(to);
  }
  const txns = db()
    .prepare(`${TXN_SELECT} WHERE ${conds.join(" AND ")} ORDER BY t.date, t.id`)
    .all(...params) as TxnRow[];
  const balances = new Map<string, number>(opening ?? []);
  const entries: LedgerEntry[] = [];
  for (const t of txns) {
    const cur = t.person_currency ?? "";
    const amt = t.person_amount ?? 0;
    let delta = 0;
    switch (t.type) {
      case "person_in":
        delta = amt;
        break;
      case "person_out":
      case "expense":
        delta = -amt;
        break;
      case "adjustment":
        delta = amt;
        break;
    }
    const bal = (balances.get(cur) ?? 0) + delta;
    balances.set(cur, bal);
    entries.push({ txn: t, delta, balance: bal });
  }
  return entries;
}

/** Balance of a person in each currency BEFORE the given date (for statement opening balance). */
export function personBalanceBefore(personId: number, date: string): Map<string, number> {
  const rows = db()
    .prepare(
      `SELECT person_currency AS currency,
        SUM(CASE type
          WHEN 'person_in' THEN person_amount
          WHEN 'person_out' THEN -person_amount
          WHEN 'expense' THEN -person_amount
          WHEN 'adjustment' THEN person_amount
          ELSE 0 END) AS balance
       FROM transactions WHERE person_id = ? AND date < ?
       GROUP BY person_currency`
    )
    .all(personId, date) as { currency: string; balance: number }[];
  return new Map(rows.map((r) => [r.currency, r.balance]));
}

// ---------- BNPL ----------

export interface PlanRow extends BnplPlan {
  account_name: string;
  currency: string;
  total: number;
  paid_count: number;
  paid_amount: number;
  next_due: string | null;
}

const PLAN_SELECT = `SELECT pl.*, a.name AS account_name, a.currency AS currency,
  (pl.principal + pl.fees_total) AS total,
  COALESCE((SELECT COUNT(*) FROM bnpl_installments i WHERE i.plan_id = pl.id AND i.status='paid'), 0) AS paid_count,
  COALESCE((SELECT SUM(i.amount) FROM bnpl_installments i WHERE i.plan_id = pl.id AND i.status='paid'), 0) AS paid_amount,
  (SELECT MIN(i.due_date) FROM bnpl_installments i WHERE i.plan_id = pl.id AND i.status='pending') AS next_due
  FROM bnpl_plans pl JOIN accounts a ON a.id = pl.account_id`;

export function getPlans(): PlanRow[] {
  return db()
    .prepare(`${PLAN_SELECT} ORDER BY next_due IS NULL, next_due, pl.id DESC`)
    .all() as PlanRow[];
}

export function getPlan(id: number): PlanRow | undefined {
  return db().prepare(`${PLAN_SELECT} WHERE pl.id = ?`).get(id) as PlanRow | undefined;
}

export function getInstallments(planId: number): BnplInstallment[] {
  return db()
    .prepare("SELECT * FROM bnpl_installments WHERE plan_id=? ORDER BY seq")
    .all(planId) as BnplInstallment[];
}

export interface DueInstallment extends BnplInstallment {
  plan_description: string;
  account_name: string;
  currency: string;
}

export function upcomingInstallments(withinDays = 30): DueInstallment[] {
  const limit = new Date(Date.now() + withinDays * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  return db()
    .prepare(
      `SELECT i.*, pl.description AS plan_description, a.name AS account_name, a.currency AS currency
       FROM bnpl_installments i
       JOIN bnpl_plans pl ON pl.id = i.plan_id
       JOIN accounts a ON a.id = pl.account_id
       WHERE i.status = 'pending' AND i.due_date <= ?
       ORDER BY i.due_date`
    )
    .all(limit) as DueInstallment[];
}

// ---------- Reports ----------

export interface CategoryTotal {
  category_name: string | null;
  category_emoji: string | null;
  currency: string;
  total: number;
  on_behalf: number;
}

export function monthlyByCategory(month: string): CategoryTotal[] {
  return db()
    .prepare(
      `SELECT c.name AS category_name, c.emoji AS category_emoji, a.currency AS currency,
        SUM(CASE WHEN t.person_id IS NULL THEN t.amount ELSE 0 END) AS total,
        SUM(CASE WHEN t.person_id IS NOT NULL THEN t.amount ELSE 0 END) AS on_behalf
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'expense' AND t.date LIKE ?
       GROUP BY c.id, a.currency
       ORDER BY total DESC`
    )
    .all(`${month}-%`) as CategoryTotal[];
}

export interface MonthTotals {
  currency: string;
  income: number;
  expense: number;
  on_behalf_out: number;
  amanah_in: number;
}

export function monthlyTotals(month: string): MonthTotals[] {
  return db()
    .prepare(
      `SELECT a.currency AS currency,
        SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) AS income,
        SUM(CASE WHEN t.type='expense' AND t.person_id IS NULL THEN t.amount ELSE 0 END) AS expense,
        SUM(CASE WHEN (t.type='expense' AND t.person_id IS NOT NULL) OR t.type='person_out' THEN t.amount ELSE 0 END) AS on_behalf_out,
        SUM(CASE WHEN t.type='person_in' THEN t.amount ELSE 0 END) AS amanah_in
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       WHERE t.date LIKE ?
       GROUP BY a.currency`
    )
    .all(`${month}-%`) as MonthTotals[];
}
