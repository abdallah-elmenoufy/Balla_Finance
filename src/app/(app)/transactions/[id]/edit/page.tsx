import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import {
  getAccounts,
  getCategories,
  getCurrencies,
  getPeople,
  getTxn,
} from "@/lib/queries";
import { updateTxn } from "@/app/actions/transactions";
import TxnForm from "@/components/TxnForm";

export const dynamic = "force-dynamic";

export default async function EditTxnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const txn = getTxn(Number(id));
  if (!txn) notFound();

  return (
    <div className="space-y-4">
      <div className="text-sm text-stone-500">
        <Link href="/transactions" className="hover:underline">← Transactions</Link>
      </div>
      <h1 className="text-2xl font-bold">Edit transaction تعديل</h1>
      <div className="card p-4">
        <TxnForm
          accounts={getAccounts(true)}
          people={getPeople(true)}
          categories={getCategories()}
          currencies={getCurrencies()}
          action={updateTxn.bind(null, txn.id)}
          initial={txn}
          redirectTo="/transactions"
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
