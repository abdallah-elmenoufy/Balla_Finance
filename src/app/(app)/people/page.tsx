import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getPeople, getPersonBalances } from "@/lib/queries";
import { createPerson } from "@/app/actions/people";
import { fmtMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  await requireAuth();
  const people = getPeople();
  const balances = getPersonBalances();
  const byPerson = new Map<number, { currency: string; balance: number }[]>();
  for (const b of balances) {
    if (!byPerson.has(b.person_id)) byPerson.set(b.person_id, []);
    byPerson.get(b.person_id)!.push(b);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">امانة — People</h1>
      <p className="text-sm text-stone-500 -mt-2">
        Green = money they left with you (لهم معك) · Red = they owe you (عليهم لك)
      </p>

      <details className="card p-4">
        <summary className="cursor-pointer font-medium text-emerald-800">
          ➕ Add person إضافة شخص
        </summary>
        <form action={createPerson} className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name الاسم</label>
            <input name="name" required dir="auto" className="input" placeholder="أحمد / مروة …" />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input name="note" dir="auto" className="input" placeholder="أخويا — يعيش في السعودية" />
          </div>
          <div className="col-span-2">
            <button className="btn w-full">Add</button>
          </div>
        </form>
      </details>

      {people.length === 0 && (
        <p className="text-sm text-stone-500 py-8 text-center">
          No people yet — add the family & friends whose money you manage.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {people.map((p) => {
          const bals = (byPerson.get(p.id) ?? []).filter((b) => b.balance !== 0);
          return (
            <Link key={p.id} href={`/people/${p.id}`} className="card p-4 hover:border-emerald-600 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div dir="auto" className="font-semibold truncate">🤝 {p.name}</div>
                  {p.note && (
                    <div dir="auto" className="text-xs text-stone-500 truncate">{p.note}</div>
                  )}
                </div>
                <div className="text-right space-y-0.5">
                  {bals.length === 0 && (
                    <span className="text-xs text-stone-400">settled خالص</span>
                  )}
                  {bals.map((b) => (
                    <div
                      key={b.currency}
                      className={`font-bold text-sm ${b.balance >= 0 ? "text-emerald-700" : "text-red-600"}`}
                    >
                      {fmtMoney(Math.abs(b.balance), b.currency)}
                      <span className="text-xs font-normal ml-1">
                        {b.balance >= 0 ? "لهم" : "عليهم"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
