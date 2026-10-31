import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import {
  getAccounts,
  getAnalyticsData,
  getCategories,
  getCreditCardsStatus,
  getCurrencies,
  getOverallDebtSummary,
  getOverallReceivableSummaries,
  getPeople,
  getPersonDebtSummaries,
  getPersonReceivableSummaries,
  getTxns,
  upcomingInstallments,
} from "@/lib/queries";
import { fmtMoney, todayISO } from "@/lib/money";
import { ACCOUNT_TYPES } from "@/lib/types";
import DashboardClient from "@/components/DashboardClient";
import TxnTable from "@/components/TxnTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAuth();
  const accounts = getAccounts();
  const people = getPeople();
  const categories = getCategories();
  const currencies = getCurrencies();
  const dues = upcomingInstallments(30);
  const today = todayISO();

  // Debt & Card status
  const personDebts = getPersonDebtSummaries();
  const distinctCurrencies = Array.from(new Set(personDebts.map((p) => p.currency))).filter(Boolean);
  const debtCurrencies = distinctCurrencies.length > 0 ? distinctCurrencies : ["EGP"];
  const overallDebts = debtCurrencies.map((c) => getOverallDebtSummary(c));
  const activeDebtSummary = overallDebts.find((d) => d.total_debt_original > 0) || overallDebts[0];
  const creditCards = getCreditCardsStatus();

  // Receivables status (أموال مستحقة لك بالخارج / فلوس ليك برة)
  const receivableSummaries = getPersonReceivableSummaries();
  const overallReceivables = getOverallReceivableSummaries();

  // Pre-fetch analytics for all 4 periods for instant tab switching
  const dataByPeriod = {
    week: getAnalyticsData("week", "EGP"),
    month: getAnalyticsData("month", "EGP"),
    year: getAnalyticsData("year", "EGP"),
    all: getAnalyticsData("all", "EGP"),
  };

  // Recent transactions
  const recentTxns = getTxns({}, 6);

  // Group accounts: Liquid vs Credit/BNPL
  const liquidAccounts = accounts.filter(
    (a) => a.type === "cash" || a.type === "bank" || a.type === "mobile_wallet" || a.type === "debit_card"
  );

  const liquidTotalEGP = liquidAccounts
    .filter((a) => a.currency === "EGP")
    .reduce((sum, a) => sum + a.balance, 0);

  const creditOwedEGP = creditCards
    .filter((c) => c.currency === "EGP")
    .reduce((sum, c) => sum + c.owed_amount, 0);

  const typeEmoji = new Map(ACCOUNT_TYPES.map((t) => [t.value as string, t.emoji]));

  return (
    <div className="space-y-5">
      {/* Dashboard Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            لوحة المتابعة والتحكم المالية
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            نظرة شاملة وواضحة على السيولة النقدية، ديون الأمانات، ومواعيد سداد البطاقات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/transactions" className="btn text-xs sm:text-sm">
            ➕ كل العمليات
          </Link>
        </div>
      </div>

      {/* High-Level Financial Snapshot: 4 Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Available Liquid Cash */}
        <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>💵</span>
              <span>السيولة النقدية المتاحة</span>
            </span>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              كاش ومحافظ
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2 font-mono">
            {fmtMoney(liquidTotalEGP, "EGP")}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            في {liquidAccounts.length} حسابات فعلية بحوزتك
          </div>
        </div>

        {/* 2. Total Family Debts Remaining (Dual-Currency Stacked Display) */}
        <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-2xs">
          <div className="text-xs font-semibold text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>🤝</span>
              <span>ديون الأمانات العائلية المتبقية</span>
            </span>
            <span className="text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
              عليك سدادها
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {overallDebts
              .filter((d) => d.total_debt_original > 0)
              .map((d) => (
                <div key={d.currency} className="flex items-baseline justify-between gap-1.5 border-b border-amber-100/60 pb-1 last:border-0 last:pb-0">
                  <span className="text-lg sm:text-xl font-black text-amber-800 font-mono">
                    {fmtMoney(d.total_remaining, d.currency)}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700">
                    تم سداد {d.overall_progress}%
                  </span>
                </div>
              ))}
            {overallDebts.filter((d) => d.total_debt_original > 0).length === 0 && (
              <div className="text-lg font-bold text-emerald-700">لا توجد ديون عليك بفضل الله</div>
            )}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            تُخصم تلقائياً عند السداد (EGP و USD)
          </div>
        </div>

        {/* 3. Receivables Owed to You by Others (فلوس ليك برة) */}
        <div className="card p-4 bg-gradient-to-br from-teal-50 to-white border-teal-200 shadow-2xs">
          <div className="text-xs font-semibold text-teal-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>💼</span>
              <span>أموال مستحقة لك بالخارج</span>
            </span>
            <span className="text-[11px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full font-bold">
              قيد التحصيل
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {overallReceivables
              .filter((r) => r.total_receivable_original > 0)
              .map((r) => (
                <div key={r.currency} className="flex items-baseline justify-between gap-1.5 border-b border-teal-100/60 pb-1 last:border-0 last:pb-0">
                  <span className="text-lg sm:text-xl font-black text-teal-800 font-mono">
                    {fmtMoney(r.total_remaining, r.currency)}
                  </span>
                  <span className="text-[11px] font-bold text-teal-700">
                    تم تحصيل {r.overall_progress}%
                  </span>
                </div>
              ))}
            {overallReceivables.filter((r) => r.total_receivable_original > 0).length === 0 && (
              <div className="text-lg font-bold text-stone-600">0.00 ج.م</div>
            )}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {receivableSummaries.filter((r) => r.remaining > 0).length > 0 ? (
              <span>في ذمة {receivableSummaries.filter((r) => r.remaining > 0).length} مدينين بانتظار التحصيل</span>
            ) : (
              <span>لا توجد مبالغ معلقة بالخارج حالياً</span>
            )}
          </div>
        </div>

        {/* 4. Credit Card Dues */}
        <div className="card p-4 bg-gradient-to-br from-red-50 to-white border-red-200 shadow-2xs">
          <div className="text-xs font-semibold text-red-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>💳</span>
              <span>مستحقات البطاقات</span>
            </span>
            <span className="text-[11px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
              تجنب الغرامة
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-600 mt-2 font-mono">
            {fmtMoney(creditOwedEGP, "EGP")}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {creditCards.filter((c) => !c.status || c.status !== "paid").length} بطاقات مطلوب سدادها
          </div>
        </div>
      </div>

      {/* Interactive Client Core: Quick Actions, Debt Journey, Receivables, Card Watchlist, Analytics */}
      <DashboardClient
        overallDebt={activeDebtSummary}
        overallDebts={overallDebts}
        personDebts={personDebts}
        receivables={receivableSummaries}
        overallReceivables={overallReceivables}
        creditCards={creditCards}
        accounts={accounts}
        people={people}
        categories={categories}
        currencies={currencies}
        dataByPeriod={dataByPeriod}
      />

      {/* Upcoming BNPL Installments */}
      {dues.length > 0 && (
        <div className="card p-4 sm:p-5 border-stone-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <span>🧾</span>
              <span>أقساط مشتريات قادمة (BNPL) خلال 30 يوم</span>
            </h2>
            <Link href="/bnpl" className="text-xs text-emerald-700 hover:underline">
              عرض كل الخطط →
            </Link>
          </div>
          <div className="space-y-1.5 text-sm">
            {dues.map((d) => {
              const overdue = d.due_date < today;
              return (
                <Link
                  key={d.id}
                  href={`/bnpl/${d.plan_id}`}
                  className="flex justify-between items-center gap-2 rounded-lg p-2 hover:bg-stone-50 border border-stone-100"
                >
                  <span dir="auto" className="font-medium text-stone-800">
                    {overdue ? "⚠️" : "📅"} قسط #{d.seq} — {d.plan_description}
                    <span className="text-xs text-stone-500"> ({d.account_name})</span>
                  </span>
                  <span
                    className={`whitespace-nowrap font-bold ${
                      overdue ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {fmtMoney(d.amount, d.currency)} · {overdue ? "متأخر!" : d.due_date}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Accounts Breakdown Snapshot */}
      <div className="card p-4 sm:p-5 border-stone-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
            <span>🏦</span>
            <span>تفاصيل الحسابات والمحافظ البنكية</span>
          </h2>
          <Link href="/accounts" className="text-xs text-emerald-700 hover:underline">
            إدارة الحسابات →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {accounts.map((a) => (
            <Link
              key={a.id}
              href={`/accounts/${a.id}`}
              className="flex justify-between items-center gap-2 rounded-xl border border-stone-200 p-3 hover:border-emerald-500 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{a.emoji ?? typeEmoji.get(a.type) ?? "💼"}</span>
                <div className="min-w-0">
                  <div dir="auto" className="font-semibold text-stone-900 truncate">
                    {a.name}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {a.type === "credit_card" ? "بطاقة ائتمان" : a.currency}
                    {a.due_day != null && <> · استحقاق يوم {a.due_day}</>}
                  </div>
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <div
                  className={`font-bold ${a.balance < 0 ? "text-red-600" : "text-stone-900"}`}
                >
                  {fmtMoney(a.balance, a.currency)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="card p-4 sm:p-5 border-stone-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
            <span>💸</span>
            <span>آخر العمليات المسجلة</span>
          </h2>
          <Link href="/transactions" className="text-xs text-emerald-700 hover:underline">
            عرض الكل ({recentTxns.length}) →
          </Link>
        </div>
        <TxnTable txns={recentTxns} showActions={true} />
      </div>
    </div>
  );
}
