import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { accountLedger, accountTxnCount, getAccount, getCurrencies } from "@/lib/queries";
import { deleteAccount, updateAccount } from "@/app/actions/accounts";
import AccountForm from "@/components/AccountForm";
import ConfirmButton from "@/components/ConfirmButton";
import { fmtMoney } from "@/lib/money";
import { ACCOUNT_TYPES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const account = getAccount(Number(id));
  if (!account) notFound();
  const currencies = getCurrencies();
  const ledger = accountLedger(account.id);
  const txnCount = accountTxnCount(account.id);
  const t = ACCOUNT_TYPES.find((x) => x.value === account.type);
  const isCredit = account.type === "credit_card";
  const owed = isCredit && account.balance < 0 ? -account.balance : 0;
  const availableCredit =
    isCredit && account.credit_limit ? Math.max(0, account.credit_limit - owed) : null;
  const utilization =
    isCredit && account.credit_limit && account.credit_limit > 0
      ? Math.min(100, Math.round((owed / account.credit_limit) * 100))
      : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back Link */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/accounts" className="hover:underline flex items-center gap-1 font-semibold text-emerald-800">
          <span>←</span>
          <span>الرجوع إلى قائمة الحسابات والبطاقات</span>
        </Link>
      </div>

      {/* Main Account Hero Card */}
      <div className="card p-6 border-stone-200/90 shadow-sm bg-white space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl p-3 rounded-2xl bg-stone-50 border border-stone-100 shadow-2xs">
              {account.emoji ?? t?.emoji ?? "💼"}
            </span>
            <div>
              <h1 dir="auto" className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {account.name}
              </h1>
              <div className="text-sm text-stone-500 font-medium mt-1">
                {t?.label ?? account.type} · عملة الحساب: <b>{account.currency}</b>
              </div>
            </div>
          </div>

          <div className="text-right">
            {isCredit ? (
              <div>
                <div className={`text-2xl sm:text-3xl font-black ${owed > 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {owed > 0 ? fmtMoney(owed, account.currency) : "0.00 " + account.currency}
                </div>
                <div className="text-xs font-bold text-stone-500 mt-0.5">
                  {owed > 0 ? "مديونية مستحقة عليك للبنك" : "مسددة بالكامل ✓"}
                </div>
              </div>
            ) : (
              <div>
                <div className={`text-2xl sm:text-3xl font-black ${account.balance < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {fmtMoney(account.balance, account.currency)}
                </div>
                <div className="text-xs font-bold text-stone-500 mt-0.5">
                  رصيد نقدي متاح بحوزتك
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Credit Card Detailed Explanatory Dashboard */}
        {isCredit && (
          <div className="rounded-2xl bg-amber-50/60 border border-amber-200 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-stone-500 font-semibold">الحد الائتماني الكلي (السقف المسموح)</div>
                <div className="text-base font-bold text-stone-900 mt-0.5">
                  {account.credit_limit ? fmtMoney(account.credit_limit, account.currency) : "غير محدد"}
                </div>
              </div>

              <div>
                <div className="text-xs text-stone-500 font-semibold">المتبقي المتاح للشراء الآن</div>
                <div className="text-base font-bold text-emerald-700 mt-0.5">
                  {availableCredit !== null ? fmtMoney(availableCredit, account.currency) : "غير محدد"}
                </div>
              </div>

              <div>
                <div className="text-xs text-amber-900 font-semibold">موعد استحقاق السداد لتفادي الفوائد</div>
                <div className="text-base font-bold text-amber-800 mt-0.5">
                  {account.due_day ? `يوم ${account.due_day} من كل شهر` : "غير محدد"}
                </div>
              </div>
            </div>

            {/* Utilization progress */}
            {utilization !== null && (
              <div className="pt-2 border-t border-amber-200/60 space-y-1">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>نسبة استخدام الحد: <b>{utilization}%</b></span>
                  <span>{utilization > 70 ? "⚠️ الاستخدام مرتفع، يفضل السداد" : "✓ الاستخدام في الحدود الآمنة"}</span>
                </div>
                <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      utilization > 70 ? "bg-red-500" : utilization > 40 ? "bg-amber-500" : "bg-emerald-600"
                    }`}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Form Accordion & Archive Action */}
      <div className="flex gap-3 flex-wrap">
        <details className="card p-5 flex-1 min-w-72 border-stone-200">
          <summary className="cursor-pointer font-bold text-base text-emerald-800 flex items-center justify-between">
            <span>✏️ تعديل بيانات الحساب / حدود السداد</span>
            <span className="text-xs text-stone-400 font-normal">انقر للتعديل</span>
          </summary>
          <div className="mt-4 pt-4 border-t border-stone-100">
            <AccountForm
              action={updateAccount.bind(null, account.id)}
              currencies={currencies}
              initial={account}
              submitLabel="حفظ التعديلات"
            />
          </div>
        </details>

        <ConfirmButton
          action={deleteAccount.bind(null, account.id)}
          label={txnCount > 0 ? "🗄 أرشفة الحساب" : "🗑 حذف نهائي"}
          message={
            txnCount > 0
              ? "هذا الحساب عليه معاملات سابقة، سيتم إخفاؤه في الأرشيف للحفاظ على سلامة أرقامك. هل تود المتابعة؟"
              : "هل أنت متأكد من حذف هذا الحساب نهائياً؟"
          }
        />
      </div>

      {/* Account Ledger Table */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-stone-900">سجل حركات الحساب (Ledger)</h2>
          <span className="text-xs text-stone-400">{ledger.length} حركة مسجلة</span>
        </div>

        {ledger.length === 0 ? (
          <p className="text-base text-stone-400 py-10 text-center">لا توجد حركات مسجلة على هذا الحساب بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-left text-xs font-bold text-stone-500 border-b border-stone-200">
                  <th className="py-2.5 pr-3">التاريخ</th>
                  <th className="py-2.5 pr-3">البيان والتفاصيل</th>
                  <th className="py-2.5 pr-3 text-right">الحركة (وارد / صادر)</th>
                  <th className="py-2.5 text-right">الرصيد بعد الحركة</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e) => (
                  <tr key={e.txn.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="py-3 pr-3 whitespace-nowrap text-stone-500 text-sm">{e.txn.date}</td>
                    <td className="py-3 pr-3" dir="auto">
                      <div className="font-semibold text-stone-900">
                        {e.txn.description ??
                          (e.txn.type === "transfer"
                            ? `${e.txn.account_name} → ${e.txn.to_account_name}`
                            : e.txn.category_name ?? e.txn.type)}
                      </div>
                      {e.txn.payee && <div className="text-xs text-stone-500">المستفيد: {e.txn.payee}</div>}
                    </td>
                    <td className="py-3 pr-3 text-right whitespace-nowrap">
                      <span className={`font-bold ${e.delta >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {e.delta >= 0 ? "+" : "−"}
                        {fmtMoney(Math.abs(e.delta), account.currency)}
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap font-bold text-stone-900">
                      {isCredit && e.balance < 0 ? (
                        <span className="text-red-600">عليك {fmtMoney(-e.balance, account.currency)}</span>
                      ) : (
                        fmtMoney(e.balance, account.currency)
                      )}
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
