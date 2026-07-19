import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getAccounts, getCurrencies } from "@/lib/queries";
import { createAccount } from "@/app/actions/accounts";
import AccountForm from "@/components/AccountForm";
import { fmtMoney } from "@/lib/money";
import { ACCOUNT_TYPES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  await requireAuth();
  const accounts = getAccounts();
  const currencies = getCurrencies();
  const typeLabel = new Map(ACCOUNT_TYPES.map((t) => [t.value as string, t]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts الحسابات</h1>
      </div>

      <details className="card p-4">
        <summary className="cursor-pointer font-medium text-emerald-800">
          ➕ New account حساب جديد
        </summary>
        <div className="mt-4">
          <AccountForm action={createAccount} currencies={currencies} submitLabel="Create account" />
        </div>
      </details>

      {accounts.length === 0 && (
        <p className="text-sm text-stone-500 py-8 text-center">
          No accounts yet — create your wallets, banks, cards and BNPL providers above.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {accounts.map((a) => {
          const t = typeLabel.get(a.type);
          return (
            <Link key={a.id} href={`/accounts/${a.id}`} className="card p-4 hover:border-emerald-600 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{a.emoji ?? t?.emoji ?? "💼"}</span>
                  <div className="min-w-0">
                    <div dir="auto" className="font-semibold truncate">{a.name}</div>
                    <div className="text-xs text-stone-500">{t?.label ?? a.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${a.balance < 0 ? "text-red-600" : "text-stone-900"}`}>
                    {fmtMoney(a.balance, a.currency)}
                  </div>
                  {(a.type === "credit_card" || a.type === "bnpl") && a.balance < 0 && (
                    <div className="text-xs text-red-500">owed عليك</div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
