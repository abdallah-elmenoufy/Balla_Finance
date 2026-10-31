import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getAccounts, getCurrencies } from "@/lib/queries";
import { createAccount } from "@/app/actions/accounts";
import AccountForm from "@/components/AccountForm";
import { fmtMoney } from "@/lib/money";
import { ACCOUNT_TYPES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  await requireAuth();
  const accounts = getAccounts();
  const currencies = getCurrencies();
  const typeMap = new Map(ACCOUNT_TYPES.map((t) => [t.value as string, t]));

  // Separate accounts
  const liquidAccounts = accounts.filter(
    (a) => a.type === "cash" || a.type === "bank" || a.type === "mobile_wallet" || a.type === "debit_card" || a.type === "other"
  );
  const creditCards = accounts.filter((a) => a.type === "credit_card");
  const bnplAccounts = accounts.filter((a) => a.type === "bnpl");

  const totalLiquidEGP = liquidAccounts
    .filter((a) => a.currency === "EGP")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalCreditOwedEGP = creditCards
    .filter((c) => c.currency === "EGP" && c.balance < 0)
    .reduce((sum, c) => sum - c.balance, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            الحسابات والبطاقات البنكية
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            تابع أموالك النقدية الحرة المتاحة، والبطاقات الائتمانية المطلوب سدادها قبل نهاية مهلة البنك
          </p>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
          <div className="text-xs font-bold text-emerald-800">إجمالي السيولة النقدية المتاحة (EGP)</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {fmtMoney(totalLiquidEGP, "EGP")}
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            أموال حرة بحوزتك في الكاش والمحافظ والبنوك
          </div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <div className="text-xs font-bold text-amber-900">إجمالي مديونية البطاقات المطلوب سدادها (EGP)</div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {fmtMoney(totalCreditOwedEGP, "EGP")}
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            مستحقات واجبة السداد لتجنب فوائد وغرامات البنك
          </div>
        </div>
      </div>

      {/* Add New Account Form */}
      <details className="card p-5 border-emerald-300 shadow-sm">
        <summary className="cursor-pointer font-bold text-emerald-800 text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>➕</span>
            <span>إضافة حساب أو بطاقة جديدة (Add Account / Card)</span>
          </span>
          <span className="text-xs text-stone-400 font-normal">انقر لفتح النموذج</span>
        </summary>
        <div className="mt-5 pt-4 border-t border-stone-100">
          <AccountForm
            action={createAccount}
            currencies={currencies}
            submitLabel="حفظ وإنشاء الحساب"
          />
        </div>
      </details>

      {/* Section 1: Liquid Accounts */}
      <div className="space-y-3">
        <div className="border-b border-stone-200 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span>💵</span>
              <span>السيولة النقدية والمحافظ (أموال حرة بحوزتك)</span>
            </h2>
            <p className="text-xs text-stone-500">
              حسابات الكاش، فودافون كاش، إنستاباي، والحسابات البنكية الجارية والتوفير
            </p>
          </div>
          <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
            {liquidAccounts.length} حسابات
          </span>
        </div>

        {liquidAccounts.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">لا توجد حسابات سيولة نقدية مسجلة بعد</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {liquidAccounts.map((a) => {
              const t = typeMap.get(a.type);
              return (
                <Link
                  key={a.id}
                  href={`/accounts/${a.id}`}
                  className="card p-4 hover:border-emerald-600 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl p-2 rounded-xl bg-stone-50 border border-stone-100">
                        {a.emoji ?? t?.emoji ?? "💼"}
                      </span>
                      <div className="min-w-0">
                        <div dir="auto" className="font-bold text-stone-900 text-base truncate group-hover:text-emerald-800 transition-colors">
                          {a.name}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {t?.label ?? a.type}
                        </div>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="text-lg font-black text-emerald-700">
                        {fmtMoney(a.balance, a.currency)}
                      </div>
                      <div className="text-[11px] text-stone-400">رصيد متاح</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Credit Cards */}
      <div className="space-y-3 pt-2">
        <div className="border-b border-stone-200 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span>💳</span>
              <span>البطاقات الائتمانية ومواعيد استحقاقها</span>
            </h2>
            <p className="text-xs text-stone-500">
              بطاقات المشتريات التي يسلفك البنك منها وتلتزم بالسداد في موعد محدد لتجنب الفائدة
            </p>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
            {creditCards.length} بطاقات
          </span>
        </div>

        {creditCards.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">لا توجد بطاقات ائتمانية مسجلة</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {creditCards.map((a) => {
              const t = typeMap.get(a.type);
              const owed = a.balance < 0 ? -a.balance : 0;
              const isPaid = owed === 0;
              const available = a.credit_limit ? Math.max(0, a.credit_limit - owed) : null;

              return (
                <Link
                  key={a.id}
                  href={`/accounts/${a.id}`}
                  className={`card p-4 hover:shadow-md transition-all group ${
                    isPaid
                      ? "border-emerald-200 bg-emerald-50/20"
                      : "border-amber-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl p-2 rounded-xl bg-amber-50 border border-amber-200">
                        {a.emoji ?? t?.emoji ?? "💳"}
                      </span>
                      <div className="min-w-0">
                        <div dir="auto" className="font-bold text-stone-900 text-base truncate group-hover:text-emerald-800 transition-colors">
                          {a.name}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {a.due_day ? `يوم السداد: ${a.due_day} من كل شهر` : "بطاقة ائتمان"}
                          {a.statement_day && ` · كشف الحساب: يوم ${a.statement_day}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className={`text-lg font-black ${isPaid ? "text-emerald-700" : "text-red-600"}`}>
                        {isPaid ? "0.00 " + a.currency : fmtMoney(owed, a.currency)}
                      </div>
                      <div className="text-[11px] font-semibold text-stone-500">
                        {isPaid ? "مسددة بالكامل ✓" : "مطلوب سدادها للبنك"}
                      </div>
                    </div>
                  </div>

                  {/* Credit limit and available preview */}
                  {a.credit_limit != null && a.credit_limit > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex justify-between text-xs text-stone-500">
                      <span>الحد الائتماني: <b>{fmtMoney(a.credit_limit, a.currency)}</b></span>
                      <span>المتاح للشراء: <b className="text-emerald-700">{fmtMoney(available ?? 0, a.currency)}</b></span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: BNPL Providers */}
      {bnplAccounts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="border-b border-stone-200 pb-2">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span>🧾</span>
              <span>جهات وأقساط التقسيط (BNPL)</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {bnplAccounts.map((a) => (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                className="card p-4 hover:border-emerald-600 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl p-2 rounded-xl bg-stone-50 border border-stone-100">
                      {a.emoji ?? "🧾"}
                    </span>
                    <div className="min-w-0">
                      <div dir="auto" className="font-bold text-stone-900 text-base truncate">
                        {a.name}
                      </div>
                      <div className="text-xs text-stone-500">جهة تقسيط</div>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-lg font-black text-stone-900">
                      {fmtMoney(Math.abs(a.balance), a.currency)}
                    </div>
                    <div className="text-[11px] text-stone-400">متبقي الأقساط</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
