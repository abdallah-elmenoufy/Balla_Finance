import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getCurrencies, getPerson, personLedger, personTxnCount } from "@/lib/queries";
import { deletePerson, updatePerson } from "@/app/actions/people";
import ConfirmButton from "@/components/ConfirmButton";
import { fmtMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const person = getPerson(Number(id));
  if (!person) notFound();
  const currencies = getCurrencies();
  const ledger = personLedger(person.id);
  const txnCount = personTxnCount(person.id);

  const cur = person.initial_currency || "EGP";
  const initial = person.initial_debt || 0;
  const isReceivable = person.initial_type === "receivable";

  let repaidOrCollected = 0;
  for (const e of ledger) {
    if (isReceivable) {
      if (e.txn.type === "person_in") {
        repaidOrCollected += e.txn.person_amount ?? 0;
      }
    } else {
      if (e.txn.type === "person_out" || (e.txn.type === "expense" && e.txn.person_id)) {
        repaidOrCollected += e.txn.person_amount ?? 0;
      }
    }
  }

  const finalBalances = new Map<string, number>();
  for (const e of ledger) {
    finalBalances.set(e.txn.person_currency ?? cur, e.balance);
  }
  if (!finalBalances.has(cur)) {
    finalBalances.set(cur, isReceivable ? -initial : initial);
  }

  const remaining = Math.max(0, Math.abs(finalBalances.get(cur) ?? initial));
  const totalOriginal = Math.max(initial, initial + Math.max(0, remaining - initial));
  const progress =
    totalOriginal > 0
      ? Math.min(100, Math.round((repaidOrCollected / totalOriginal) * 100))
      : 100;
  const isSettled = remaining === 0 && totalOriginal > 0;

  return (
    <div className="space-y-4">
      <div className="text-sm text-stone-500">
        <Link href="/people" className="hover:underline flex items-center gap-1 font-semibold text-emerald-800">
          <span>←</span>
          <span>الرجوع إلى قائمة الأشخاص والديون</span>
        </Link>
      </div>

      {/* Hero Person Card */}
      <div className="card p-5 space-y-4 border-stone-200 bg-white">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isReceivable ? "💼" : "🤝"}</span>
              <h1 dir="auto" className="text-xl sm:text-2xl font-bold text-stone-900">
                {person.name}
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  isReceivable ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-900"
                }`}
              >
                {isReceivable ? "أموال مستحقة لك عنده" : "أمانة ودين في ذمتك له"}
              </span>
              {isSettled ? (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  خالص بالكامل ✓
                </span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                  {progress}% {isReceivable ? "تم تحصيله" : "تم سداده"}
                </span>
              )}
            </div>
            {person.note && (
              <div dir="auto" className="text-sm text-stone-500 mt-1">
                {person.note}
              </div>
            )}
          </div>

          <div className="text-right">
            <div
              className={`text-2xl font-black ${
                isSettled ? "text-emerald-700" : isReceivable ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {fmtMoney(remaining, cur)}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              {isSettled
                ? isReceivable
                  ? "تم تحصيل المبلغ بالكامل"
                  : "تم سداد الدين بالكامل"
                : isReceivable
                  ? "المتبقي لك عنده بانتظار تحصيله"
                  : "المتبقي عليك سداده له"}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-stone-100">
          <div className="flex justify-between text-xs text-stone-500">
            <span>
              {isReceivable ? "تم تحصيله: " : "تم سداده: "}
              <b>{fmtMoney(repaidOrCollected, cur)}</b>
            </span>
            <span>
              {isReceivable ? "المبلغ الأصلي المستحق: " : "الدين الأصلي: "}
              <b>{fmtMoney(totalOriginal, cur)}</b>
            </span>
          </div>
          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isReceivable ? "bg-teal-600" : "bg-emerald-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons & Edit Details */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/people/${person.id}/statement`} className="btn">
          📄 طباعة كشف الحساب (Statement)
        </Link>

        <details className="card p-3 flex-1 min-w-64">
          <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
            ✏️ تعديل بيانات الشخص والدين الأصلي
          </summary>
          <form action={updatePerson.bind(null, person.id)} className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="col-span-2">
              <label className="label">الاسم</label>
              <input name="name" defaultValue={person.name} dir="auto" required className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">الملاحظة / صلة القرابة</label>
              <input name="note" defaultValue={person.note ?? ""} dir="auto" className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">نوع الذمة المالية</label>
              <select
                name="initial_type"
                defaultValue={person.initial_type ?? "debt"}
                className="input font-semibold"
              >
                <option value="debt">🔴 أنا مدين له (دين / أمانة في ذمتي واجب سدادها له)</option>
                <option value="receivable">🟢 هو مدين لي (سلفة / أموال مستحقة لي في ذمته بانتظار تحصيلها)</option>
              </select>
            </div>
            <div>
              <label className="label">الدين أو المبلغ الأصلي السابق</label>
              <input
                name="initial_debt"
                type="number"
                step="any"
                defaultValue={person.initial_debt ? person.initial_debt / 100 : ""}
                className="input font-mono"
              />
            </div>
            <div>
              <label className="label">العملة</label>
              <select
                name="initial_currency"
                defaultValue={person.initial_currency ?? "EGP"}
                className="input"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 pt-1">
              <button className="btn w-full">حفظ التعديلات</button>
            </div>
          </form>
        </details>

        <ConfirmButton
          action={deletePerson.bind(null, person.id)}
          label={txnCount > 0 ? "🗄 أرشيف" : "🗑 حذف"}
          message={
            txnCount > 0
              ? "لهذا الشخص حركات سداد سابقة، سيتم أرشفته بدلاً من حذفه. هل تود المتابعة؟"
              : "حذف هذا الشخص نهائياً؟"
          }
        />
      </div>

      {/* Ledger Table */}
      <div className="card p-4">
        <h2 className="font-semibold text-stone-900 mb-2">سجل الحركات وكشف السداد (Ledger)</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-stone-500 py-6 text-center">
            لا توجد حركات مسجلة بعد — سجل أول دفعة سداد من الزر السريع أو صفحة العمليات.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                  <th className="py-2 pr-3 font-medium">التاريخ</th>
                  <th className="py-2 pr-3 font-medium">البيان</th>
                  <th className="py-2 pr-3 font-medium text-right">سداد (−) / دين (+)</th>
                  <th className="py-2 font-medium text-right">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {[...ledger].reverse().map((e) => (
                  <tr key={e.txn.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-500">{e.txn.date}</td>
                    <td className="py-2 pr-3" dir="auto">
                      <div className="font-medium text-stone-900">
                        {e.txn.description ??
                          (e.txn.type === "person_out" ? "سداد دفعة" : e.txn.type)}
                      </div>
                      <div className="text-xs text-stone-400">
                        عبر: {e.txn.account_name ?? "كاش"}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          e.delta < 0 ? "text-emerald-700" : "text-amber-800"
                        }`}
                      >
                        {e.delta < 0 ? "−" : "+"}
                        {fmtMoney(Math.abs(e.delta), e.txn.person_currency ?? cur)}
                      </span>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap font-bold text-stone-900">
                      {fmtMoney(Math.abs(e.balance), e.txn.person_currency ?? cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
