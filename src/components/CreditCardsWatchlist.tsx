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
    <div className="card p-5 sm:p-6 space-y-4 border-amber-300 bg-white shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl p-2 rounded-xl bg-amber-50 border border-amber-200">💳</span>
          <div>
            <h2 className="font-bold text-stone-900 text-lg sm:text-xl">
              حماية البطاقات الائتمانية من الغرامات البنكية
            </h2>
            <div className="text-xs sm:text-sm text-stone-500 mt-0.5">
              متابعة مواعيد استحقاق الدفع لتفادي الفوائد التراكمية وغرامات التأخير
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const isUrgent = card.status === "urgent" || card.status === "overdue";
          const isSoon = card.status === "soon";
          const isPaid = card.status === "paid";
          const available =
            card.credit_limit && card.credit_limit > 0
              ? Math.max(0, card.credit_limit - card.owed_amount)
              : null;

          return (
            <div
              key={card.id}
              className={`rounded-2xl border p-5 transition-all relative overflow-hidden ${
                isPaid
                  ? "border-emerald-200 bg-emerald-50/40"
                  : isUrgent
                    ? "border-red-300 bg-red-50/60 shadow-xs"
                    : isSoon
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-stone-200 bg-white"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl p-2 rounded-xl bg-white border border-stone-200 shadow-2xs">
                    {card.emoji ?? "🟠"}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-base sm:text-lg truncate" dir="auto">
                      {card.name}
                    </h3>
                    <div className="text-xs sm:text-sm text-stone-500 mt-0.5">
                      يوم السداد: <b>يوم {card.due_day}</b> من كل شهر
                      {card.statement_day && <> · كشف الحساب: يوم {card.statement_day}</>}
                    </div>
                  </div>
                </div>

                <div className="text-right whitespace-nowrap">
                  <div
                    className={`font-black text-xl sm:text-2xl ${
                      isPaid ? "text-emerald-700" : isUrgent ? "text-red-600" : "text-stone-900"
                    }`}
                  >
                    {isPaid ? "0.00 " + card.currency : fmtMoney(card.owed_amount, card.currency)}
                  </div>
                  <div className="text-xs text-stone-500 font-bold mt-0.5">
                    {isPaid ? "مسددة بالكامل ✓" : "مديونية مطلوب سدادها"}
                  </div>
                </div>
              </div>

              {/* Status pill & Due Warning */}
              <div className="mt-4 flex items-center justify-between flex-wrap gap-2.5">
                <div className="text-xs sm:text-sm font-bold">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      ✓ لا توجد مستحقات مطلوبة
                    </span>
                  ) : card.status === "overdue" ? (
                    <span className="inline-flex items-center gap-1.5 text-red-800 bg-red-100 px-3 py-1 rounded-full animate-pulse font-black">
                      🚨 فات موعد السداد! سدد فوراً
                    </span>
                  ) : card.days_left <= 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-red-800 bg-red-100 px-3 py-1 rounded-full font-black">
                      🚨 مستحق السداد اليوم!
                    </span>
                  ) : card.days_left === 1 ? (
                    <span className="inline-flex items-center gap-1.5 text-red-800 bg-red-100 px-3 py-1 rounded-full font-black">
                      ⚠️ مستحق غداً ({card.next_due_date})
                    </span>
                  ) : card.days_left <= 3 ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-900 bg-amber-100 px-3 py-1 rounded-full font-bold">
                      ⏰ مستحق خلال {card.days_left} أيام ({card.next_due_date})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-stone-700 bg-stone-100 px-3 py-1 rounded-full font-medium">
                      📅 الاستحقاق: {card.next_due_date} (خلال {card.days_left} يوم)
                    </span>
                  )}
                </div>

                {!isPaid && onQuickPayCard && (
                  <button
                    onClick={() => onQuickPayCard(card.id, card.name, card.owed_amount)}
                    className={`btn text-sm py-2 px-4 rounded-xl font-bold cursor-pointer ${
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
                <div className="mt-4 pt-3 border-t border-stone-200/80 space-y-1.5">
                  <div className="flex justify-between text-xs text-stone-600 font-medium">
                    <span>
                      الحد: <b>{fmtMoney(card.credit_limit, card.currency)}</b> (مستهلك: <b>{card.utilization_percent}%</b>)
                    </span>
                    <span>
                      المتاح للشراء: <b className="text-emerald-700">{fmtMoney(available ?? 0, card.currency)}</b>
                    </span>
                  </div>
                  <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (card.utilization_percent ?? 0) > 70
                          ? "bg-red-500"
                          : (card.utilization_percent ?? 0) > 40
                            ? "bg-amber-500"
                            : "bg-emerald-600"
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
