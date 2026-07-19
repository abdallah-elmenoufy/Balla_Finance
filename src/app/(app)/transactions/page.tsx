import { requireAuth } from "@/lib/auth";
import {
  getAccounts,
  getCategories,
  getCurrencies,
  getPeople,
  getTxns,
} from "@/lib/queries";
import { createTxn } from "@/app/actions/transactions";
import TxnForm from "@/components/TxnForm";
import TxnTable from "@/components/TxnTable";
import { TXN_TYPE_LABELS, type TxnType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAuth();
  const sp = await searchParams;
  const accounts = getAccounts();
  const people = getPeople();
  const categories = getCategories();
  const currencies = getCurrencies();
  const filters = {
    month: sp.month || undefined,
    accountId: sp.account ? Number(sp.account) : undefined,
    personId: sp.person ? Number(sp.person) : undefined,
    type: sp.type || undefined,
  };
  const txns = getTxns(filters);
  const hasFilter = !!(filters.month || filters.accountId || filters.personId || filters.type);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transactions العمليات</h1>

      <details className="card p-4" open={!hasFilter}>
        <summary className="cursor-pointer font-medium text-emerald-800">
          ➕ New transaction عملية جديدة
        </summary>
        <div className="mt-4">
          <TxnForm
            accounts={accounts}
            people={people}
            categories={categories}
            currencies={currencies}
            action={createTxn}
            redirectTo="/transactions"
            submitLabel="Save transaction"
          />
        </div>
      </details>

      <form className="card p-3 flex flex-wrap gap-2 items-end text-sm">
        <div>
          <label className="label">Month</label>
          <input type="month" name="month" defaultValue={sp.month ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Account</label>
          <select name="account" defaultValue={sp.account ?? ""} className="input">
            <option value="">All</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Person</label>
          <select name="person" defaultValue={sp.person ?? ""} className="input">
            <option value="">All</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select name="type" defaultValue={sp.type ?? ""} className="input">
            <option value="">All</option>
            {(Object.keys(TXN_TYPE_LABELS) as TxnType[]).map((t) => (
              <option key={t} value={t}>{TXN_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <button className="btn-secondary">Filter</button>
        {hasFilter && (
          <a href="/transactions" className="text-xs text-stone-500 hover:underline self-center">
            ✕ clear
          </a>
        )}
      </form>

      <div className="card p-4">
        <TxnTable txns={txns} />
      </div>
    </div>
  );
}
