import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import {
  getCurrencies,
  getPeople,
  getPersonDebtSummaries,
  getPersonReceivableSummaries,
} from "@/lib/queries";
import { createPerson } from "@/app/actions/people";
import { fmtMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  await requireAuth();
  const people = getPeople();
  const currencies = getCurrencies();
  const debtSummaries = getPersonDebtSummaries();
  const receivableSummaries = getPersonReceivableSummaries();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            الأشخاص والديون والأمانات (People & Debts)
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            متابعة الأمانات التي بذمتك للآخرين لسدادها، والأموال المستحقة لك بالخارج لمتابعة تحصيلها
          </p>
        </div>
      </div>

      {/* Add Person Accordion */}
      <details className="card p-5 border-emerald-300 shadow-sm">
        <summary className="cursor-pointer font-bold text-emerald-800 text-base sm:text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>➕</span>
            <span>إضافة شخص جديد (صاحب أمانة أو شخص مدين لك)</span>
          </span>
          <span className="text-xs text-stone-400 font-normal">انقر لفتح النموذج</span>
        </summary>
        <form action={createPerson} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-base" dir="auto">
          <div className="col-span-1 sm:col-span-2">
            <label className="label">نوع المعاملة والذمة المالية</label>
            <select name="initial_type" defaultValue="debt" className="input font-bold text-base">
              <option value="debt">🔴 أنا مدين له (دين / أمانة في ذمتي واجب سدادها له)</option>
              <option value="receivable">🟢 هو مدين لي (سلفة / أموال مستحقة لي في ذمته بانتظار تحصيلها)</option>
            </select>
            <span className="helper-text">حدد إذا كان المبلغ ديناً عليك يجب أن تسدده أو مالاً لك في الخارج تنتظر تحصيله</span>
          </div>
          <div>
            <label className="label">اسم الشخص</label>
            <input name="name" required dir="auto" className="input font-semibold" placeholder="أحمد / علياء / محمد..." />
          </div>
          <div>
            <label className="label">صلة القرابة / ملاحظات (اختياري)</label>
            <input name="note" dir="auto" className="input font-medium" placeholder="صديقي / أختي — دبي..." />
          </div>
          <div>
            <label className="label">مبلغ الدين المبدئي (إن وجد)</label>
            <input
              name="initial_debt"
              type="number"
              step="any"
              className="input font-mono font-bold text-lg"
              placeholder="0.00"
            />
            <span className="helper-text">
              سيُسجل كالتزام أو كأموال مستحقة دون التأثير على أرصدة كاش حساباتك
            </span>
          </div>
          <div>
            <label className="label">العملة</label>
            <select name="initial_currency" defaultValue="EGP" className="input font-semibold">
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.name})
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1 sm:col-span-2 pt-2">
            <button className="btn w-full py-3 text-lg font-bold">إضافة الشخص وحفظ السجل</button>
          </div>
        </form>
      </details>

      {people.length === 0 && (
        <p className="text-base text-stone-500 py-8 text-center card p-6">
          لم يتم تسجيل أي أشخاص بعد — أضف الأشخاص وأماناتهم أو ديونهم بالأعلى لبدء المتابعة.
        </p>
      )}

      {/* 1. DEBTS OWED BY YOU (ديون وأمانات في ذمتك للآخرين) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-amber-950 flex items-center gap-2">
            <span>🤝</span>
            <span>ديون وأمانات عائلية في ذمتك (واجبة السداد عليك)</span>
          </h2>
          <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full">
            {debtSummaries.length} أشخاص
          </span>
        </div>

        {debtSummaries.length === 0 ? (
          <div className="card p-4 text-sm text-stone-500 bg-stone-50">
            لا توجد ديون مسجلة عليك حالياً بحمد الله.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {debtSummaries.map((p) => (
              <Link
                key={p.person_id}
                href={`/people/${p.person_id}`}
                className={`card p-4 sm:p-5 transition-all hover:border-emerald-600 hover:shadow-xs ${
                  p.is_settled
                    ? "border-emerald-200 bg-emerald-50/20"
                    : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div dir="auto" className="font-bold text-stone-900 truncate flex items-center gap-2 text-base">
                      <span>🤝</span>
                      <span>{p.name}</span>
                      {p.is_settled ? (
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                          خالص بالكامل ✓
                        </span>
                      ) : (
                        <span className="text-[11px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                          {p.progress}% مسدد
                        </span>
                      )}
                    </div>
                    {p.note && (
                      <div dir="auto" className="text-xs text-stone-500 truncate mt-0.5">
                        {p.note}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-black text-lg ${
                        p.is_settled
                          ? "text-emerald-700"
                          : p.remaining > 0
                            ? "text-amber-800"
                            : "text-stone-800"
                      }`}
                    >
                      {fmtMoney(p.remaining, p.currency)}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {p.is_settled
                        ? "تم سداده بالكامل"
                        : `متبقي من ${fmtMoney(p.total_debt_original, p.currency)}`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-stone-500 mt-2.5">
                  <span>مسدد: <b>{fmtMoney(p.repaid, p.currency)}</b></span>
                  <span className="text-emerald-800 font-bold hover:underline">كشف الحساب والسداد ←</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 2. RECEIVABLES (أموال مستحقة لك بالخارج بانتظار تحصيلها) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-emerald-950 flex items-center gap-2">
            <span>💼</span>
            <span>أموال مستحقة لك بالخارج (فلوس ليك برة — قيد التحصيل)</span>
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2.5 py-1 rounded-full">
            {receivableSummaries.length} أشخاص
          </span>
        </div>

        {receivableSummaries.length === 0 ? (
          <div className="card p-4 text-sm text-stone-500 bg-stone-50">
            لا توجد أموال مستحقة لك بالخارج مسجلة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {receivableSummaries.map((p) => (
              <Link
                key={p.person_id}
                href={`/people/${p.person_id}`}
                className={`card p-4 sm:p-5 transition-all hover:border-emerald-600 hover:shadow-xs ${
                  p.is_settled
                    ? "border-emerald-200 bg-emerald-50/20"
                    : "border-emerald-200/80 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div dir="auto" className="font-bold text-stone-900 truncate flex items-center gap-2 text-base">
                      <span>💼</span>
                      <span>{p.name}</span>
                      {p.is_settled ? (
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                          تم تحصيله بالكامل ✓
                        </span>
                      ) : (
                        <span className="text-[11px] bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full font-bold">
                          {p.progress}% محصل
                        </span>
                      )}
                    </div>
                    {p.note && (
                      <div dir="auto" className="text-xs text-stone-500 truncate mt-0.5">
                        {p.note}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-black text-lg ${
                        p.is_settled
                          ? "text-emerald-700"
                          : p.remaining > 0
                            ? "text-emerald-800"
                            : "text-stone-800"
                      }`}
                    >
                      {fmtMoney(p.remaining, p.currency)}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {p.is_settled
                        ? "تم تحصيله بالكامل"
                        : `مستحق من أصل ${fmtMoney(p.total_receivable_original, p.currency)}`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-stone-500 mt-2.5">
                  <span>تم تحصيله: <b>{fmtMoney(p.collected, p.currency)}</b></span>
                  <span className="text-emerald-800 font-bold hover:underline">كشف الحساب والتحصيل ←</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
