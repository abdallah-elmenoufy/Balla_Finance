export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export type AccountType =
  | "cash"
  | "mobile_wallet"
  | "bank"
  | "debit_card"
  | "credit_card"
  | "bnpl"
  | "other";

export const ACCOUNT_TYPES: { value: AccountType; label: string; emoji: string }[] = [
  { value: "cash", label: "Cash كاش", emoji: "💵" },
  { value: "mobile_wallet", label: "Mobile Wallet محفظة", emoji: "📱" },
  { value: "bank", label: "Bank Account حساب بنكي", emoji: "🏦" },
  { value: "debit_card", label: "Debit / Visa Card", emoji: "💳" },
  { value: "credit_card", label: "Credit Card بطاقة ائتمان", emoji: "🟠" },
  { value: "bnpl", label: "BNPL أقساط (Valu, Souhoola…)", emoji: "🧾" },
  { value: "other", label: "Other أخرى", emoji: "📦" },
];

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  credit_limit: number | null;
  due_day: number | null;
  emoji: string | null;
  archived: number;
  sort_order: number;
  created_at: string;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface Person {
  id: number;
  name: string;
  note: string | null;
  archived: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  kind: "expense" | "income";
  emoji: string | null;
  sort_order: number;
}

export type TxnType =
  | "income"
  | "expense"
  | "transfer"
  | "person_in"
  | "person_out"
  | "adjustment";

export const TXN_TYPE_LABELS: Record<TxnType, string> = {
  expense: "Expense مصروف",
  income: "Income دخل",
  transfer: "Transfer تحويل",
  person_in: "امانة In (received from person)",
  person_out: "Paid for person / سداد",
  adjustment: "Adjustment تسوية",
};

export interface Txn {
  id: number;
  type: TxnType;
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
  created_at: string;
}

export interface BnplPlan {
  id: number;
  account_id: number;
  description: string;
  purchase_date: string;
  principal: number;
  fees_total: number;
  installment_count: number;
  first_due_date: string;
  purchase_transaction_id: number | null;
  created_at: string;
}

export interface BnplInstallment {
  id: number;
  plan_id: number;
  seq: number;
  due_date: string;
  amount: number;
  status: "pending" | "paid";
  paid_transaction_id: number | null;
}

export interface PersonBalance {
  person_id: number;
  currency: string;
  balance: number;
}
