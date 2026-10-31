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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            التقارير المالية الشهرية (Monthly Reports)
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            كشف حساب تحليلي يوضح دخلك ومصروفاتك الشخصية وما تم سداده من ديون خلال الشهر
          </p>
        </div>

        {/* Month Selector */}
        <form className="flex gap-2 items-center">
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="input text-base font-bold w-auto"
          />
          <button className="btn py-2 px-5 text-sm">عرض الشهر</button>
        </form>
      </div>

      {totals.length === 0 ? (
        <div className="card p-12 text-center text-stone-400 space-y-2">
          <span className="text-4xl block">📊</span>
          <p className="text-lg font-bold text-stone-600">لا توجد حركات مالية مسجلة في شهر {month}</p>
          <p className="text-sm text-stone-400">سجل حركاتك من شريط العمليات لتوليد التقرير تلقائياً</p>
        </div>
      ) : (
        totals.map((t) => {
          const net = t.income - (t.expense + t.on_behalf_out);
          return (
            <div key={t.currency} className="card p-6 space-y-4 border-stone-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="text-xl font-bold text-stone-900">
                  ملخص شهر {month} — عملة ({t.currency})
                </h2>
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-full ${
                    net >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                  }`}
                >
                  {net >= 0 ? "فائض مالي: +" : "عجز مالي: "}
                  {fmtMoney(Math.abs(net), t.currency)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-base">
                <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3.5">
                  <div className="text-xs text-emerald-800 font-semibold">الدخل الإجمالي (Income)</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">{fmtMoney(t.income, t.currency)}</div>
                </div>

                <div className="rounded-xl bg-red-50/60 border border-red-100 p-3.5">
                  <div className="text-xs text-red-800 font-semibold">مصروفي الشخصي (My Spending)</div>
                  <div className="text-xl font-black text-red-600 mt-1">{fmtMoney(t.expense, t.currency)}</div>
                </div>

                <div className="rounded-xl bg-purple-50/60 border border-purple-100 p-3.5">
                  <div className="text-xs text-purple-800 font-semibold">سداد ديون وأمانات (Debt Paid)</div>
                  <div className="text-xl font-black text-purple-700 mt-1">{fmtMoney(t.on_behalf_out, t.currency)}</div>
                </div>

                <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5">
                  <div className="text-xs text-stone-600 font-semibold">أمانات مستلمة جديدة</div>
                  <div className="text-xl font-black text-stone-800 mt-1">{fmtMoney(t.amanah_in, t.currency)}</div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Category Breakdown */}
      {currencies.map((cur) => {
        const rows = byCategory.filter((r) => r.currency === cur && r.total > 0);
        const max = maxByCur.get(cur) || 1;
        const totalExpenses = rows.reduce((s, r) => s + r.total, 0);
        if (rows.length === 0) return null;

        return (
          <div key={cur} className="card p-6 space-y-4 border-stone-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                تفصيل المصروفات حسب التصنيف ({cur})
              </h2>
              <span className="text-sm text-stone-500 font-medium">
                الإجمالي: <b>{fmtMoney(totalExpenses, cur)}</b>
              </span>
            </div>

            <div className="space-y-3">
              {rows.map((r, i) => {
                const pct = totalExpenses > 0 ? Math.round((r.total / totalExpenses) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-sm sm:text-base">
                      <span className="font-bold text-stone-800 flex items-center gap-2" dir="auto">
                        <span className="text-lg">{r.category_emoji}</span>
                        <span>{r.category_name ?? "غير مصنف"}</span>
                      </span>
                      <span className="font-bold text-stone-900">
                        {fmtMoney(r.total, cur)}{" "}
                        <span className="text-xs text-stone-400 font-normal mr-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, (r.total / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
