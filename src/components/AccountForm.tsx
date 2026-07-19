"use client";

import { useState } from "react";
import { ACCOUNT_TYPES, type Account, type Currency } from "@/lib/types";

export default function AccountForm({
  action,
  currencies,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  currencies: Currency[];
  initial?: Account | null;
  submitLabel: string;
}) {
  const [type, setType] = useState(initial?.type ?? "mobile_wallet");
  const dec = (code: string) => currencies.find((c) => c.code === code)?.decimals ?? 2;
  const major = (minor: number | null | undefined, code: string) =>
    minor == null ? "" : String(minor / 10 ** dec(code));
  const cur = initial?.currency ?? "EGP";
  const isCredit = type === "credit_card" || type === "bnpl";

  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">Emoji</label>
        <input name="emoji" defaultValue={initial?.emoji ?? ""} className="input" placeholder="💳" />
      </div>
      <div>
        <label className="label">Name الاسم</label>
        <input name="name" required dir="auto" defaultValue={initial?.name ?? ""} className="input" placeholder="Vodafone Cash / CIB / Valu…" />
      </div>
      <div>
        <label className="label">Type</label>
        <select name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className="input">
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.emoji} {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Currency</label>
        <select name="currency" defaultValue={cur} className="input">
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.symbol}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">
          {isCredit ? "Current balance (negative = owed)" : "Opening balance الرصيد الحالي"}
        </label>
        <input name="opening_balance" inputMode="decimal" defaultValue={major(initial?.opening_balance, cur)} className="input" placeholder="0.00" />
      </div>
      {isCredit && (
        <>
          <div>
            <label className="label">Credit limit (optional)</label>
            <input name="credit_limit" inputMode="decimal" defaultValue={major(initial?.credit_limit, cur)} className="input" />
          </div>
          <div>
            <label className="label">Payment due day of month (optional)</label>
            <input name="due_day" type="number" min={1} max={31} defaultValue={initial?.due_day ?? ""} className="input" />
          </div>
        </>
      )}
      <div className="col-span-2">
        <button className="btn w-full">{submitLabel}</button>
      </div>
    </form>
  );
}
