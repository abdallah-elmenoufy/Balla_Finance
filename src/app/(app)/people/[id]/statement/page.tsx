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
    from && to ? `${from} → ${to}` : from ? `from ${from}` : to ? `until ${to}` : "Full history · كل التعاملات";

  return (
    <div className="space-y-4">
      <div className="no-print text-sm text-stone-500">
        <Link href={`/people/${person.id}`} className="hover:underline">← {person.name}</Link>
      </div>

      <form className="no-print card p-3 flex flex-wrap items-end gap-2 text-sm">
        <div>
          <label className="label">From من</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className="input" />
        </div>
        <div>
          <label className="label">To إلى</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className="input" />
        </div>
        <button className="btn-secondary">Apply</button>
      </form>

      <ExportButtons filename={`statement-${person.name}-${todayISO()}`} />

      <div id="statement-card" className="bg-white rounded-xl border border-stone-200 p-6 max-w-2xl">
        <div className="flex items-center justify-between border-b-2 border-emerald-700 pb-3 mb-4">
          <div>
            <div className="text-xl font-bold">كشف حساب · Statement</div>
            <div dir="auto" className="text-lg text-emerald-800 font-semibold">🤝 {person.name}</div>
          </div>
          <div className="text-right text-xs text-stone-500">
            <div>{period}</div>
            <div>Generated {todayISO()}</div>
          </div>
        </div>

        {opening && opening.size > 0 && (
          <div className="mb-3 text-sm">
            <span className="font-medium">رصيد أول المدة · Opening: </span>
            {[...opening.entries()].map(([cur, bal]) => (
              <span key={cur} className={`mr-2 font-semibold ${bal >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {fmtMoney(Math.abs(bal), cur)} {bal >= 0 ? "لهم" : "عليهم"}
              </span>
            ))}
          </div>
        )}

        {ledger.length === 0 ? (
          <p className="text-sm text-stone-500 py-6 text-center">No entries in this period</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-stone-500 border-b border-stone-300 text-left">
                <th className="py-1.5 pr-2 font-medium">التاريخ</th>
                <th className="py-1.5 pr-2 font-medium">البيان</th>
                <th className="py-1.5 pr-2 font-medium text-right">وارد (+)</th>
                <th className="py-1.5 pr-2 font-medium text-right">مدفوع (−)</th>
                <th className="py-1.5 font-medium text-right">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e) => (
                <tr key={e.txn.id} className="border-b border-stone-100">
                  <td className="py-1.5 pr-2 whitespace-nowrap text-stone-500">{e.txn.date}</td>
                  <td className="py-1.5 pr-2" dir="auto">
                    {e.txn.description ?? e.txn.category_name ?? e.txn.type}
                    {e.txn.payee && <span className="text-stone-500"> → {e.txn.payee}</span>}
                  </td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap text-emerald-700">
                    {e.delta > 0 ? fmtMoney(e.delta, e.txn.person_currency ?? "") : ""}
                  </td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap text-red-600">
                    {e.delta < 0 ? fmtMoney(-e.delta, e.txn.person_currency ?? "") : ""}
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap font-medium">
                    {fmtMoney(e.balance, e.txn.person_currency ?? "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 pt-3 border-t-2 border-emerald-700">
          <span className="font-semibold">الرصيد النهائي · Closing balance: </span>
          {[...closing.entries()].filter(([, b]) => b !== 0).length === 0 ? (
            <span className="text-stone-500">خالص · All settled ✓</span>
          ) : (
            [...closing.entries()]
              .filter(([, b]) => b !== 0)
              .map(([cur, bal]) => (
                <span key={cur} className={`mr-3 font-bold ${bal >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {fmtMoney(Math.abs(bal), cur)} {bal >= 0 ? "لهم معك" : "عليهم لك"}
                </span>
              ))
          )}
        </div>
        <div className="mt-3 text-[10px] text-stone-400 text-center">Balla Finance 💰</div>
      </div>
    </div>
  );
}
