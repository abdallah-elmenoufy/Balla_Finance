"use client";

import { useState } from "react";
import type { OverallDebtSummary, PersonDebtSummary } from "@/lib/types";
import { fmtMoney } from "@/lib/money";
import { calculateMilestones, MOTIVATIONAL_QUOTES } from "@/lib/motivation";

export default function DebtJourneyCard({
  overallDebt: initialOverallDebt,
  overallDebts,
  personDebts,
  onQuickPayPerson,
}: {
  overallDebt: OverallDebtSummary;
  overallDebts?: OverallDebtSummary[];
  personDebts: PersonDebtSummary[];
  onQuickPayPerson?: (
    personId: number,
    personName: string,
    remainingAmount: number,
    currency?: string
  ) => void;
}) {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const availableSummaries =
    overallDebts && overallDebts.length > 0 ? overallDebts : [initialOverallDebt];
  
  // Prefer the currency with active remaining debt
  const defaultCur =
    availableSummaries.find((s) => s.total_remaining > 0)?.currency ||
    initialOverallDebt.currency;
  const [selectedCurrency, setSelectedCurrency] = useState<string>(defaultCur);

  const overallDebt =
    availableSummaries.find((s) => s.currency === selectedCurrency) || availableSummaries[0];

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
    <div className="card overflow-hidden border-emerald-300 bg-gradient-to-b from-white to-stone-50/50 shadow-sm">
      {/* Header with Title and Level Badge */}
      <div className="bg-emerald-950 text-white p-5 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-emerald-900 rounded-2xl shadow-inner border border-emerald-800">
              {milestone.levelBadge}
            </span>
            <div>
              <div className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wider">
                رحلة التحرر من الديون والأمانات العائلية
              </div>
              <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 mt-0.5">
                {milestone.levelTitle}
              </h2>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 shadow-xs">
              {overallDebt.overall_progress}% تم سداده بحمد الله
            </span>
            {availableSummaries.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {availableSummaries.map((s) => (
                  <button
                    key={s.currency}
                    type="button"
                    onClick={() => setSelectedCurrency(s.currency)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                      selectedCurrency === s.currency
                        ? "bg-white text-emerald-950 shadow-xs font-black"
                        : "bg-emerald-900 text-emerald-200 hover:bg-emerald-800"
                    }`}
                  >
                    {s.currency === "EGP" ? "🇪🇬 الجنيه" : s.currency === "USD" ? "🇺🇸 الدولار" : s.currency} ({s.currency})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bars for All Active Currencies */}
        <div className="mt-4 space-y-3">
          {availableSummaries.map((s) => (
            <div key={s.currency} className="bg-emerald-900/40 rounded-2xl p-3 border border-emerald-800/80">
              <div className="flex justify-between items-center text-xs sm:text-sm text-emerald-200 mb-1.5 font-bold">
                <span className="flex items-center gap-1.5 text-white">
                  <span>{s.currency === "USD" ? "🇺🇸" : "🇪🇬"}</span>
                  <span>{s.currency === "USD" ? "ديون الدولار الأمريكي (USD)" : "ديون الجنيه المصري (EGP)"}</span>
                </span>
                <span className="font-mono text-emerald-300">
                  {fmtMoney(s.total_repaid, s.currency)} مسدد من أصل {fmtMoney(s.total_debt_original, s.currency)} ({s.overall_progress}%)
                </span>
              </div>
              <div className="h-3.5 w-full bg-emerald-950 rounded-full overflow-hidden p-0.5 border border-emerald-800 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${Math.max(s.overall_progress, 1)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="text-sm text-stone-500 font-bold">إجمالي الأمانات والديون الأصلية</div>
            <div className="space-y-1 mt-1.5">
              {availableSummaries.map((s) => (
                <div key={s.currency} className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
                  {fmtMoney(s.total_debt_original, s.currency)}
                </div>
              ))}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              عبر {activeDebts.length} حسابات لأفراد العائلة
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 shadow-2xs">
            <div className="text-sm text-emerald-900 font-bold flex items-center gap-1.5">
              <span>ما تم سداده حتى الآن</span>
              <span className="text-emerald-700">✓</span>
            </div>
            <div className="space-y-1 mt-1.5">
              {availableSummaries.map((s) => (
                <div key={s.currency} className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono flex items-baseline gap-2">
                  <span>{fmtMoney(s.total_repaid, s.currency)}</span>
                  <span className="text-xs font-bold text-emerald-600 font-sans">({s.overall_progress}%)</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-1">
              سقطت من ذمتك للأبد بفضل الله وتوفيقه
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 sm:p-5 shadow-2xs">
            <div className="text-sm text-amber-950 font-bold flex items-center gap-1.5">
              <span>المتبقي للتحرر التام</span>
              <span>🎯</span>
            </div>
            <div className="space-y-1 mt-1.5">
              {availableSummaries.map((s) => (
                <div key={s.currency} className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">
                  {fmtMoney(s.total_remaining, s.currency)}
                </div>
              ))}
            </div>
            <div className="text-xs text-amber-900 font-bold mt-1">
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
        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 p-4 sm:p-5 text-base flex items-start justify-between gap-4">
          <div className="flex-1" dir="auto">
            <div className="text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
              <span>💡</span>
              <span>زاد الطريق والعزيمة للوفاء بالأمانة</span>
            </div>
            <p className="text-stone-900 font-semibold italic leading-relaxed text-base sm:text-lg">
              &quot;{currentQuote.text}&quot;
            </p>
            {currentQuote.source && (
              <span className="text-xs text-stone-500 font-medium mt-1 block">— {currentQuote.source}</span>
            )}
          </div>
          <button
            onClick={nextQuote}
            className="text-emerald-800 hover:text-emerald-950 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            title="حكمة أخرى"
          >
            تغيير الحكمة 🔄
          </button>
        </div>

        {/* Family Debts Breakdown List */}
        {activeDebts.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm font-bold text-stone-700 px-1">
              <span>الأمانات العائلية المطلوب سدادها ({activeDebts.length})</span>
              <span>نسبة السداد</span>
            </div>

            <div className="space-y-2.5">
              {activeDebts.map((p) => (
                <div
                  key={p.person_id}
                  className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 transition-all ${
                    p.is_settled
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                      : "border-stone-200 bg-white hover:border-emerald-400 hover:shadow-xs"
                  }`}
                >
                  <div className="min-w-48 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-base" dir="auto">
                        🤝 {p.name}
                      </span>
                      {p.is_settled ? (
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                          خالص بالكامل ✓
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                          {p.progress}% مسدد
                        </span>
                      )}
                    </div>
                    {p.note && (
                      <div className="text-xs text-stone-500 mt-0.5 truncate" dir="auto">
                        {p.note}
                      </div>
                    )}
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-2.5">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-black text-stone-900 text-base sm:text-lg">
                        {fmtMoney(p.remaining, p.currency)}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        متبقي من أصل {fmtMoney(p.total_debt_original, p.currency)}
                      </div>
                    </div>

                    {!p.is_settled && onQuickPayPerson && (
                      <button
                        onClick={() => onQuickPayPerson(p.person_id, p.name, p.remaining, p.currency)}
                        className="btn text-sm py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer"
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
