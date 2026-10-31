import { db } from "./db";
import type {
  AccountWithBalance,
  AnalyticsData,
  AnalyticsInterval,
  BnplInstallment,
  BnplPlan,
  Category,
  CreditCardStatus,
  Currency,
  OverallDebtSummary,
  OverallReceivableSummary,
  Person,
  PersonBalance,
  PersonDebtSummary,
  PersonReceivableSummary,
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

/** Positive balance = I owe them (دين عليا واجب السداد). Negative = they owe me. */
export function getPersonBalances(): PersonBalance[] {
  const people = getPeople(true);
  const rows = db()
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
    .all() as { person_id: number; currency: string; balance: number }[];

  const map = new Map<string, number>();
  for (const p of people) {
    if (p.initial_debt > 0) {
      const key = `${p.id}:${p.initial_currency || "EGP"}`;
      const sign = p.initial_type === "receivable" ? -1 : 1;
      map.set(key, sign * p.initial_debt);
    }
  }
  for (const r of rows) {
    const key = `${r.person_id}:${r.currency}`;
    map.set(key, (map.get(key) ?? 0) + r.balance);
  }

  const result: PersonBalance[] = [];
  for (const [key, balance] of map.entries()) {
    const [pid, currency] = key.split(":");
    result.push({ person_id: Number(pid), currency, balance });
  }
  return result;
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
  const person = getPerson(personId);
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
  if (!opening && person && person.initial_debt > 0) {
    const sign = person.initial_type === "receivable" ? -1 : 1;
    balances.set(person.initial_currency || "EGP", sign * person.initial_debt);
  }
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
  const person = getPerson(personId);
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
  const map = new Map<string, number>();
  if (person && person.initial_debt > 0) {
    const sign = person.initial_type === "receivable" ? -1 : 1;
    map.set(person.initial_currency || "EGP", sign * person.initial_debt);
  }
  for (const r of rows) {
    map.set(r.currency, (map.get(r.currency) ?? 0) + r.balance);
  }
  return map;
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

export const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export interface MonthlyInstallmentGroup {
  month: string;
  label: string;
  totalDue: number;
  totalPaid: number;
  currency: string;
  installments: (BnplInstallment & {
    plan_description: string;
    account_name: string;
    currency: string;
  })[];
}

export function getMonthlyInstallmentsSchedule(): MonthlyInstallmentGroup[] {
  const rows = db()
    .prepare(
      `SELECT i.*, pl.description AS plan_description, a.name AS account_name, a.currency AS currency
       FROM bnpl_installments i
       JOIN bnpl_plans pl ON pl.id = i.plan_id
       JOIN accounts a ON a.id = pl.account_id
       ORDER BY i.due_date, i.id`
    )
    .all() as (BnplInstallment & { plan_description: string; account_name: string; currency: string })[];

  const map = new Map<string, typeof rows>();
  for (const r of rows) {
    const month = r.due_date.slice(0, 7);
    if (!map.has(month)) map.set(month, []);
    map.get(month)!.push(r);
  }

  const groups: MonthlyInstallmentGroup[] = [];
  for (const [month, items] of map.entries()) {
    const cur = items[0]?.currency || "EGP";
    const totalDue = items.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.amount, 0);
    const totalPaid = items.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
    const [y, m] = month.split("-");
    const mNum = Number(m) - 1;
    const arabicMonth = ARABIC_MONTHS[mNum] || month;
    groups.push({
      month,
      label: `${arabicMonth} ${y}`,
      totalDue,
      totalPaid,
      currency: cur,
      installments: items,
    });
  }

  return groups.sort((a, b) => a.month.localeCompare(b.month));
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

// ---------- Debt Management (الأمانات والديون العائلية) ----------

export function getPersonDebtSummaries(): PersonDebtSummary[] {
  const people = getPeople().filter((p) => p.initial_type !== "receivable");
  const result: PersonDebtSummary[] = [];

  for (const p of people) {
    const cur = p.initial_currency || "EGP";
    const initial = p.initial_debt || 0;

    const addRow = db()
      .prepare(
        `SELECT SUM(person_amount) AS total FROM transactions
         WHERE person_id = ? AND person_currency = ? AND type IN ('person_in', 'adjustment') AND person_amount > 0`
      )
      .get(p.id, cur) as { total: number | null };
    const additional = addRow?.total ?? 0;

    const repayRow = db()
      .prepare(
        `SELECT SUM(person_amount) AS total FROM transactions
         WHERE person_id = ? AND person_currency = ? AND (type = 'person_out' OR (type = 'expense' AND person_id IS NOT NULL))`
      )
      .get(p.id, cur) as { total: number | null };
    const repaid = repayRow?.total ?? 0;

    const total_debt_original = initial + additional;
    const remaining = Math.max(0, total_debt_original - repaid);
    const progress =
      total_debt_original > 0
        ? Math.min(100, Math.round((repaid / total_debt_original) * 100))
        : repaid > 0
          ? 100
          : 0;
    const is_settled = remaining === 0 && total_debt_original > 0;

    result.push({
      person_id: p.id,
      name: p.name,
      note: p.note,
      currency: cur,
      initial_debt: initial,
      additional_debt: additional,
      total_debt_original,
      repaid,
      remaining,
      progress,
      is_settled,
    });
  }

  return result.sort((a, b) => {
    if (a.is_settled !== b.is_settled) return a.is_settled ? 1 : -1;
    return b.remaining - a.remaining;
  });
}

export function getOverallDebtSummary(targetCurrency = "EGP"): OverallDebtSummary {
  const summaries = getPersonDebtSummaries().filter((s) => s.currency === targetCurrency);
  let total_debt_original = 0;
  let total_repaid = 0;
  let total_remaining = 0;
  let active_debts_count = 0;
  let settled_debts_count = 0;

  for (const s of summaries) {
    total_debt_original += s.total_debt_original;
    total_repaid += s.repaid;
    total_remaining += s.remaining;
    if (s.total_debt_original > 0) {
      if (s.is_settled) settled_debts_count++;
      else active_debts_count++;
    }
  }

  const overall_progress =
    total_debt_original > 0
      ? Math.min(100, Math.round((total_repaid / total_debt_original) * 100))
      : 0;

  return {
    currency: targetCurrency,
    total_debt_original,
    total_repaid,
    total_remaining,
    overall_progress,
    active_debts_count,
    settled_debts_count,
  };
}

export function getOverallDebtSummaries(): OverallDebtSummary[] {
  const summaries = getPersonDebtSummaries();
  const currencies = Array.from(new Set(summaries.map((s) => s.currency || "EGP")));
  if (currencies.length === 0) currencies.push("EGP");
  return currencies.map((c) => getOverallDebtSummary(c));
}

// ---------- Receivables Management (أموال مستحقة لك بالخارج / فلوس ليا برة) ----------

export function getPersonReceivableSummaries(): PersonReceivableSummary[] {
  const people = getPeople().filter((p) => p.initial_type === "receivable");
  const result: PersonReceivableSummary[] = [];

  for (const p of people) {
    const cur = p.initial_currency || "EGP";
    const initial = p.initial_debt || 0;

    // Money lent to them / paid on their behalf
    const addRow = db()
      .prepare(
        `SELECT SUM(person_amount) AS total FROM transactions
         WHERE person_id = ? AND person_currency = ? AND (type = 'person_out' OR (type = 'expense' AND person_id IS NOT NULL))`
      )
      .get(p.id, cur) as { total: number | null };
    const additional_lent = addRow?.total ?? 0;

    // Money collected / received back from them
    const collectRow = db()
      .prepare(
        `SELECT SUM(person_amount) AS total FROM transactions
         WHERE person_id = ? AND person_currency = ? AND type = 'person_in'`
      )
      .get(p.id, cur) as { total: number | null };
    const collected = collectRow?.total ?? 0;

    const total_receivable_original = initial + additional_lent;
    const remaining = Math.max(0, total_receivable_original - collected);
    const progress =
      total_receivable_original > 0
        ? Math.min(100, Math.round((collected / total_receivable_original) * 100))
        : collected > 0
          ? 100
          : 0;
    const is_settled = remaining === 0 && total_receivable_original > 0;

    result.push({
      person_id: p.id,
      name: p.name,
      note: p.note,
      currency: cur,
      initial_receivable: initial,
      additional_lent,
      total_receivable_original,
      collected,
      remaining,
      progress,
      is_settled,
    });
  }

  return result.sort((a, b) => {
    if (a.is_settled !== b.is_settled) return a.is_settled ? 1 : -1;
    return b.remaining - a.remaining;
  });
}

export function getOverallReceivableSummary(targetCurrency = "EGP"): OverallReceivableSummary {
  const summaries = getPersonReceivableSummaries().filter((s) => s.currency === targetCurrency);
  let total_receivable_original = 0;
  let total_collected = 0;
  let total_remaining = 0;
  let active_receivables_count = 0;
  let settled_receivables_count = 0;

  for (const s of summaries) {
    total_receivable_original += s.total_receivable_original;
    total_collected += s.collected;
    total_remaining += s.remaining;
    if (s.total_receivable_original > 0) {
      if (s.is_settled) settled_receivables_count++;
      else active_receivables_count++;
    }
  }

  const overall_progress =
    total_receivable_original > 0
      ? Math.min(100, Math.round((total_collected / total_receivable_original) * 100))
      : 0;

  return {
    currency: targetCurrency,
    total_receivable_original,
    total_collected,
    total_remaining,
    overall_progress,
    active_receivables_count,
    settled_receivables_count,
  };
}

export function getOverallReceivableSummaries(): OverallReceivableSummary[] {
  const summaries = getPersonReceivableSummaries();
  const currencies = Array.from(new Set(summaries.map((s) => s.currency || "EGP")));
  if (currencies.length === 0) currencies.push("EGP");
  return currencies.map((c) => getOverallReceivableSummary(c));
}

// ---------- Credit Card Watchlist (حماية البطاقات من الغرامات) ----------

export function getCreditCardsStatus(): CreditCardStatus[] {
  const accounts = getAccounts();
  const cards = accounts.filter((a) => a.type === "credit_card" && a.due_day != null);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  return cards
    .map((c) => {
      const dueDay = c.due_day!;
      let targetYear = currentYear;
      let targetMonth = currentMonth;
      if (currentDay > dueDay) {
        targetMonth += 1;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear += 1;
        }
      }
      const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
      const actualDueDay = Math.min(dueDay, maxDay);
      const targetDueDate = new Date(targetYear, targetMonth, actualDueDay);
      const yStr = targetYear;
      const mStr = String(targetMonth + 1).padStart(2, "0");
      const dStr = String(actualDueDay).padStart(2, "0");
      const next_due_date = `${yStr}-${mStr}-${dStr}`;

      const msDiff =
        targetDueDate.getTime() - new Date(currentYear, currentMonth, currentDay).getTime();
      const days_left = Math.round(msDiff / (1000 * 3600 * 24));

      const owed_amount = c.balance < 0 ? -c.balance : 0;
      const is_paid = owed_amount === 0;

      let status: CreditCardStatus["status"] = "upcoming";
      if (is_paid) {
        status = "paid";
      } else if (days_left < 0) {
        status = "overdue";
      } else if (days_left <= 2) {
        status = "urgent";
      } else if (days_left <= 7) {
        status = "soon";
      }

      const utilization_percent =
        c.credit_limit && c.credit_limit > 0
          ? Math.min(100, Math.round((owed_amount / c.credit_limit) * 100))
          : null;

      return {
        id: c.id,
        name: c.name,
        currency: c.currency,
        balance: c.balance,
        owed_amount,
        credit_limit: c.credit_limit,
        utilization_percent,
        due_day: dueDay,
        statement_day: c.statement_day,
        next_due_date,
        days_left,
        status,
        emoji: c.emoji,
      };
    })
    .sort((a, b) => {
      if (a.status === "paid" && b.status !== "paid") return 1;
      if (a.status !== "paid" && b.status === "paid") return -1;
      return a.days_left - b.days_left;
    });
}

// ---------- Analytics & Visual Charts (إحصائيات ورسوم بيانية) ----------

export function getAnalyticsData(
  period: "week" | "month" | "year" | "all" = "month",
  targetCurrency = "EGP"
): AnalyticsData {
  const now = new Date();
  const intervals: AnalyticsInterval[] = [];
  let startDate = "";
  let endDate = "";

  if (period === "week") {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (i === 6) startDate = iso;
      if (i === 0) endDate = iso;
      const dayName = ARABIC_DAYS[d.getDay()];
      intervals.push({
        label: `${dayName} ${d.getDate()}`,
        key: iso,
        income: 0,
        expense: 0,
        debt_repaid: 0,
      });
    }
  } else if (period === "month") {
    // Current month 4 weeks
    const y = now.getFullYear();
    const m = now.getMonth();
    const mStr = String(m + 1).padStart(2, "0");
    const lastDay = new Date(y, m + 1, 0).getDate();
    startDate = `${y}-${mStr}-01`;
    endDate = `${y}-${mStr}-${String(lastDay).padStart(2, "0")}`;

    const ranges = [
      { label: "1-7 " + ARABIC_MONTHS[m], start: 1, end: 7 },
      { label: "8-14 " + ARABIC_MONTHS[m], start: 8, end: 14 },
      { label: "15-21 " + ARABIC_MONTHS[m], start: 15, end: 21 },
      { label: `22-${lastDay} ` + ARABIC_MONTHS[m], start: 22, end: lastDay },
    ];
    ranges.forEach((r, idx) => {
      intervals.push({
        label: r.label,
        key: `W${idx + 1}`,
        income: 0,
        expense: 0,
        debt_repaid: 0,
      });
    });
  } else if (period === "year") {
    // 12 months of current year
    const y = now.getFullYear();
    startDate = `${y}-01-01`;
    endDate = `${y}-12-31`;
    for (let m = 0; m < 12; m++) {
      intervals.push({
        label: ARABIC_MONTHS[m],
        key: `${y}-${String(m + 1).padStart(2, "0")}`,
        income: 0,
        expense: 0,
        debt_repaid: 0,
      });
    }
  } else {
    // All: Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (i === 5) startDate = `${ym}-01`;
      if (i === 0) {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        endDate = `${ym}-${String(lastDay).padStart(2, "0")}`;
      }
      intervals.push({
        label: `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear() % 100}`,
        key: ym,
        income: 0,
        expense: 0,
        debt_repaid: 0,
      });
    }
  }

  // Populate intervals
  const txns = db()
    .prepare(
      `SELECT t.*, a.currency AS account_currency
       FROM transactions t
       LEFT JOIN accounts a ON a.id = t.account_id
       WHERE t.date >= ? AND t.date <= ?
       ORDER BY t.date`
    )
    .all(startDate, endDate) as (Txn & { account_currency: string | null })[];

  for (const t of txns) {
    const cur = t.account_currency ?? t.person_currency ?? "EGP";
    if (cur !== targetCurrency) continue;

    let targetInterval: AnalyticsInterval | undefined;
    if (period === "week") {
      targetInterval = intervals.find((it) => it.key === t.date);
    } else if (period === "month") {
      const dayNum = parseInt(t.date.slice(8, 10), 10);
      if (dayNum <= 7) targetInterval = intervals[0];
      else if (dayNum <= 14) targetInterval = intervals[1];
      else if (dayNum <= 21) targetInterval = intervals[2];
      else targetInterval = intervals[3];
    } else {
      const ym = t.date.slice(0, 7);
      targetInterval = intervals.find((it) => it.key === ym);
    }

    if (targetInterval) {
      if (t.type === "income") {
        targetInterval.income += t.amount;
      } else if (t.type === "expense" && !t.person_id) {
        targetInterval.expense += t.amount;
      } else if (t.type === "person_out" || (t.type === "expense" && t.person_id)) {
        targetInterval.debt_repaid += t.amount;
      }
    }
  }

  // Calculate cumulative remaining debt over time
  const overallDebt = getOverallDebtSummary(targetCurrency);
  let runningDebt = overallDebt.total_debt_original;
  for (const it of intervals) {
    runningDebt = Math.max(0, runningDebt - it.debt_repaid);
    it.remaining_debt = runningDebt;
  }

  // Aggregated totals
  let totalIncome = 0;
  let totalExpense = 0;
  let totalDebtRepaid = 0;
  for (const it of intervals) {
    totalIncome += it.income;
    totalExpense += it.expense;
    totalDebtRepaid += it.debt_repaid;
  }

  // Top spending categories in this period
  const catRows = db()
    .prepare(
      `SELECT c.id, c.name, c.emoji, SUM(t.amount) AS total
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'expense' AND t.person_id IS NULL AND a.currency = ? AND t.date >= ? AND t.date <= ?
       GROUP BY c.id
       ORDER BY total DESC
       LIMIT 5`
    )
    .all(targetCurrency, startDate, endDate) as {
      id: number | null;
      name: string | null;
      emoji: string | null;
      total: number;
    }[];

  const topCategories = catRows.map((r) => ({
    category_id: r.id,
    name: r.name ?? "أخرى / بدون تصنيف",
    emoji: r.emoji ?? "📦",
    amount: r.total,
    percentage: totalExpense > 0 ? Math.round((r.total / totalExpense) * 100) : 0,
  }));

  return {
    period,
    currency: targetCurrency,
    intervals,
    totals: {
      income: totalIncome,
      expense: totalExpense,
      debt_repaid: totalDebtRepaid,
      net_savings: totalIncome - (totalExpense + totalDebtRepaid),
    },
    topCategories,
  };
}
