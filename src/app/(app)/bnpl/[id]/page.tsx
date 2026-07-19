import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAccounts, getInstallments, getPlan } from "@/lib/queries";
import { deletePlan, payInstallment, undoInstallment } from "@/app/actions/bnpl";
import ConfirmButton from "@/components/ConfirmButton";
import { fmtMoney, todayISO } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const plan = getPlan(Number(id));
  if (!plan) notFound();
  const installments = getInstallments(plan.id);
  const fundingAccounts = getAccounts().filter((a) => a.type !== "bnpl");
  const today = todayISO();
  const remaining = plan.total - plan.paid_amount;

  return (
    <div className="space-y-4">
      <div className="text-sm text-stone-500">
        <Link href="/bnpl" className="hover:underline">← أقساط BNPL</Link>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 dir="auto" className="text-xl font-bold">{plan.description}</h1>
            <div className="text-xs text-stone-500">
              {plan.account_name} · bought {plan.purchase_date} · {plan.installment_count} installments
            </div>
            <div className="text-xs text-stone-500">
              Price {fmtMoney(plan.principal, plan.currency)}
              {plan.fees_total > 0 && <> + fees {fmtMoney(plan.fees_total, plan.currency)}</>}
              {" = "}
              <b>{fmtMoney(plan.total, plan.currency)}</b>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-red-600">{fmtMoney(remaining, plan.currency)}</div>
            <div className="text-xs text-stone-500">remaining متبقي</div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Installments الأقساط</h2>
        <div className="space-y-2">
          {installments.map((i) => {
            const overdue = i.status === "pending" && i.due_date < today;
            return (
              <div
                key={i.id}
                className={`flex items-center justify-between gap-3 flex-wrap rounded-lg border p-3 ${
                  i.status === "paid"
                    ? "border-emerald-200 bg-emerald-50"
                    : overdue
                      ? "border-red-300 bg-red-50"
                      : "border-stone-200"
                }`}
              >
                <div className="text-sm">
                  <span className="font-semibold">#{i.seq}</span>{" "}
                  <span className={overdue ? "text-red-600 font-semibold" : "text-stone-600"}>
                    due {i.due_date} {overdue && "⚠️"}
                  </span>{" "}
                  · <b>{fmtMoney(i.amount, plan.currency)}</b>
                </div>
                {i.status === "paid" ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    ✓ Paid
                    <ConfirmButton
                      action={undoInstallment.bind(null, i.id)}
                      label="undo"
                      message="Undo this payment? The payment transaction will be deleted."
                      className="text-xs text-stone-500 underline cursor-pointer"
                    />
                  </div>
                ) : (
                  <form action={payInstallment} className="flex items-end gap-2 flex-wrap">
                    <input type="hidden" name="installment_id" value={i.id} />
                    <div>
                      <label className="label">Pay from</label>
                      <select name="funding_account_id" className="input" required>
                        {fundingAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.emoji ?? "💼"} {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Date</label>
                      <input type="date" name="date" defaultValue={today} className="input" />
                    </div>
                    <button className="btn">Pay ✓</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmButton
        action={deletePlan.bind(null, plan.id)}
        label="🗑 Delete plan"
        message="Delete this plan? The purchase and all its payment transactions will be removed."
      />
    </div>
  );
}
