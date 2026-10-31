import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import {
  getAccounts,
  getAnalyticsData,
  getCategories,
  getCreditCardsStatus,
  getCurrencies,
  getOverallDebtSummary,
  getPeople,
  getPersonDebtSummaries,
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
  const overallDebt = getOverallDebtSummary("EGP");
  const personDebts = getPersonDebtSummaries();
  const creditCards = getCreditCardsStatus();

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

      {/* High-Level Financial Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Available Liquid Cash */}
        <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <span>💵</span>
            <span>السيولة النقدية المتاحة (كاش + بنوك + محافظ)</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {fmtMoney(liquidTotalEGP, "EGP")}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            في {liquidAccounts.length} حسابات فعلية بحوزتك
          </div>
        </div>

        {/* Total Family Debts Remaining */}
        <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-2xs">
          <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <span>🤝</span>
            <span>ديون الأمانات العائلية المتبقية</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {fmtMoney(overallDebt.total_remaining, overallDebt.currency)}
          </div>
          <div className="text-[11px] text-amber-800 font-medium mt-0.5">
            تم سداد {overallDebt.overall_progress}% حتى الآن ({fmtMoney(overallDebt.total_repaid, overallDebt.currency)})
          </div>
        </div>

        {/* Credit Card Dues */}
        <div className="card p-4 bg-gradient-to-br from-red-50 to-white border-red-200 shadow-2xs">
          <div className="text-xs font-semibold text-red-900 flex items-center gap-1.5">
            <span>💳</span>
            <span>مستحقات البطاقات الائتمانية</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-600 mt-1">
            {fmtMoney(creditOwedEGP, "EGP")}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {creditCards.filter((c) => !c.status || c.status !== "paid").length} بطاقات مطلوب سدادها
          </div>
        </div>
      </div>

      {/* Interactive Client Core: Quick Actions, Debt Journey, Card Watchlist, Analytics */}
      <DashboardClient
        overallDebt={overallDebt}
        personDebts={personDebts}
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
