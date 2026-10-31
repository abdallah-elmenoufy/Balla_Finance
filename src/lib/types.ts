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
  | "receivable"
  | "other";

export const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  emoji: string;
  description: string;
  isCredit: boolean;
}[] = [
  {
    value: "cash",
    label: "كاش ونقود ورقية (Cash)",
    emoji: "💵",
    description: "النقود الورقية الحقيقية في جيبك، محفظتك، أو في البيت (أموال تملكها فعلياً)",
    isCredit: false,
  },
  {
    value: "mobile_wallet",
    label: "محفظة إلكترونية (Mobile Wallet)",
    emoji: "📱",
    description: "فودافون كاش، إنستاباي، أورنج كاش، إي آند، وي باي (رصيدك الفعلي المتاح للتحويل)",
    isCredit: false,
  },
  {
    value: "bank",
    label: "حساب بنكي (Bank Account)",
    emoji: "🏦",
    description: "حساب جاري أو توفير في البنك (الأهلي، مصر، CIB...) يمثل رصيدك الإيجابي",
    isCredit: false,
  },
  {
    value: "debit_card",
    label: "بطاقة خصم مباشر (Debit / Visa Card)",
    emoji: "💳",
    description: "كارت الفيزا/ميزة المربوط مباشرة بحسابك البنكي، لا يفرض عليك ديوناً أو فوائد",
    isCredit: false,
  },
  {
    value: "credit_card",
    label: "بطاقة ائتمان / مشتريات (Credit Card)",
    emoji: "🟠",
    description: "بطاقة استدانة يسلفك البنك منها وتلتزم بسداد المديونية في موعد محدد لتجنب الفوائد",
    isCredit: true,
  },
  {
    value: "bnpl",
    label: "خدمات أقساط (BNPL - Valu, Souhoola...)",
    emoji: "🧾",
    description: "حساب لجهات التقسيط (فاليو، سهولة، كونتكت، أمان) لمتابعة أقساط مشترياتك المجدولة شهرياً",
    isCredit: true,
  },
  {
    value: "receivable",
    label: "أموال مستحقة بالخارج (فلوس ليا برة)",
    emoji: "🤝",
    description: "حساب لتتبع الأموال والديون التي سلّفتها للآخرين والمستحقة لك في ذمتهم وتنتظر تحصيلها",
    isCredit: false,
  },
  {
    value: "other",
    label: "حساب آخر (Other)",
    emoji: "📦",
    description: "أي حساب أو محفظة مالية أخرى تريد تتبع رصيدها",
    isCredit: false,
  },
];

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  credit_limit: number | null;
  due_day: number | null;
  statement_day: number | null;
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
  initial_debt: number;
  initial_currency: string;
  initial_type: "debt" | "receivable";
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
  expense: "مصروف 🛒",
  income: "دخل 💰",
  transfer: "تحويل رصيد 🔄",
  person_out: "سداد دين أمانة 🤝",
  person_in: "استلام أمانة / دين جديد 📥",
  adjustment: "تسوية رصيد ⚖️",
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

export interface PersonDebtSummary {
  person_id: number;
  name: string;
  note: string | null;
  currency: string;
  initial_debt: number;
  additional_debt: number;
  total_debt_original: number;
  repaid: number;
  remaining: number;
  progress: number;
  is_settled: boolean;
}

export interface OverallDebtSummary {
  currency: string;
  total_debt_original: number;
  total_repaid: number;
  total_remaining: number;
  overall_progress: number;
  active_debts_count: number;
  settled_debts_count: number;
}

export interface PersonReceivableSummary {
  person_id: number;
  name: string;
  note: string | null;
  currency: string;
  initial_receivable: number;
  additional_lent: number;
  total_receivable_original: number;
  collected: number;
  remaining: number;
  progress: number;
  is_settled: boolean;
}

export interface OverallReceivableSummary {
  currency: string;
  total_receivable_original: number;
  total_collected: number;
  total_remaining: number;
  overall_progress: number;
  active_receivables_count: number;
  settled_receivables_count: number;
}

export interface CreditCardStatus {
  id: number;
  name: string;
  currency: string;
  balance: number;
  owed_amount: number;
  credit_limit: number | null;
  utilization_percent: number | null;
  due_day: number;
  statement_day: number | null;
  next_due_date: string;
  days_left: number;
  status: "paid" | "urgent" | "soon" | "upcoming" | "overdue";
  emoji: string | null;
}

export interface AnalyticsInterval {
  label: string;
  key: string;
  income: number;
  expense: number;
  debt_repaid: number;
  remaining_debt?: number;
}

export interface AnalyticsData {
  period: "week" | "month" | "year" | "all";
  currency: string;
  intervals: AnalyticsInterval[];
  totals: {
    income: number;
    expense: number;
    debt_repaid: number;
    net_savings: number;
  };
  topCategories: {
    category_id: number | null;
    name: string;
    emoji: string | null;
    amount: number;
    percentage: number;
  }[];
}
