import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getPerson, personLedger, personTxnCount } from "@/lib/queries";
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
  const ledger = personLedger(person.id);
  const txnCount = personTxnCount(person.id);

  const finalBalances = new Map<string, number>();
  for (const e of ledger) {
    finalBalances.set(e.txn.person_currency ?? "", e.balance);
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-stone-500">
        <Link href="/people" className="hover:underline">← امانة People</Link>
      </div>

      <div className="card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 dir="auto" className="text-xl font-bold">🤝 {person.name}</h1>
          {person.note && <div dir="auto" className="text-sm text-stone-500">{person.note}</div>}
        </div>
        <div className="text-right space-y-1">
          {[...finalBalances.entries()].filter(([, b]) => b !== 0).length === 0 && (
            <span className="text-sm text-stone-400">All settled خالص ✓</span>
          )}
          {[...finalBalances.entries()]
            .filter(([, b]) => b !== 0)
            .map(([cur, bal]) => (
              <div key={cur} className={`font-bold ${bal >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {fmtMoney(Math.abs(bal), cur)}{" "}
                <span className="text-xs font-normal">
                  {bal >= 0 ? "لهم معك (you hold)" : "عليهم لك (they owe you)"}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href={`/people/${person.id}/statement`} className="btn">
          📄 Statement كشف حساب
        </Link>
        <details className="card p-3 flex-1 min-w-60">
          <summary className="cursor-pointer text-sm font-medium text-emerald-800">✏️ Edit</summary>
          <form action={updatePerson.bind(null, person.id)} className="mt-3 grid gap-2">
            <input name="name" defaultValue={person.name} dir="auto" required className="input" />
            <input name="note" defaultValue={person.note ?? ""} dir="auto" className="input" placeholder="note" />
            <button className="btn">Save</button>
          </form>
        </details>
        <ConfirmButton
          action={deletePerson.bind(null, person.id)}
          label={txnCount > 0 ? "🗄 Archive" : "🗑 Delete"}
          message={
            txnCount > 0
              ? "This person has ledger history, so they will be archived (hidden). Continue?"
              : "Delete this person?"
          }
        />
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Ledger كشف الحساب</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-stone-500 py-6 text-center">
            No entries yet — record امانة deposits and payments from the Transactions page.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Details</th>
                  <th className="py-2 pr-3 font-medium text-right">لهم (+) / عليهم (−)</th>
                  <th className="py-2 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {[...ledger].reverse().map((e) => (
                  <tr key={e.txn.id} className="border-b border-stone-100">
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-500">{e.txn.date}</td>
                    <td className="py-2 pr-3" dir="auto">
                      {e.txn.description ?? e.txn.category_name ?? e.txn.type}
                      {e.txn.payee && <span className="text-stone-500"> → {e.txn.payee}</span>}
                      <span className="text-xs text-stone-400 ml-1">
                        {e.txn.account_name ? `· ${e.txn.account_name}` : ""}
                      </span>
                    </td>
                    <td className={`py-2 pr-3 text-right whitespace-nowrap font-medium ${e.delta < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {e.delta >= 0 ? "+" : "−"}
                      {fmtMoney(Math.abs(e.delta), e.txn.person_currency ?? "")}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap text-stone-600">
                      {fmtMoney(e.balance, e.txn.person_currency ?? "")}
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
