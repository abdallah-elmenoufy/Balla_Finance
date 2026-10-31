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
  const pct = plan.total > 0 ? Math.round((plan.paid_amount / plan.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="text-sm text-stone-500">
        <Link href="/bnpl" className="hover:underline flex items-center gap-1 font-semibold text-emerald-800">
          <span>←</span>
          <span>الرجوع إلى قائمة خطط التقسيط</span>
        </Link>
      </div>

      {/* Plan Hero Card */}
      <div className="card p-6 border-stone-200/90 shadow-sm bg-white space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">🧾</span>
              <h1 dir="auto" className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {plan.description}
              </h1>
            </div>
            <div className="text-sm text-stone-500 font-medium mt-1">
              جهة التمويل: <b>{plan.account_name}</b> · تاريخ الشراء: {plan.purchase_date} · {plan.installment_count} قسط
            </div>
            <div className="text-sm text-stone-600 mt-1">
              السعر الأصلي: <b>{fmtMoney(plan.principal, plan.currency)}</b>
              {plan.fees_total > 0 && (
                <> + مصاريف وفوائد {fmtMoney(plan.fees_total, plan.currency)}</>
              )}
              {" = "}
              <b className="text-stone-900">الإجمالي: {fmtMoney(plan.total, plan.currency)}</b>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black text-red-600">
              {fmtMoney(remaining, plan.currency)}
            </div>
            <div className="text-xs font-bold text-stone-500 mt-0.5">
              متبقي للسداد بالكامل ({pct}% مدفوع)
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1 pt-2 border-t border-stone-100">
          <div className="flex justify-between text-xs text-stone-500">
            <span>مدفوع {plan.paid_count} من {plan.installment_count} قسط</span>
            <span>{fmtMoney(plan.paid_amount, plan.currency)} مدفوعة</span>
          </div>
          <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Delete Plan */}
        <div className="pt-2 flex justify-end">
          <ConfirmButton
            action={deletePlan.bind(null, plan.id)}
            label="🗑 حذف خطة التقسيط بالكامل"
            message="سيتم حذف خطة التقسيط وجميع أقساطها وعمليات السداد التابعة لها. هل تود المتابعة؟"
            className="btn-danger text-xs"
          />
        </div>
      </div>

      {/* Installments Schedule */}
      <div className="card p-6 border-stone-200/90 shadow-sm bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">جدول الأقساط الشهرية</h2>
          <span className="text-xs text-stone-400 font-semibold">{installments.length} قسط</span>
        </div>

        <div className="space-y-3">
          {installments.map((i) => {
            const overdue = i.status === "pending" && i.due_date < today;
            const isPaid = i.status === "paid";

            return (
              <div
                key={i.id}
                className={`flex items-center justify-between gap-3 flex-wrap rounded-xl border p-4 transition-all ${
                  isPaid
                    ? "border-emerald-200 bg-emerald-50/40 text-emerald-950"
                    : overdue
                      ? "border-red-300 bg-red-50/50 shadow-xs"
                      : "border-stone-200 bg-white"
                }`}
              >
                <div className="text-base flex items-center gap-3">
                  <span className="font-bold text-stone-900 p-2 rounded-lg bg-stone-100/80 text-sm">
                    قسط #{i.seq}
                  </span>
                  <div>
                    <div className="font-bold text-stone-900">
                      {fmtMoney(i.amount, plan.currency)}
                    </div>
                    <div className={`text-xs mt-0.5 ${overdue ? "text-red-600 font-bold" : "text-stone-500"}`}>
                      تاريخ الاستحقاق: {i.due_date} {overdue && "⚠️ متأخر عن موعده!"}
                    </div>
                  </div>
                </div>

                <div>
                  {isPaid ? (
                    <div className="flex items-center gap-3 text-sm font-bold text-emerald-800">
                      <span>✓ تم السداد بنجاح</span>
                      <ConfirmButton
                        action={undoInstallment.bind(null, i.id)}
                        label="تراجع ↩"
                        message="إلغاء سداد هذا القسط وإعادته كمستحق؟"
                        className="text-xs text-stone-400 hover:text-stone-700 underline cursor-pointer"
                      />
                    </div>
                  ) : (
                    <form action={payInstallment} className="flex items-center gap-2">
                      <input type="hidden" name="installment_id" value={i.id} />
                      <input type="hidden" name="date" value={today} />
                      <select name="funding_account_id" className="input text-xs py-1.5 font-semibold max-w-48" required>
                        <option value="">سداد من حساب...</option>
                        {fundingAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.emoji ?? "💼"} {a.name} ({a.currency})
                          </option>
                        ))}
                      </select>
                      <button className="btn text-xs py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800">
                        ⚡ سداد القسط
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
