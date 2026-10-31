"use client";

import { useState } from "react";
import type { AccountWithBalance } from "@/lib/types";
import type { MonthlyInstallmentGroup } from "@/lib/queries";
import { fmtMoney, todayISO } from "@/lib/money";
import { payInstallment } from "@/app/actions/bnpl";

export default function BnplMonthlySchedule({
  schedule,
  fundingAccounts,
}: {
  schedule: MonthlyInstallmentGroup[];
  fundingAccounts: AccountWithBalance[];
}) {
  const today = todayISO();
  const currentMonthKey = today.slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to current month if in schedule, or the first upcoming month with pending installments
    const hasCurrent = schedule.find((s) => s.month === currentMonthKey);
    if (hasCurrent) return currentMonthKey;
    const firstPending = schedule.find((s) => s.totalDue > 0);
    return firstPending ? firstPending.month : schedule[0]?.month ?? "";
  });

  const activeGroup = schedule.find((s) => s.month === selectedMonth) || schedule[0];

  if (!schedule || schedule.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-stone-500 bg-stone-50">
        لا توجد أقساط مسجلة حالياً.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month Pill Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {schedule.map((group) => {
          const isCurrent = group.month === currentMonthKey;
          const isSelected = group.month === selectedMonth;
          const hasPending = group.totalDue > 0;
          return (
            <button
              key={group.month}
              type="button"
              onClick={() => setSelectedMonth(group.month)}
              className={`px-4 py-2 rounded-2xl border text-sm font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 shadow-2xs ${
                isSelected
                  ? "bg-purple-900 text-white border-purple-900 shadow-sm"
                  : isCurrent
                    ? "bg-purple-50 text-purple-950 border-purple-300 hover:bg-purple-100"
                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:border-purple-300"
              }`}
            >
              <span>{group.label}</span>
              {hasPending ? (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                    isSelected ? "bg-purple-800 text-purple-100" : "bg-purple-200 text-purple-900"
                  }`}
                >
                  {fmtMoney(group.totalDue, group.currency)}
                </span>
              ) : (
                <span className="text-xs text-emerald-600 font-bold">✓ خالص</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Month Details Card */}
      {activeGroup && (
        <div className="card p-5 sm:p-6 border-purple-200 bg-white space-y-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-100 pb-3">
            <div>
              <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                متابعة جدول الأقساط الشهرية
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5">
                📅 أقساط شهر {activeGroup.label}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-stone-500">مجموع المستحق هذا الشهر:</div>
              <div className="text-xl sm:text-2xl font-black text-purple-900 font-mono">
                {fmtMoney(activeGroup.totalDue, activeGroup.currency)}
              </div>
            </div>
          </div>

          {/* List of Installments in Selected Month */}
          <div className="space-y-3">
            {activeGroup.installments.map((inst) => {
              const isOverdue = inst.status === "pending" && inst.due_date < today;
              const isDueToday = inst.status === "pending" && inst.due_date === today;
              const isPaid = inst.status === "paid";

              return (
                <div
                  key={inst.id}
                  className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 transition-all ${
                    isPaid
                      ? "border-emerald-200 bg-emerald-50/30 text-emerald-950"
                      : isOverdue
                        ? "border-red-300 bg-red-50/50 text-red-950"
                        : isDueToday
                          ? "border-amber-300 bg-amber-50/60 text-amber-950"
                          : "border-stone-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <div className="min-w-48 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧾</span>
                      <span className="font-bold text-stone-900 text-base" dir="auto">
                        {inst.plan_description}
                      </span>
                      <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold">
                        قسط #{inst.seq}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-semibold">
                        {inst.account_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 font-medium">
                      <span>تاريخ الاستحقاق: <b className="font-mono text-stone-700">{inst.due_date}</b></span>
                      {isOverdue && (
                        <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-full">
                          ⚠️ متأخر عن موعده!
                        </span>
                      )}
                      {isDueToday && (
                        <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                          ⚡ يستحق اليوم!
                        </span>
                      )}
                      {isPaid && (
                        <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ تم سداده
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-black text-stone-900 font-mono">
                        {fmtMoney(inst.amount, inst.currency)}
                      </div>
                    </div>

                    {!isPaid && fundingAccounts.length > 0 && (
                      <form action={payInstallment} className="flex items-center gap-1.5">
                        <input type="hidden" name="installment_id" value={inst.id} />
                        <select
                          name="funding_account_id"
                          className="input text-xs py-1.5 px-2 font-semibold w-28 sm:w-36"
                          required
                        >
                          {fundingAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.currency})
                            </option>
                          ))}
                        </select>
                        <button className="btn text-xs py-1.5 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer whitespace-nowrap shadow-2xs">
                          سداد الآن 💳
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}