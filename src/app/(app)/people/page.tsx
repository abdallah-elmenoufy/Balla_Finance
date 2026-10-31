import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getCurrencies, getPeople, getPersonDebtSummaries } from "@/lib/queries";
import { createPerson } from "@/app/actions/people";
import { fmtMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  await requireAuth();
  const people = getPeople();
  const currencies = getCurrencies();
  const debtSummaries = getPersonDebtSummaries();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            الأمانات والديون العائلية — People & Debts
          </h1>
          <p className="text-sm text-stone-500">
            متابعة الأمانات التي بذمتك للعائلة، ومعدل سدادك لها للتحرر من أي دين
          </p>
        </div>
      </div>

      {/* Add Person Accordion */}
      <details className="card p-4 border-emerald-200">
        <summary className="cursor-pointer font-bold text-emerald-800 text-sm">
          ➕ إضافة شخص / صاحب أمانة جديد
        </summary>
        <form action={createPerson} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="label">الاسم</label>
            <input name="name" required dir="auto" className="input" placeholder="علياء / أحمد..." />
          </div>
          <div>
            <label className="label">صلة القرابة / ملاحظات (اختياري)</label>
            <input name="note" dir="auto" className="input" placeholder="أختي — دبي" />
          </div>
          <div>
            <label className="label">مبلغ الدين أو الأمانة السابقة (إن وجد)</label>
            <input
              name="initial_debt"
              type="number"
              step="any"
              className="input font-mono"
              placeholder="0.00"
            />
            <span className="text-[11px] text-stone-400 mt-1 block">
              سيُسجل كدين مطلوب سداده دون إضافة كاش وهمي لحساباتك
            </span>
          </div>
          <div>
            <label className="label">العملة</label>
            <select name="initial_currency" defaultValue="EGP" className="input">
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.name})
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1 sm:col-span-2 pt-2">
            <button className="btn w-full">إضافة الشخص وحفظ الدين</button>
          </div>
        </form>
      </details>

      {people.length === 0 && (
        <p className="text-sm text-stone-500 py-8 text-center">
          لم يتم تسجيل أي أشخاص بعد — أضف الأشخاص وأماناتهم بالأعلى لمتابعة خطة السداد.
        </p>
      )}

      {/* People Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {debtSummaries.map((p) => {
          return (
            <Link
              key={p.person_id}
              href={`/people/${p.person_id}`}
              className={`card p-4 transition-all hover:border-emerald-600 ${
                p.is_settled
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div dir="auto" className="font-bold text-stone-900 truncate flex items-center gap-2">
                    <span>🤝</span>
                    <span>{p.name}</span>
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
                    <div dir="auto" className="text-xs text-stone-500 truncate mt-0.5">
                      {p.note}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div
                    className={`font-bold text-base ${
                      p.is_settled
                        ? "text-emerald-700"
                        : p.remaining > 0
                          ? "text-amber-800"
                          : "text-stone-800"
                    }`}
                  >
                    {fmtMoney(p.remaining, p.currency)}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {p.is_settled
                      ? "تم سداده بالكامل"
                      : `متبقي من أصل ${fmtMoney(p.total_debt_original, p.currency)}`}
                  </div>
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${p.progress}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-stone-500 mt-2">
                <span>تم سداده: {fmtMoney(p.repaid, p.currency)}</span>
                <span className="text-emerald-700 font-semibold">عرض كشف الحساب →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
