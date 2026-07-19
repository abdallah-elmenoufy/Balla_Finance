import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import {
  getAccounts,
  getPeople,
  getPersonBalances,
  upcomingInstallments,
} from "@/lib/queries";
import { fmtMoney, todayISO } from "@/lib/money";
import { ACCOUNT_TYPES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAuth();
  const accounts = getAccounts();
  const people = getPeople();
  const personBalances = getPersonBalances();
  const dues = upcomingInstallments(30);
  const today = todayISO();

  // Net position per currency across all my accounts
  const net = new Map<string, number>();
  for (const a of accounts) net.set(a.currency, (net.get(a.currency) ?? 0) + a.balance);

  // Amanah totals per currency
  const iHold = new Map<string, number>();
  const owedToMe = new Map<string, number>();
  const personName = new Map(people.map((p) => [p.id, p.name]));
  for (const b of personBalances) {
    if (b.balance > 0) iHold.set(b.currency, (iHold.get(b.currency) ?? 0) + b.balance);
    if (b.balance < 0) owedToMe.set(b.currency, (owedToMe.get(b.currency) ?? 0) - b.balance);
  }

  const cardsDue = accounts.filter((a) => a.type === "credit_card" && a.due_day != null && a.balance < 0);
  const typeEmoji = new Map(ACCOUNT_TYPES.map((t) => [t.value as string, t.emoji]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/transactions" className="btn">➕ New transaction</Link>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-6 text-center space-y-2">
          <div className="text-3xl">👋</div>
          <p className="font-medium">Welcome! Start by creating your accounts.</p>
          <p className="text-sm text-stone-500">
            Wallets, banks, cards, BNPL — then add people whose money you manage.
          </p>
          <Link href="/accounts" className="btn">Create accounts →</Link>
        </div>
      ) : (
        <>
          {/* Net position */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...net.entries()].map(([cur, total]) => (
              <div key={cur} className="card p-4">
                <div className="text-xs text-stone-500">Net {cur} صافي</div>
                <div className={`text-xl font-bold ${total < 0 ? "text-red-600" : "text-stone-900"}`}>
                  {fmtMoney(total, cur)}
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming dues */}
          {(dues.length > 0 || cardsDue.length > 0) && (
            <div className="card p-4">
              <h2 className="font-semibold mb-2">⏰ Upcoming dues مستحقات</h2>
              <div className="space-y-1.5 text-sm">
                {dues.map((d) => {
                  const overdue = d.due_date < today;
                  return (
                    <Link key={d.id} href={`/bnpl/${d.plan_id}`} className="flex justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50">
                      <span dir="auto">
                        {overdue ? "⚠️" : "📅"} قسط #{d.seq} — {d.plan_description}
                        <span className="text-xs text-stone-500"> ({d.account_name})</span>
                      </span>
                      <span className={`whitespace-nowrap font-semibold ${overdue ? "text-red-600" : "text-amber-600"}`}>
                        {fmtMoney(d.amount, d.currency)} · {overdue ? "overdue!" : d.due_date}
                      </span>
                    </Link>
                  );
                })}
                {cardsDue.map((a) => (
                  <Link key={a.id} href={`/accounts/${a.id}`} className="flex justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50">
                    <span dir="auto">💳 {a.name} payment</span>
                    <span className="whitespace-nowrap font-semibold text-amber-600">
                      {fmtMoney(-a.balance, a.currency)} owed · day {a.due_day}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Amanah summary */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="card p-4">
              <h2 className="font-semibold mb-1">🤝 امانة معك (you hold)</h2>
              {iHold.size === 0 ? (
                <p className="text-sm text-stone-400">Nothing held</p>
              ) : (
                [...iHold.entries()].map(([cur, v]) => (
                  <div key={cur} className="text-lg font-bold text-emerald-700">{fmtMoney(v, cur)}</div>
                ))
              )}
            </div>
            <div className="card p-4">
              <h2 className="font-semibold mb-1">📥 Owed to you عليهم لك</h2>
              {owedToMe.size === 0 ? (
                <p className="text-sm text-stone-400">Nobody owes you</p>
              ) : (
                [...owedToMe.entries()].map(([cur, v]) => (
                  <div key={cur} className="text-lg font-bold text-red-600">{fmtMoney(v, cur)}</div>
                ))
              )}
            </div>
          </div>

          {/* Per-person quick view */}
          {personBalances.filter((b) => b.balance !== 0).length > 0 && (
            <div className="card p-4">
              <h2 className="font-semibold mb-2">People balances أرصدة الأشخاص</h2>
              <div className="flex flex-wrap gap-2">
                {personBalances
                  .filter((b) => b.balance !== 0)
                  .map((b) => (
                    <Link
                      key={`${b.person_id}-${b.currency}`}
                      href={`/people/${b.person_id}`}
                      dir="auto"
                      className={`rounded-full px-3 py-1.5 text-sm border ${
                        b.balance >= 0
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {personName.get(b.person_id)} · {fmtMoney(Math.abs(b.balance), b.currency)}{" "}
                      {b.balance >= 0 ? "لهم" : "عليهم"}
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {/* Accounts snapshot */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Accounts الحسابات</h2>
              <Link href="/accounts" className="text-sm text-emerald-700 hover:underline">manage →</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {accounts.map((a) => (
                <Link key={a.id} href={`/accounts/${a.id}`} className="flex justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50">
                  <span dir="auto" className="truncate">
                    {a.emoji ?? typeEmoji.get(a.type) ?? "💼"} {a.name}
                  </span>
                  <span className={`whitespace-nowrap font-semibold ${a.balance < 0 ? "text-red-600" : "text-stone-800"}`}>
                    {fmtMoney(a.balance, a.currency)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
