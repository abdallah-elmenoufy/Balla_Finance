import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getAccounts, getPlans } from "@/lib/queries";
import { createPlan } from "@/app/actions/bnpl";
import { fmtMoney, todayISO } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function BnplPage() {
  await requireAuth();
  const plans = getPlans();
  const bnplAccounts = getAccounts().filter((a) => a.type === "bnpl");
  const today = todayISO();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">أقساط — BNPL Plans</h1>

      {bnplAccounts.length === 0 ? (
        <div className="card p-4 text-sm text-stone-600">
          First create a BNPL account (Valu, Souhoola, Tru…) on the{" "}
          <Link href="/accounts" className="text-emerald-700 underline">Accounts page</Link>{" "}
          with type <b>BNPL أقساط</b>, then add plans here.
        </div>
      ) : (
        <details className="card p-4">
          <summary className="cursor-pointer font-medium text-emerald-800">
            ➕ New plan خطة تقسيط جديدة
          </summary>
          <form action={createPlan} className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Provider الجهة</label>
              <select name="account_id" className="input" required>
                {bnplAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.emoji ?? "🧾"} {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">What did you buy? المشتريات</label>
              <input name="description" dir="auto" required className="input" placeholder="موبايل / تكييف / …" />
            </div>
            <div>
              <label className="label">Purchase date</label>
              <input name="purchase_date" type="date" defaultValue={today} className="input" required />
            </div>
            <div>
              <label className="label">Price المبلغ الأصلي</label>
              <input name="principal" inputMode="decimal" required className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="label">Total fees/interest المصاريف (optional)</label>
              <input name="fees_total" inputMode="decimal" className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="label"># of installments عدد الأقساط</label>
              <input name="installment_count" type="number" min={1} max={60} required className="input" placeholder="12" />
            </div>
            <div>
              <label className="label">First installment due date</label>
              <input name="first_due_date" type="date" required className="input" />
            </div>
            <div className="col-span-2">
              <button className="btn w-full">Create plan</button>
            </div>
          </form>
        </details>
      )}

      {plans.length === 0 && (
        <p className="text-sm text-stone-500 py-8 text-center">No BNPL plans yet</p>
      )}

      <div className="grid gap-3">
        {plans.map((p) => {
          const remaining = p.total - p.paid_amount;
          const pct = p.total > 0 ? Math.round((p.paid_amount / p.total) * 100) : 0;
          const overdue = p.next_due !== null && p.next_due < today;
          return (
            <Link key={p.id} href={`/bnpl/${p.id}`} className="card p-4 hover:border-emerald-600 transition-colors">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div dir="auto" className="font-semibold">{p.description}</div>
                  <div className="text-xs text-stone-500">
                    {p.account_name} · {p.paid_count}/{p.installment_count} paid
                    {p.next_due && (
                      <span className={overdue ? "text-red-600 font-semibold" : "text-amber-600"}>
                        {" "}· next due {p.next_due}{overdue ? " ⚠️ overdue" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">{fmtMoney(remaining, p.currency)} left</div>
                  <div className="text-xs text-stone-500">of {fmtMoney(p.total, p.currency)}</div>
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-stone-200 overflow-hidden">
                <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
