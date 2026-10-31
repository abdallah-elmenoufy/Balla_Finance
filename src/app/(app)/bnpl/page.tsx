import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getAccounts, getCurrencies, getMonthlyInstallmentsSchedule, getPlans } from "@/lib/queries";
import { createPlan } from "@/app/actions/bnpl";
import { fmtMoney, todayISO } from "@/lib/money";
import BnplPlanForm from "@/components/BnplPlanForm";
import BnplMonthlySchedule from "@/components/BnplMonthlySchedule";

export const dynamic = "force-dynamic";

export default async function BnplPage() {
  await requireAuth();
  const plans = getPlans();
  const allAccounts = getAccounts();
  const bnplAccounts = allAccounts.filter((a) => a.type === "bnpl");
  const fundingAccounts = allAccounts.filter((a) => a.type !== "bnpl");
  const currencies = getCurrencies();
  const schedule = getMonthlyInstallmentsSchedule();
  const today = todayISO();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            خدمات وخطط التقسيط (BNPL & Installments)
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            متابعة دقيقة لأقساط فاليو (Valu)، سهولة، كونتكت، أمان، وجدول استحقاق كل قسط شهرياً لتفادي أي نسيان
          </p>
        </div>
      </div>

      {bnplAccounts.length === 0 ? (
        <div className="card p-5 text-base text-stone-700 bg-amber-50/60 border-amber-200">
          لم تسجل جهة تقسيط بعد. أولاً أضف جهة تقسيط (مثل فاليو أو سهولة) في{" "}
          <Link href="/accounts" className="text-emerald-700 underline font-bold">
            صفحة الحسابات والبطاقات
          </Link>{" "}
          باختيار نوع <b>خدمات أقساط (BNPL)</b>، ثم أنشئ خطة التقسيط هنا.
        </div>
      ) : (
        <details className="card p-5 border-purple-300 shadow-sm">
          <summary className="cursor-pointer font-bold text-purple-900 text-base sm:text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>➕</span>
              <span>إضافة خطة تقسيط جديدة مع خيار تخصيص الأقساط (New Plan)</span>
            </span>
            <span className="text-xs text-stone-400 font-normal">انقر لإدخال التفاصيل</span>
          </summary>
          <div className="mt-5 pt-4 border-t border-stone-100">
            <BnplPlanForm
              accounts={bnplAccounts}
              currencies={currencies}
              action={createPlan}
            />
          </div>
        </details>
      )}

      {/* Monthly Installment Timeline & Calendar Tracker */}
      {schedule.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
              <span>📅</span>
              <span>جدول متابعة الأقساط الشهرية (كل شهر على حدة)</span>
            </h2>
            <span className="text-xs text-stone-500 font-semibold">متابعة شهرية دقيقة</span>
          </div>
          <BnplMonthlySchedule schedule={schedule} fundingAccounts={fundingAccounts} />
        </div>
      )}

      {plans.length === 0 && (
        <p className="text-base text-stone-400 py-10 text-center card p-6">لا توجد خطط تقسيط مسجلة حالياً</p>
      )}

      {/* Plans List */}
      {plans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
            <span>🧾</span>
            <span>خطط التقسيط والمشتريات الحالية ({plans.length})</span>
          </h2>
          <div className="grid gap-4">
            {plans.map((p) => {
              const remaining = p.total - p.paid_amount;
              const pct = p.total > 0 ? Math.round((p.paid_amount / p.total) * 100) : 0;
              const overdue = p.next_due !== null && p.next_due < today;

              return (
                <Link
                  key={p.id}
                  href={`/bnpl/${p.id}`}
                  className="card p-5 hover:border-purple-600 hover:shadow-md transition-all group bg-white"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div dir="auto" className="font-bold text-stone-900 text-lg group-hover:text-purple-800 transition-colors flex items-center gap-2">
                        <span>🧾</span>
                        <span>{p.description}</span>
                      </div>
                      <div className="text-sm text-stone-500 mt-1">
                        جهة التمويل: <b>{p.account_name}</b> · تم سداد {p.paid_count} من {p.installment_count} قسط
                        {p.next_due && (
                          <span className={`mr-2 font-bold ${overdue ? "text-red-600" : "text-amber-700"}`}>
                            · القسط القادم: {p.next_due} {overdue ? "⚠️ متأخر!" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <div className="text-xl font-black text-red-600 font-mono">
                        {fmtMoney(remaining, p.currency)}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        متبقي من إجمالي {fmtMoney(p.total, p.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>تم سداد: {pct}%</span>
                      <span>المدفوع: {fmtMoney(p.paid_amount, p.currency)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-purple-700 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
