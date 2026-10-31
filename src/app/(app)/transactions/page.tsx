import { requireAuth } from "@/lib/auth";
import {
  getAccounts,
  getCategories,
  getCurrencies,
  getPeople,
  getTxns,
} from "@/lib/queries";
import { createTxn } from "@/app/actions/transactions";
import TxnForm from "@/components/TxnForm";
import TxnTable from "@/components/TxnTable";
import { TXN_TYPE_LABELS, type TxnType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAuth();
  const sp = await searchParams;
  const accounts = getAccounts();
  const people = getPeople();
  const categories = getCategories();
  const currencies = getCurrencies();
  const filters = {
    month: sp.month || undefined,
    accountId: sp.account ? Number(sp.account) : undefined,
    personId: sp.person ? Number(sp.person) : undefined,
    type: sp.type || undefined,
  };
  const txns = getTxns(filters);
  const hasFilter = !!(filters.month || filters.accountId || filters.personId || filters.type);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            سجل العمليات المالية (Transactions)
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            تسجيل وتصفية وتعديل كافة المصروفات، الإيرادات، سداد الديون، والتحويلات
          </p>
        </div>
      </div>

      {/* New Transaction Form Accordion */}
      <details className="card p-5 border-emerald-300 shadow-sm" open={!hasFilter}>
        <summary className="cursor-pointer font-bold text-emerald-800 text-base sm:text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>➕</span>
            <span>تسجيل عملية مالية جديدة</span>
          </span>
          <span className="text-xs text-stone-400 font-normal">انقر لفتح / إغلاق النموذج</span>
        </summary>
        <div className="mt-5 pt-4 border-t border-stone-100">
          <TxnForm
            accounts={accounts}
            people={people}
            categories={categories}
            currencies={currencies}
            action={createTxn}
            redirectTo="/transactions"
            submitLabel="حفظ وتسجيل العملية"
          />
        </div>
      </details>

      {/* Filter Toolbar */}
      <form className="card p-4 sm:p-5 flex flex-wrap gap-3 items-end text-sm border-stone-200">
        <div className="flex-1 min-w-36">
          <label className="label">الشهر</label>
          <input
            type="month"
            name="month"
            defaultValue={sp.month ?? ""}
            className="input text-sm font-semibold"
          />
        </div>
        <div className="flex-1 min-w-40">
          <label className="label">الحساب / البطاقة</label>
          <select name="account" defaultValue={sp.account ?? ""} className="input text-sm font-semibold">
            <option value="">جميع الحسابات</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji ?? "💼"} {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-36">
          <label className="label">الشخص</label>
          <select name="person" defaultValue={sp.person ?? ""} className="input text-sm font-semibold">
            <option value="">جميع الأشخاص</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-36">
          <label className="label">نوع العملية</label>
          <select name="type" defaultValue={sp.type ?? ""} className="input text-sm font-semibold">
            <option value="">جميع الأنواع</option>
            {(Object.keys(TXN_TYPE_LABELS) as TxnType[]).map((t) => (
              <option key={t} value={t}>
                {TXN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn text-sm py-2 px-5">تطبيق الفلتر</button>
          {hasFilter && (
            <a
              href="/transactions"
              className="text-xs text-stone-500 hover:text-red-600 hover:underline px-2 py-2"
            >
              إلغاء الفلتر ✕
            </a>
          )}
        </div>
      </form>

      {/* Transactions Table Card */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-stone-900">قائمة العمليات المسجلة</h2>
          <span className="text-xs text-stone-400 font-semibold">{txns.length} عملية</span>
        </div>
        <TxnTable txns={txns} showActions={true} />
      </div>
    </div>
  );
}
