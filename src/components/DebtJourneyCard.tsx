"use client";

import { useState } from "react";
import type { OverallDebtSummary, PersonDebtSummary } from "@/lib/types";
import { fmtMoney } from "@/lib/money";
import { calculateMilestones, MOTIVATIONAL_QUOTES } from "@/lib/motivation";

export default function DebtJourneyCard({
  overallDebt,
  personDebts,
  onQuickPayPerson,
}: {
  overallDebt: OverallDebtSummary;
  personDebts: PersonDebtSummary[];
  onQuickPayPerson?: (personId: number, personName: string, remainingAmount: number) => void;
}) {
  const [quoteIdx, setQuoteIdx] = useState(0);

  const milestone = calculateMilestones(
    overallDebt.total_debt_original,
    overallDebt.total_repaid,
    overallDebt.currency
  );

  const activeDebts = personDebts.filter((p) => p.total_debt_original > 0);
  const currentQuote = MOTIVATIONAL_QUOTES[quoteIdx % MOTIVATIONAL_QUOTES.length];

  function nextQuote() {
    setQuoteIdx((i) => i + 1);
  }

  return (
    <div className="card overflow-hidden border-emerald-200 bg-gradient-to-b from-white to-stone-50/50 shadow-sm">
      {/* Header with Title and Level Badge */}
      <div className="bg-emerald-900 text-white p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 bg-emerald-800 rounded-xl shadow-inner">
              {milestone.levelBadge}
            </span>
            <div>
              <div className="text-xs font-medium text-emerald-200 uppercase tracking-wider">
                رحلة التحرر من الديون والأمانات
              </div>
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                {milestone.levelTitle}
              </h2>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
              {overallDebt.overall_progress}% تم سداده
            </span>
          </div>
        </div>

        {/* Progress Bar with Milestones */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-emerald-200 mb-1.5 font-medium">
            <span>البداية</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>الحرية الكاملة 👑</span>
          </div>
          <div className="h-3 w-full bg-emerald-950/70 rounded-full overflow-hidden p-0.5 border border-emerald-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${Math.max(overallDebt.overall_progress, 1)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
            <div className="text-xs text-stone-500 font-medium">إجمالي الأمانات والديون الأصلية</div>
            <div className="text-lg sm:text-xl font-bold text-stone-900 mt-1">
              {fmtMoney(overallDebt.total_debt_original, overallDebt.currency)}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              عبر {overallDebt.active_debts_count + overallDebt.settled_debts_count} حسابات عائلية
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 shadow-2xs">
            <div className="text-xs text-emerald-800 font-medium flex items-center gap-1">
              <span>ما تم سداده حتى الآن</span>
              <span>✓</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">
              {fmtMoney(overallDebt.total_repaid, overallDebt.currency)}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5">
              سقطت من ذمتك للأبد بفضل الله
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-2xs">
            <div className="text-xs text-amber-900 font-medium flex items-center gap-1">
              <span>المتبقي للتحرر التام</span>
              <span>🎯</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-amber-700 mt-1">
              {fmtMoney(overallDebt.total_remaining, overallDebt.currency)}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">
              {milestone.remainingToNextMilestone > 0 ? (
                <>
                  باقي {fmtMoney(milestone.remainingToNextMilestone, overallDebt.currency)} لمحطة{" "}
                  {milestone.nextMilestonePercent}%
                </>
              ) : (
                milestone.message
              )}
            </div>
          </div>
        </div>

        {/* Motivational Quote Box */}
        <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 p-3.5 text-sm flex items-start justify-between gap-3">
          <div className="flex-1" dir="auto">
            <div className="text-xs font-semibold text-emerald-800 mb-0.5">💡 زاد الطريق والعزيمة</div>
            <p className="text-stone-800 font-medium italic leading-relaxed">
              &quot;{currentQuote.text}&quot;
            </p>
            {currentQuote.source && (
              <span className="text-xs text-stone-500 mt-0.5 block">— {currentQuote.source}</span>
            )}
          </div>
          <button
            onClick={nextQuote}
            className="text-emerald-700 hover:text-emerald-900 text-xs px-2.5 py-1 rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-colors whitespace-nowrap cursor-pointer"
            title="حكمة أخرى"
          >
            تغيير 🔄
          </button>
        </div>

        {/* Family Debts Breakdown List */}
        {activeDebts.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 px-1">
              <span>الأمانات العائلية المطلوب سدادها ({activeDebts.length})</span>
              <span>نسبة السداد</span>
            </div>

            <div className="space-y-2">
              {activeDebts.map((p) => (
                <div
                  key={p.person_id}
                  className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-2.5 transition-all ${
                    p.is_settled
                      ? "border-emerald-200 bg-emerald-50/40 text-emerald-900"
                      : "border-stone-200 bg-white hover:border-emerald-400"
                  }`}
                >
                  <div className="min-w-44 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900" dir="auto">
                        🤝 {p.name}
                      </span>
                      {p.is_settled ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          خالص بالكامل ✓
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          {p.progress}% مسدد
                        </span>
                      )}
                    </div>
                    {p.note && (
                      <div className="text-xs text-stone-500 truncate" dir="auto">
                        {p.note}
                      </div>
                    )}
                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <div className="font-bold text-stone-900 text-sm">
                        {fmtMoney(p.remaining, p.currency)}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        من أصل {fmtMoney(p.total_debt_original, p.currency)}
                      </div>
                    </div>

                    {!p.is_settled && onQuickPayPerson && (
                      <button
                        onClick={() => onQuickPayPerson(p.person_id, p.name, p.remaining)}
                        className="btn text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium cursor-pointer"
                      >
                        ⚡ سداد دفعة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
