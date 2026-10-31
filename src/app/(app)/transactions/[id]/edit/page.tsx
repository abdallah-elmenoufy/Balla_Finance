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
    <div className="space-y-6">
      <div className="text-sm text-stone-500">
        <Link href="/transactions" className="hover:underline flex items-center gap-1 font-semibold text-emerald-800">
          <span>←</span>
          <span>الرجوع إلى سجل العمليات</span>
        </Link>
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          تعديل تفاصيل العملية المالية
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          تعديل المبلغ، الحساب، التصنيف، أو الشخص التابع لهذه الحركة
        </p>
      </div>
      <div className="card p-6 border-stone-200/90 shadow-sm">
        <TxnForm
          accounts={getAccounts(true)}
          people={getPeople(true)}
          categories={getCategories()}
          currencies={getCurrencies()}
          action={updateTxn.bind(null, txn.id)}
          initial={txn}
          redirectTo="/transactions"
          submitLabel="حفظ التعديلات والتحديث"
        />
      </div>
    </div>
  );
}
