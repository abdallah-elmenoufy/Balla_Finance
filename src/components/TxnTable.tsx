import Link from "next/link";
import type { TxnRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/money";
import { deleteTxn } from "@/app/actions/transactions";
import ConfirmButton from "./ConfirmButton";

function label(t: TxnRow): string {
  if (t.description) return t.description;
  if (t.type === "transfer") return `${t.account_name} → ${t.to_account_name}`;
  if (t.category_name) return t.category_name;
  return t.type;
}

function amountCell(t: TxnRow) {
  const cur = t.account_currency ?? t.person_currency ?? "";
  switch (t.type) {
    case "income":
      return <span className="text-emerald-700 font-bold">+{fmtMoney(t.amount, cur)}</span>;
    case "person_in":
      return (
        <span className="text-amber-800 font-bold">
          +{fmtMoney(t.person_amount ?? t.amount, t.person_currency ?? cur)}
        </span>
      );
    case "person_out":
      return (
        <span className="text-purple-700 font-bold flex items-center justify-end gap-1">
          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-sm">
            سداد دين
          </span>
          <span>−{fmtMoney(t.amount, cur)}</span>
        </span>
      );
    case "expense":
      return (
        <span className="text-red-600 font-semibold">
          −{fmtMoney(t.amount, cur)}
          {t.person_name && (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded-sm mr-1">
              عن الغير
            </span>
          )}
        </span>
      );
    case "transfer":
      return (
        <span className="text-stone-700 font-semibold">
          {fmtMoney(t.amount, t.account_currency ?? "")}
          {t.to_account_currency !== t.account_currency &&
            ` → ${fmtMoney(t.to_amount ?? 0, t.to_account_currency ?? "")}`}
        </span>
      );
    case "adjustment": {
      const amt = t.account_id ? t.amount : (t.person_amount ?? 0);
      const c = t.account_id ? (t.account_currency ?? "") : (t.person_currency ?? "");
      return (
        <span className={amt >= 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
          {amt >= 0 ? "+" : "−"}
          {fmtMoney(Math.abs(amt), c)}
        </span>
      );
    }
  }
}

export default function TxnTable({ txns, showActions = true }: { txns: TxnRow[]; showActions?: boolean }) {
  if (txns.length === 0)
    return <p className="text-sm text-stone-500 py-8 text-center">No transactions yet لا توجد عمليات</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Details</th>
            <th className="py-2 pr-3 font-medium text-right">Amount</th>
            {showActions && <th className="py-2 w-20"></th>}
          </tr>
        </thead>
        <tbody>
          {txns.map((t) => (
            <tr key={t.id} className="border-b border-stone-100 hover:bg-stone-50">
              <td className="py-2 pr-3 whitespace-nowrap text-stone-500">{t.date}</td>
              <td className="py-2 pr-3">
                <div dir="auto" className="font-medium">
                  {t.category_emoji && <span className="mr-1">{t.category_emoji}</span>}
                  {label(t)}
                  {t.payee && <span className="text-stone-500"> → {t.payee}</span>}
                </div>
                <div className="text-xs text-stone-500" dir="auto">
                  {t.type === "transfer"
                    ? `${t.account_name} → ${t.to_account_name}`
                    : (t.account_name ?? "")}
                  {t.person_name && (
                    <span className="ml-1 inline-block rounded-full bg-amber-100 text-amber-800 px-1.5">
                      🤝 {t.person_name}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 pr-3 text-right whitespace-nowrap">{amountCell(t)}</td>
              {showActions && (
                <td className="py-2">
                  <div className="flex gap-1 justify-end">
                    <Link
                      href={`/transactions/${t.id}/edit`}
                      className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                    >
                      ✏️
                    </Link>
                    <ConfirmButton
                      action={deleteTxn.bind(null, t.id)}
                      label="🗑"
                      message="Delete this transaction?"
                      className="rounded-md border border-stone-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                    />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
