import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DDL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 2
);
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  opening_balance INTEGER NOT NULL DEFAULT 0,
  credit_limit INTEGER,
  due_day INTEGER,
  statement_day INTEGER,
  emoji TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  note TEXT,
  initial_debt INTEGER NOT NULL DEFAULT 0,
  initial_currency TEXT NOT NULL DEFAULT 'EGP',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  emoji TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  account_id INTEGER REFERENCES accounts(id),
  to_account_id INTEGER REFERENCES accounts(id),
  person_id INTEGER REFERENCES people(id),
  category_id INTEGER REFERENCES categories(id),
  amount INTEGER NOT NULL DEFAULT 0,
  to_amount INTEGER,
  person_amount INTEGER,
  person_currency TEXT,
  payee TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_txn_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_txn_to_account ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_txn_person ON transactions(person_id);
CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);
CREATE TABLE IF NOT EXISTS bnpl_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  description TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  principal INTEGER NOT NULL,
  fees_total INTEGER NOT NULL DEFAULT 0,
  installment_count INTEGER NOT NULL,
  first_due_date TEXT NOT NULL,
  purchase_transaction_id INTEGER REFERENCES transactions(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bnpl_installments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES bnpl_plans(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_transaction_id INTEGER REFERENCES transactions(id)
);
`;

function seed(d: Database.Database) {
  const cur = d.prepare("SELECT COUNT(*) AS n FROM currencies").get() as { n: number };
  if (cur.n === 0) {
    const ins = d.prepare(
      "INSERT INTO currencies (code, name, symbol, decimals) VALUES (?,?,?,?)"
    );
    ins.run("EGP", "Egyptian Pound", "ج.م", 2);
    ins.run("USD", "US Dollar", "$", 2);
    ins.run("SAR", "Saudi Riyal", "ر.س", 2);
    ins.run("AED", "UAE Dirham", "د.إ", 2);
    ins.run("EUR", "Euro", "€", 2);
    ins.run("GBP", "British Pound", "£", 2);
  }
  const cat = d.prepare("SELECT COUNT(*) AS n FROM categories").get() as { n: number };
  if (cat.n === 0) {
    const ins = d.prepare(
      "INSERT INTO categories (name, kind, emoji, sort_order) VALUES (?,?,?,?)"
    );
    const expense = [
      ["سوبرماركت / بقالة", "🛒"],
      ["فواتير وخدمات", "🧾"],
      ["مواصلات", "🚗"],
      ["مطاعم", "🍔"],
      ["صحة", "💊"],
      ["تعليم", "📚"],
      ["ملابس", "👕"],
      ["رسوم تحويل", "💸"],
      ["أقساط", "📅"],
      ["ترفيه", "🎬"],
      ["أخرى", "📦"],
    ];
    const income = [
      ["مرتب", "💼"],
      ["تحويلات واردة", "📥"],
      ["أخرى", "➕"],
    ];
    expense.forEach(([n, e], i) => ins.run(n, "expense", e, i));
    income.forEach(([n, e], i) => ins.run(n, "income", e, i));
  }
}

function migrate(d: Database.Database) {
  try {
    d.prepare("ALTER TABLE people ADD COLUMN initial_debt INTEGER NOT NULL DEFAULT 0").run();
  } catch {}
  try {
    d.prepare("ALTER TABLE people ADD COLUMN initial_currency TEXT NOT NULL DEFAULT 'EGP'").run();
  } catch {}
  try {
    d.prepare("ALTER TABLE accounts ADD COLUMN statement_day INTEGER").run();
  } catch {}
}

declare global {
  // eslint-disable-next-line no-var
  var __balla_db: Database.Database | undefined;
}

export function db(): Database.Database {
  if (!globalThis.__balla_db) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const d = new Database(path.join(dir, "balla.db"));
    d.pragma("journal_mode = WAL");
    d.pragma("foreign_keys = ON");
    d.exec(DDL);
    migrate(d);
    seed(d);
    globalThis.__balla_db = d;
  }
  return globalThis.__balla_db;
}

export const DB_PATH = path.join(process.cwd(), "data", "balla.db");
