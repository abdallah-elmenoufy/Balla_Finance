import { requireAuth } from "@/lib/auth";
import { monthlyByCategory, monthlyTotals } from "@/lib/queries";
import { fmtMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAuth();
  const sp = await searchParams;
  const month = sp.month || currentMonth();
  const totals = monthlyTotals(month);
  const byCategory = monthlyByCategory(month).filter((r) => r.total > 0 || r.on_behalf > 0);

  const currencies = [...new Set(byCategory.map((r) => r.currency))];
  const maxByCur = new Map<string, number>();
  for (const r of byCategory) {
    maxByCur.set(r.currency, Math.max(maxByCur.get(r.currency) ?? 0, r.total));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Reports التقارير</h1>
        <form className="flex gap-2 items-center">
          <input type="month" name="month" defaultValue={month} className="input w-auto" />
          <button className="btn-secondary">Go</button>
        </form>
      </div>

      {totals.length === 0 ? (
        <p className="text-sm text-stone-500 py-10 text-center">No activity in {month}</p>
      ) : (
        totals.map((t) => (
          <div key={t.currency} className="card p-4">
            <h2 className="font-semibold mb-3">{month} — {t.currency}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-stone-500">Income دخل</div>
                <div className="font-bold text-emerald-700">{fmtMoney(t.income, t.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500">My spending مصروفي</div>
                <div className="font-bold text-red-600">{fmtMoney(t.expense, t.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500">Paid for others عن الغير</div>
                <div className="font-bold text-amber-600">{fmtMoney(t.on_behalf_out, t.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500">امانة received</div>
                <div className="font-bold text-stone-700">{fmtMoney(t.amanah_in, t.currency)}</div>
              </div>
            </div>
          </div>
        ))
      )}

      {currencies.map((cur) => {
        const rows = byCategory.filter((r) => r.currency === cur && r.total > 0);
        const max = maxByCur.get(cur) || 1;
        if (rows.length === 0) return null;
        return (
          <div key={cur} className="card p-4">
            <h2 className="font-semibold mb-3">My spending by category ({cur})</h2>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[minmax(7rem,12rem)_1fr_auto] items-center gap-2 text-sm">
                  <div dir="auto" className="truncate text-stone-700">
                    {r.category_emoji} {r.category_name ?? "غير مصنف"}
                  </div>
                  <div className="h-4 relative">
                    <div
                      className="absolute inset-y-0 left-0 rounded-r-[4px] bg-emerald-600"
                      style={{ width: `${Math.max(2, (r.total / max) * 100)}%` }}
                    />
                  </div>
                  <div className="whitespace-nowrap text-stone-800 font-medium tabular-nums">
                    {fmtMoney(r.total, cur)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
