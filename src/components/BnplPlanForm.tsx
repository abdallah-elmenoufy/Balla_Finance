"use client";

import { useEffect, useState } from "react";
import type { Account, Currency } from "@/lib/types";
import { addMonths, todayISO } from "@/lib/money";

interface ScheduleItem {
  seq: number;
  due_date: string;
  amount: string;
}

export default function BnplPlanForm({
  accounts,
  currencies,
  action,
}: {
  accounts: Account[];
  currencies: Currency[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState(String(accounts[0]?.id ?? ""));
  const [principal, setPrincipal] = useState("");
  const [feesTotal, setFeesTotal] = useState("");
  const [count, setCount] = useState("12");
  const [firstDueDate, setFirstDueDate] = useState(() => {
    // Default first due date: 1 month from now
    return addMonths(todayISO(), 1);
  });
  const [customSchedule, setCustomSchedule] = useState(false);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  const selectedAccount = accounts.find((a) => String(a.id) === selectedAccountId);
  const cur = selectedAccount?.currency ?? "EGP";

  const numPrincipal = parseFloat(principal) || 0;
  const numFees = parseFloat(feesTotal) || 0;
  const totalAmount = numPrincipal + numFees;
  const numCount = parseInt(count, 10) || 0;

  // Auto-generate schedule whenever count, firstDueDate, or total changes
  useEffect(() => {
    if (numCount > 0 && numCount <= 60 && firstDueDate) {
      const per = totalAmount > 0 ? (totalAmount / numCount).toFixed(2) : "0.00";
      const items: ScheduleItem[] = [];
      for (let i = 0; i < numCount; i++) {
        items.push({
          seq: i + 1,
          due_date: addMonths(firstDueDate, i),
          amount: per,
        });
      }
      setScheduleItems(items);
    }
  }, [numCount, firstDueDate, totalAmount]);

  function handleScheduleDateChange(index: number, newDate: string) {
    setScheduleItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], due_date: newDate };
      return next;
    });
  }

  function handleScheduleAmountChange(index: number, newAmount: string) {
    setScheduleItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], amount: newAmount };
      return next;
    });
  }

  const scheduleSum = scheduleItems.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );
  const diff = totalAmount - scheduleSum;
  const isBalanced = Math.abs(diff) < 0.05;

  function autoDistributeDifference() {
    if (scheduleItems.length === 0) return;
    const per = (totalAmount / scheduleItems.length).toFixed(2);
    setScheduleItems((prev) =>
      prev.map((item) => ({
        ...item,
        amount: per,
      }))
    );
  }

  return (
    <form action={action} className="space-y-4 text-base" dir="auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">الجهة الممولة (فاليو / سهولة / تررو...)</label>
          <select
            name="account_id"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="input font-semibold"
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji ?? "🧾"} {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">ماذا اشتريت؟ (المشتريات / السلعة)</label>
          <input
            name="description"
            dir="auto"
            required
            className="input font-semibold"
            placeholder="موبايل آيفون / تكييف / لابتوب..."
          />
        </div>

        <div>
          <label className="label">تاريخ الشراء</label>
          <input
            name="purchase_date"
            type="date"
            defaultValue={todayISO()}
            className="input font-semibold"
            required
          />
        </div>

        <div>
          <label className="label">تاريخ استحقاق أول قسط</label>
          <input
            name="first_due_date"
            type="date"
            value={firstDueDate}
            onChange={(e) => setFirstDueDate(e.target.value)}
            className="input font-semibold"
            required
          />
        </div>

        <div>
          <label className="label">سعر السلعة الأصلي (Principal)</label>
          <input
            name="principal"
            type="number"
            step="any"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            required
            className="input text-lg font-bold font-mono"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="label">إجمالي الفوائد والمصاريف الإدارية (اختياري)</label>
          <input
            name="fees_total"
            type="number"
            step="any"
            value={feesTotal}
            onChange={(e) => setFeesTotal(e.target.value)}
            className="input text-lg font-bold font-mono"
            placeholder="0.00"
          />
          <span className="helper-text">تضاف إلى السعر الأصلي لتقسيمها على الأقساط</span>
        </div>

        <div className="col-span-1 sm:col-span-2">
          <label className="label">عدد الأقساط (شهر)</label>
          <input
            name="installment_count"
            type="number"
            min={1}
            max={60}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            required
            className="input text-lg font-bold font-mono w-full sm:w-1/2"
            placeholder="12"
          />
        </div>
      </div>

      {/* Total Overview Box */}
      {totalAmount > 0 && (
        <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <span className="text-stone-500">الإجمالي الكلي المطلوب سداده: </span>
            <b className="text-stone-900 text-lg font-mono">
              {totalAmount.toLocaleString()} {cur}
            </b>
            <span className="text-xs text-stone-500 mr-2">
              (بمتوسط {((totalAmount / (numCount || 1)) || 0).toFixed(2)} {cur} / شهر)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setCustomSchedule(!customSchedule)}
            className={`btn text-xs py-1.5 px-3.5 cursor-pointer font-bold ${
              customSchedule ? "bg-purple-700 text-white" : "btn-secondary"
            }`}
          >
            {customSchedule ? "✓ إغلاق تخصيص الأقساط" : "⚙️ تخصيص مواعيد ومبالغ كل قسط"}
          </button>
        </div>
      )}

      {/* Interactive Custom Schedule Table */}
      {customSchedule && scheduleItems.length > 0 && (
        <div className="rounded-2xl border border-purple-300 bg-purple-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-bold text-purple-950 text-sm">
                جدول الأقساط المخصصة ({scheduleItems.length} قسط)
              </h4>
              <p className="text-xs text-purple-900/80">
                يمكنك تعديل موعد أو قيمة أي قسط على حدة لمطابقة جدول فاليو أو سهولة الفعلي
              </p>
            </div>
            {!isBalanced && (
              <button
                type="button"
                onClick={autoDistributeDifference}
                className="text-xs text-purple-800 underline font-bold cursor-pointer"
              >
                إعادة توزيع بالتساوي على الكل 🔄
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-stone-500 pb-1 border-b border-purple-200">
              <span className="col-span-2">القسط</span>
              <span className="col-span-5">تاريخ الاستحقاق</span>
              <span className="col-span-5">المبلغ ({cur})</span>
            </div>
            {scheduleItems.map((item, idx) => (
              <div key={item.seq} className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-2 text-xs font-bold text-stone-600 font-mono">
                  قسط #{item.seq}
                </span>
                <input
                  type="date"
                  value={item.due_date}
                  onChange={(e) => handleScheduleDateChange(idx, e.target.value)}
                  className="col-span-5 input text-xs py-1.5 px-2 font-semibold"
                  required
                />
                <input
                  type="number"
                  step="any"
                  value={item.amount}
                  onChange={(e) => handleScheduleAmountChange(idx, e.target.value)}
                  className="col-span-5 input text-xs py-1.5 px-2 font-mono font-bold"
                  placeholder="0.00"
                  required
                />
              </div>
            ))}
          </div>

          {/* Sum check alert */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-purple-200 font-bold">
            <span className="text-stone-600">
              مجموع مبالغ الأقساط: <b className="font-mono text-stone-900">{scheduleSum.toLocaleString()} {cur}</b>
            </span>
            {isBalanced ? (
              <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                ✓ متطابق مع إجمالي السعر تماماً
              </span>
            ) : (
              <span className="text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                ⚠️ الفارق: {diff.toFixed(2)} {cur}
              </span>
            )}
          </div>

          <input
            type="hidden"
            name="custom_schedule_json"
            value={JSON.stringify(scheduleItems)}
          />
        </div>
      )}

      <div className="pt-2">
        <button className="btn w-full py-3 text-lg font-bold bg-purple-700 hover:bg-purple-800 text-white">
          حفظ وتثبيت خطة التقسيط والأقساط 🧾
        </button>
      </div>
    </form>
  );
}