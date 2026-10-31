"use client";

import type { CreditCardStatus } from "@/lib/types";
import { fmtMoney } from "@/lib/money";

export default function CreditCardsWatchlist({
  cards,
  onQuickPayCard,
}: {
  cards: CreditCardStatus[];
  onQuickPayCard?: (cardId: number, cardName: string, owedAmount: number) => void;
}) {
  if (cards.length === 0) return null;

  return (
    <div className="card p-4 sm:p-5 space-y-3 border-amber-200/80 bg-white">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">💳</span>
          <div>
            <h2 className="font-bold text-stone-900 text-base">
              حماية البطاقات الائتمانية من الغرامات
            </h2>
            <div className="text-xs text-stone-500">
              متابعة مواعيد استحقاق الدفع لتفادي الفوائد وغرامات التأخير البنكية
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => {
          const isUrgent = card.status === "urgent" || card.status === "overdue";
          const isSoon = card.status === "soon";
          const isPaid = card.status === "paid";

          return (
            <div
              key={card.id}
              className={`rounded-xl border p-4 transition-all relative overflow-hidden ${
                isPaid
                  ? "border-emerald-200 bg-emerald-50/30"
                  : isUrgent
                    ? "border-red-300 bg-red-50/50 shadow-sm"
                    : isSoon
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-stone-200 bg-white"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{card.emoji ?? "🟠"}</span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm truncate" dir="auto">
                      {card.name}
                    </h3>
                    <div className="text-xs text-stone-500">
                      يوم السداد: {card.due_day} من كل شهر
                      {card.statement_day && <> · كشف الحساب: يوم {card.statement_day}</>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-bold text-base whitespace-nowrap ${
                      isPaid ? "text-emerald-700" : isUrgent ? "text-red-600" : "text-stone-900"
                    }`}
                  >
                    {isPaid ? "0.00 " + card.currency : fmtMoney(card.owed_amount, card.currency)}
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium">
                    {isPaid ? "مسددة بالكامل ✓" : "مطلوب سداده عليك"}
                  </div>
                </div>
              </div>

              {/* Status pill & Due Warning */}
              <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-semibold">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                      ✓ لا توجد مستحقات مطلوبة
                    </span>
                  ) : card.status === "overdue" ? (
                    <span className="inline-flex items-center gap-1 text-red-800 bg-red-100 px-2.5 py-1 rounded-full animate-pulse">
                      🚨 فات موعد السداد! سدد فوراً
                    </span>
                  ) : card.days_left <= 0 ? (
                    <span className="inline-flex items-center gap-1 text-red-800 bg-red-100 px-2.5 py-1 rounded-full">
                      🚨 مستحق السداد اليوم!
                    </span>
                  ) : card.days_left === 1 ? (
                    <span className="inline-flex items-center gap-1 text-red-800 bg-red-100 px-2.5 py-1 rounded-full">
                      ⚠️ مستحق غداً ({card.next_due_date})
                    </span>
                  ) : card.days_left <= 3 ? (
                    <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
                      ⏰ مستحق خلال {card.days_left} أيام ({card.next_due_date})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-stone-700 bg-stone-100 px-2.5 py-1 rounded-full">
                      📅 الاستحقاق: {card.next_due_date} (خلال {card.days_left} يوم)
                    </span>
                  )}
                </div>

                {!isPaid && onQuickPayCard && (
                  <button
                    onClick={() => onQuickPayCard(card.id, card.name, card.owed_amount)}
                    className={`btn text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer ${
                      isUrgent
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-emerald-700 hover:bg-emerald-800 text-white"
                    }`}
                  >
                    ⚡ سداد البطاقة الآن
                  </button>
                )}
              </div>

              {/* Credit Limit & Utilization */}
              {card.credit_limit != null && card.credit_limit > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100">
                  <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                    <span>
                      نسبة الاستخدام: <b>{card.utilization_percent}%</b>
                    </span>
                    <span>الحد الائتماني: {fmtMoney(card.credit_limit, card.currency)}</span>
                  </div>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (card.utilization_percent ?? 0) > 70
                          ? "bg-red-500"
                          : (card.utilization_percent ?? 0) > 40
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${card.utilization_percent ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
