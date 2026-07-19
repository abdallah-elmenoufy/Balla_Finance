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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/accounts" className="hover:underline">← Accounts</Link>
      </div>
      <div className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{account.emoji ?? t?.emoji ?? "💼"}</span>
          <div>
            <h1 dir="auto" className="text-xl font-bold">{account.name}</h1>
            <div className="text-xs text-stone-500">{t?.label ?? account.type} · {account.currency}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${account.balance < 0 ? "text-red-600" : "text-emerald-700"}`}>
            {fmtMoney(account.balance, account.currency)}
          </div>
          {account.credit_limit != null && (
            <div className="text-xs text-stone-500">
              limit {fmtMoney(account.credit_limit, account.currency)}
            </div>
          )}
          {account.due_day != null && (
            <div className="text-xs text-amber-600">due day {account.due_day} of month</div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <details className="card p-4 flex-1">
          <summary className="cursor-pointer font-medium text-emerald-800">✏️ Edit account</summary>
          <div className="mt-4">
            <AccountForm
              action={updateAccount.bind(null, account.id)}
              currencies={currencies}
              initial={account}
              submitLabel="Save changes"
            />
          </div>
        </details>
        <ConfirmButton
          action={deleteAccount.bind(null, account.id)}
          label={txnCount > 0 ? "🗄 Archive" : "🗑 Delete"}
          message={
            txnCount > 0
              ? "This account has transactions, so it will be archived (hidden). Continue?"
              : "Delete this account?"
          }
        />
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Ledger كشف الحساب</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-stone-500 py-6 text-center">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Details</th>
                  <th className="py-2 pr-3 font-medium text-right">In/Out</th>
                  <th className="py-2 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e) => (
                  <tr key={e.txn.id} className="border-b border-stone-100">
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-500">{e.txn.date}</td>
                    <td className="py-2 pr-3" dir="auto">
                      {e.txn.description ??
                        (e.txn.type === "transfer"
                          ? `${e.txn.account_name} → ${e.txn.to_account_name}`
                          : (e.txn.category_name ?? e.txn.type))}
                      {e.txn.person_name && (
                        <span className="ml-1 inline-block rounded-full bg-amber-100 text-amber-800 px-1.5 text-xs">
                          🤝 {e.txn.person_name}
                        </span>
                      )}
                    </td>
                    <td className={`py-2 pr-3 text-right whitespace-nowrap font-medium ${e.delta < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {e.delta >= 0 ? "+" : "−"}
                      {fmtMoney(Math.abs(e.delta), account.currency)}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap text-stone-600">
                      {fmtMoney(e.balance, account.currency)}
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
