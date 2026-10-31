"use client";

import { useState } from "react";
import type { AnalyticsData } from "@/lib/types";
import { fmtMoney } from "@/lib/money";

export default function AnalyticsCharts({
  dataByPeriod,
}: {
  dataByPeriod: {
    week: AnalyticsData;
    month: AnalyticsData;
    year: AnalyticsData;
    all: AnalyticsData;
  };
}) {
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">("month");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const current = dataByPeriod[period] || dataByPeriod.month;
  const { intervals, totals, topCategories, currency } = current;

  // Max calculation for bar heights
  const maxBarValue = Math.max(
    ...intervals.map((it) => Math.max(it.income, it.expense, it.debt_repaid)),
    1000
  );

  // Max calculation for debt line
  const maxDebt = Math.max(...intervals.map((it) => it.remaining_debt ?? 0), 1000);

  return (
    <div className="card p-4 sm:p-5 space-y-5 bg-white border-stone-200 shadow-sm">
      {/* Header and Period Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-stone-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>📊</span>
            <span>التحليلات والرسوم البيانية لمسار أموالك</span>
          </h2>
          <p className="text-xs text-stone-500">
            متابعة دقيقة للدخل والمصروفات ومعدل سداد الأمانات لتسريع التحرر من الديون
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold gap-1">
          {(
            [
              { id: "week", label: "أسبوعي" },
              { id: "month", label: "شهري" },
              { id: "year", label: "سنوي" },
              { id: "all", label: "الكل" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setPeriod(t.id);
                setHoveredIdx(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                period === t.id
                  ? "bg-white text-emerald-800 shadow-xs font-bold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Summary Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
          <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span>الدخل الوارد</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
            {fmtMoney(totals.income, currency)}
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
          <div className="text-[11px] font-semibold text-red-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>المصروفات الشخصية</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-red-600 mt-0.5">
            {fmtMoney(totals.expense, currency)}
          </div>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
          <div className="text-[11px] font-semibold text-purple-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
            <span>سداد الديون والأمانات</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-purple-700 mt-0.5">
            {fmtMoney(totals.debt_repaid, currency)}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
          <div className="text-[11px] font-semibold text-stone-700">صافي الفائض / العجز</div>
          <div
            className={`text-base sm:text-lg font-bold mt-0.5 ${
              totals.net_savings >= 0 ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {totals.net_savings >= 0 ? "+" : ""}
            {fmtMoney(totals.net_savings, currency)}
          </div>
        </div>
      </div>

      {/* Chart 1: Cashflow Comparison Bar Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
          <span>مقارنة التدفق المالي (الدخل مقابل المصروف وسداد الأمانات)</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-600" /> دخل
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-red-500" /> مصروف
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-purple-600" /> سداد ديون
            </span>
          </div>
        </div>

        <div className="h-48 sm:h-56 w-full flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-1 border-b border-stone-200 relative">
          {intervals.map((it, idx) => {
            const incH = Math.max(4, Math.round((it.income / maxBarValue) * 160));
            const expH = Math.max(4, Math.round((it.expense / maxBarValue) * 160));
            const repH = Math.max(4, Math.round((it.debt_repaid / maxBarValue) * 160));
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={it.key}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
              >
                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute -top-14 z-20 bg-stone-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none" dir="auto">
                    <div className="font-bold text-center border-b border-stone-700 pb-0.5 mb-1">
                      {it.label}
                    </div>
                    <div className="text-emerald-300">دخل: {fmtMoney(it.income, currency)}</div>
                    <div className="text-red-300">مصروف: {fmtMoney(it.expense, currency)}</div>
                    <div className="text-purple-300">سداد: {fmtMoney(it.debt_repaid, currency)}</div>
                  </div>
                )}

                {/* Bars Group */}
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                  <div
                    style={{ height: `${it.income > 0 ? incH : 2}px` }}
                    className="w-1/3 max-w-4 bg-emerald-600 rounded-t-sm transition-all duration-300 hover:brightness-110"
                  />
                  <div
                    style={{ height: `${it.expense > 0 ? expH : 2}px` }}
                    className="w-1/3 max-w-4 bg-red-500 rounded-t-sm transition-all duration-300 hover:brightness-110"
                  />
                  <div
                    style={{ height: `${it.debt_repaid > 0 ? repH : 2}px` }}
                    className="w-1/3 max-w-4 bg-purple-600 rounded-t-sm transition-all duration-300 hover:brightness-110"
                  />
                </div>

                <div className="text-[10px] text-stone-500 mt-2 truncate max-w-full text-center">
                  {it.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart 2: Debt Burn-down Curve & Category Breakdown side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Debt Burn-down Trend */}
        <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
            <span>مسار انخفاض الدين (Debt Burn-down)</span>
            <span className="text-[11px] text-purple-700 font-bold">كل دفعة تخفض المنحنى 📉</span>
          </div>

          <div className="h-36 w-full flex items-end relative pt-4 pb-2">
            {intervals.length > 1 ? (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333ea" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Area under curve */}
                {(() => {
                  const pts = intervals.map((it, i) => {
                    const x = (i / (intervals.length - 1)) * 100;
                    const val = it.remaining_debt ?? 0;
                    const y = 90 - (val / (maxDebt || 1)) * 80;
                    return `${x},${Math.max(10, Math.min(90, y))}`;
                  });
                  const polyPoints = `0,90 ${pts.join(" ")} 100,90`;
                  return <polygon points={polyPoints} fill="url(#debtGrad)" />;
                })()}

                {/* Main Curve Line */}
                {(() => {
                  const pts = intervals.map((it, i) => {
                    const x = (i / (intervals.length - 1)) * 100;
                    const val = it.remaining_debt ?? 0;
                    const y = 90 - (val / (maxDebt || 1)) * 80;
                    return `${x},${Math.max(10, Math.min(90, y))}`;
                  });
                  return (
                    <polyline
                      fill="none"
                      stroke="#9333ea"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pts.join(" ")}
                    />
                  );
                })()}

                {/* Point markers */}
                {intervals.map((it, i) => {
                  const x = (i / (intervals.length - 1)) * 100;
                  const val = it.remaining_debt ?? 0;
                  const y = 90 - (val / (maxDebt || 1)) * 80;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={Math.max(10, Math.min(90, y))}
                      r="3"
                      className="fill-purple-600 stroke-white stroke-2"
                    />
                  );
                })}
              </svg>
            ) : (
              <div className="w-full text-center text-xs text-stone-400 py-8">
                سجل أول عمليات سداد لرسم المنحنى
              </div>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-stone-400">
            <span>{intervals[0]?.label}</span>
            <span>{intervals[intervals.length - 1]?.label}</span>
          </div>
        </div>

        {/* Top Spending Categories */}
        <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/30 space-y-2.5">
          <div className="text-xs font-semibold text-stone-700">
            أعلى بنود الصرف خلال هذه الفترة
          </div>

          {topCategories.length === 0 ? (
            <div className="text-xs text-stone-400 py-8 text-center">
              لا توجد مصروفات مسجلة في هذه الفترة
            </div>
          ) : (
            <div className="space-y-2">
              {topCategories.map((cat, i) => (
                <div key={i} className="text-xs space-y-1">
                  <div className="flex justify-between items-center text-stone-800">
                    <span className="font-medium flex items-center gap-1.5" dir="auto">
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </span>
                    <span className="font-bold">
                      {fmtMoney(cat.amount, currency)}{" "}
                      <span className="text-[10px] font-normal text-stone-400">
                        ({cat.percentage}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-stone-200/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
