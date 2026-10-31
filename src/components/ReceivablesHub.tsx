"use client";

import Link from "next/link";
import type { OverallReceivableSummary, PersonReceivableSummary } from "@/lib/types";
import { fmtMoney } from "@/lib/money";

export default function ReceivablesHub({
  receivables,
  overallReceivables,
  onQuickCollectPerson,
}: {
  receivables: PersonReceivableSummary[];
  overallReceivables: OverallReceivableSummary[];
  onQuickCollectPerson?: (
    personId: number,
    personName: string,
    remainingAmount: number,
    currency: string
  ) => void;
}) {
  const activeReceivables = receivables.filter((r) => r.total_receivable_original > 0);
  const activeCurrencies = overallReceivables.filter((o) => o.total_receivable_original > 0);

  if (activeReceivables.length === 0) {
    return null;
  }

  return (
    <div className="card overflow-hidden border-teal-300 bg-gradient-to-b from-white to-stone-50/50 shadow-sm">
      {/* Header */}
      <div className="bg-teal-950 text-white p-5 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-teal-900 rounded-2xl shadow-inner border border-teal-800">
              💼
            </span>
            <div>
              <div className="text-xs sm:text-sm font-bold text-teal-300 uppercase tracking-wider">
                مستحقاتك الخارجية وأموال قيد التحصيل
              </div>
              <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 mt-0.5">
                أموال مستحقة لك في ذمة الآخرين (فلوس ليك برة)
              </h2>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-teal-300 font-bold mb-1">إجمالي المتبقي للتحصيل:</div>
            <div className="flex flex-wrap gap-2 justify-end">
              {activeCurrencies.map((c) => (
                <span
                  key={c.currency}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black bg-teal-500/30 text-teal-100 border border-teal-400/40 font-mono shadow-xs"
                >
                  {fmtMoney(c.total_remaining, c.currency)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Debtors List */}
      <div className="p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between text-sm font-bold text-stone-700 px-1">
          <span>المدينون لك ({activeReceivables.length})</span>
          <Link href="/people" className="text-xs text-teal-800 hover:underline font-bold">
            إدارة كافة الأشخاص والديون ←
          </Link>
        </div>

        <div className="space-y-2.5">
          {activeReceivables.map((p) => (
            <div
              key={p.person_id}
              className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 transition-all ${
                p.is_settled
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                  : "border-stone-200 bg-white hover:border-teal-400 hover:shadow-xs"
              }`}
            >
              <div className="min-w-48 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-900 text-base" dir="auto">
                    💼 {p.name}
                  </span>
                  {p.is_settled ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                      تم تحصيله بالكامل ✓
                    </span>
                  ) : (
                    <span className="text-xs bg-teal-100 text-teal-900 px-2.5 py-0.5 rounded-full font-bold">
                      {p.progress}% محصل
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
                    className="bg-teal-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-black text-stone-900 text-base sm:text-lg font-mono">
                    {fmtMoney(p.remaining, p.currency)}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    مستحق من أصل {fmtMoney(p.total_receivable_original, p.currency)}
                  </div>
                </div>

                {!p.is_settled && onQuickCollectPerson && (
                  <button
                    onClick={() =>
                      onQuickCollectPerson(p.person_id, p.name, p.remaining, p.currency)
                    }
                    className="btn text-sm py-2 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold cursor-pointer"
                  >
                    ⚡ تسجيل تحصيل
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}