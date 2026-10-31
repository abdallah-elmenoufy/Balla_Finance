import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getPerson, personBalanceBefore, personLedger } from "@/lib/queries";
import ExportButtons from "@/components/ExportButtons";
import { fmtMoney, todayISO } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function StatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAuth();
  const { id } = await params;
  const sp = await searchParams;
  const person = getPerson(Number(id));
  if (!person) notFound();

  const from = sp.from || undefined;
  const to = sp.to || undefined;
  const opening = from ? personBalanceBefore(person.id, from) : undefined;
  const ledger = personLedger(person.id, from, to, opening);

  const closing = new Map<string, number>(opening ?? []);
  for (const e of ledger) closing.set(e.txn.person_currency ?? "", e.balance);

  const period =
    from && to
      ? `من ${from} إلى ${to}`
      : from
        ? `من ${from} حتى اليوم`
        : to
          ? `حتى تاريخ ${to}`
          : "كامل سجل التعاملات والسداد";

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="no-print text-sm text-stone-500">
        <Link href={`/people/${person.id}`} className="hover:underline flex items-center gap-1 font-semibold text-emerald-800">
          <span>←</span>
          <span>الرجوع إلى حساب {person.name}</span>
        </Link>
      </div>

      {/* Date Filter Bar */}
      <form className="no-print card p-4 flex flex-wrap items-end gap-3 text-sm border-stone-200">
        <div>
          <label className="label">من تاريخ (From)</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className="input text-sm font-semibold" />
        </div>
        <div>
          <label className="label">إلى تاريخ (To)</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className="input text-sm font-semibold" />
        </div>
        <button className="btn text-sm py-2 px-5">تطبيق الفترة</button>
      </form>

      {/* Export Buttons */}
      <ExportButtons filename={`كشف-حساب-${person.name}-${todayISO()}`} />

      {/* Beautiful Statement Card */}
      <div
        id="statement-card"
        className="bg-white rounded-2xl border border-stone-300 p-8 max-w-3xl mx-auto shadow-sm"
        dir="auto"
      >
        {/* Statement Header */}
        <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-4 mb-5 gap-4">
          <div>
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              كشف حساب وسداد أمانة
            </div>
            <div className="text-lg text-emerald-800 font-bold mt-1">
              🤝 المستحق له: {person.name}
            </div>
            {person.note && <div className="text-xs text-stone-500">{person.note}</div>}
          </div>
          <div className="text-right text-xs text-stone-500 space-y-1">
            <div className="font-semibold text-stone-700">{period}</div>
            <div>تاريخ الاستخراج: {todayISO()}</div>
            <div className="text-[11px] text-emerald-800 font-bold">Balla Finance 💰</div>
          </div>
        </div>

        {/* Opening Balance */}
        {opening && opening.size > 0 && (
          <div className="mb-4 text-sm bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="font-bold text-stone-700">رصيد أول المدة: </span>
            {[...opening.entries()].map(([cur, bal]) => (
              <span
                key={cur}
                className={`mr-2 font-bold ${bal >= 0 ? "text-amber-800" : "text-emerald-700"}`}
              >
                {fmtMoney(Math.abs(bal), cur)} {bal >= 0 ? "(مستحق له في ذمتك)" : "(مستحق لك)"}
              </span>
            ))}
          </div>
        )}

        {/* Ledger Table */}
        {ledger.length === 0 ? (
          <p className="text-base text-stone-400 py-8 text-center">لا توجد حركات مسجلة خلال هذه الفترة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm sm:text-base">
              <thead>
                <tr className="text-xs font-bold text-stone-500 border-b border-stone-300 text-left">
                  <th className="py-2.5 pr-3">التاريخ</th>
                  <th className="py-2.5 pr-3">البيان والتفاصيل</th>
                  <th className="py-2.5 pr-3 text-right">أمانة جديدة (+)</th>
                  <th className="py-2.5 pr-3 text-right">سداد دفعة (−)</th>
                  <th className="py-2.5 text-right">المتبقي المطلوب</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e) => (
                  <tr key={e.txn.id} className="border-b border-stone-100">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-stone-500 text-xs sm:text-sm font-mono">
                      {e.txn.date}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-stone-900" dir="auto">
                      <div>{e.txn.description ?? (e.txn.type === "person_out" ? "سداد دفعة أمانة" : e.txn.type)}</div>
                      <div className="text-xs text-stone-500 font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {e.txn.account_name && (
                          <span>عبر: {e.txn.account_name}</span>
                        )}
                        {e.txn.account_currency && e.txn.person_currency && e.txn.account_currency !== e.txn.person_currency && (
                          <span className="text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            (المدفوع الفعلي من الحساب: {fmtMoney(e.txn.amount, e.txn.account_currency)})
                          </span>
                        )}
                        {e.txn.payee && <span> → {e.txn.payee}</span>}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right whitespace-nowrap font-bold text-amber-800">
                      {e.delta > 0 ? fmtMoney(e.delta, e.txn.person_currency ?? "") : ""}
                    </td>
                    <td className="py-2.5 pr-3 text-right whitespace-nowrap font-bold text-emerald-700">
                      {e.delta < 0 ? fmtMoney(-e.delta, e.txn.person_currency ?? "") : ""}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap font-black text-stone-900">
                      {fmtMoney(Math.abs(e.balance), e.txn.person_currency ?? "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Statement Footer Closing Summary */}
        <div className="mt-6 pt-4 border-t-2 border-emerald-700 flex items-center justify-between flex-wrap gap-2 text-base">
          <span className="font-bold text-stone-900">الرصيد المتبقي النهائي الواجب سداده: </span>
          <div>
            {[...closing.entries()].filter(([, b]) => b !== 0).length === 0 ? (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                خالص تماماً ومسدد بالكامل ✓
              </span>
            ) : (
              [...closing.entries()]
                .filter(([, b]) => b !== 0)
                .map(([cur, bal]) => (
                  <span
                    key={cur}
                    className={`font-black text-xl mr-3 ${bal >= 0 ? "text-amber-800" : "text-emerald-700"}`}
                  >
                    {fmtMoney(Math.abs(bal), cur)}{" "}
                    <span className="text-xs font-normal text-stone-500">
                      {bal >= 0 ? "(مستحق له عليك)" : "(مستحق لك)"}
                    </span>
                  </span>
                ))
            )}
          </div>
        </div>

        <div className="mt-5 text-xs text-stone-400 text-center border-t border-stone-100 pt-3">
          تم إنشاء هذا الكشف تلقائياً عبر تطبيق Balla Finance — إدارة الأموال والالتزامات
        </div>
      </div>
    </div>
  );
}
