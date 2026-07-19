"use client";

import { useState } from "react";
import type { Category, Currency, TxnType } from "@/lib/types";
import { TXN_TYPE_LABELS } from "@/lib/types";
import type { TxnRow } from "@/lib/queries";
import { todayISO } from "@/lib/money";

interface AccountOpt {
  id: number;
  name: string;
  currency: string;
  emoji: string | null;
  type: string;
}

export default function TxnForm({
  accounts,
  people,
  categories,
  currencies,
  action,
  initial,
  redirectTo,
  submitLabel,
}: {
  accounts: AccountOpt[];
  people: { id: number; name: string }[];
  categories: Category[];
  currencies: Currency[];
  action: (formData: FormData) => Promise<void>;
  initial?: TxnRow | null;
  redirectTo: string;
  submitLabel: string;
}) {
  const [type, setType] = useState<TxnType>((initial?.type as TxnType) ?? "expense");
  const [accountId, setAccountId] = useState<string>(String(initial?.account_id ?? accounts[0]?.id ?? ""));
  const [toAccountId, setToAccountId] = useState<string>(String(initial?.to_account_id ?? ""));
  const [personId, setPersonId] = useState<string>(String(initial?.person_id ?? ""));
  const [personCurrency, setPersonCurrency] = useState<string>(initial?.person_currency ?? "");
  const [adjustTarget, setAdjustTarget] = useState<string>(
    initial?.type === "adjustment" && initial?.person_id ? "person" : "account"
  );

  const acc = accounts.find((a) => String(a.id) === accountId);
  const toAcc = accounts.find((a) => String(a.id) === toAccountId);
  const dec = (code?: string | null) =>
    currencies.find((c) => c.code === code)?.decimals ?? 2;
  const major = (minor: number | null | undefined, code?: string | null) =>
    minor == null ? "" : String(minor / 10 ** dec(code));

  const accCur = acc?.currency ?? "EGP";
  const effPersonCur = personCurrency || accCur;
  const personLinked =
    type === "person_in" || type === "person_out" || (type === "expense" && personId !== "");
  const showPersonAmount = personLinked && effPersonCur !== accCur;
  const showCategory = type === "expense" || type === "income";
  const kind = type === "income" ? "income" : "expense";
  const personAdjust = type === "adjustment" && adjustTarget === "person";

  const accountSelect = (
    name: string,
    value: string,
    onChange: (v: string) => void,
    label: string
  ) => (
    <div>
      <label className="label">{label}</label>
      <select name={name} value={value} onChange={(e) => onChange(e.target.value)} className="input" required>
        <option value="">— choose —</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.emoji ?? "💼"} {a.name} ({a.currency})
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <input type="hidden" name="redirect_to" value={redirectTo} />
      <div className="col-span-2">
        <label className="label">Type النوع</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TXN_TYPE_LABELS) as TxnType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1.5 text-xs border cursor-pointer ${
                type === t
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-white border-stone-300 text-stone-600 hover:border-emerald-600"
              }`}
            >
              {TXN_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      <div>
        <label className="label">Date التاريخ</label>
        <input name="date" type="date" defaultValue={initial?.date ?? todayISO()} className="input" required />
      </div>

      {type === "adjustment" && (
        <div>
          <label className="label">Adjust</label>
          <select name="adjust_target" value={adjustTarget} onChange={(e) => setAdjustTarget(e.target.value)} className="input">
            <option value="account">An account balance</option>
            <option value="person">A person balance (امانة)</option>
          </select>
        </div>
      )}

      {!personAdjust &&
        accountSelect(
          "account_id",
          accountId,
          setAccountId,
          type === "transfer" ? "From account من" : type === "income" || type === "person_in" ? "Into account إلى" : "Account الحساب"
        )}

      {type === "transfer" &&
        accountSelect("to_account_id", toAccountId, setToAccountId, "To account إلى")}

      {(type === "person_in" || type === "person_out" || personAdjust) && (
        <div>
          <label className="label">Person الشخص</label>
          <select name="person_id" value={personId} onChange={(e) => setPersonId(e.target.value)} className="input" required>
            <option value="">— choose —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {type === "expense" && (
        <div>
          <label className="label">On behalf of بالنيابة عن (optional)</label>
          <select name="person_id" value={personId} onChange={(e) => setPersonId(e.target.value)} className="input">
            <option value="">— myself لنفسي —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!personAdjust && (
        <div>
          <label className="label">
            Amount المبلغ {acc ? `(${accCur})` : ""}
            {type === "adjustment" ? " — use minus for decrease" : ""}
          </label>
          <input
            name="amount"
            inputMode="decimal"
            defaultValue={major(initial?.amount, initial?.account_currency)}
            className="input"
            placeholder="0.00"
            required
          />
        </div>
      )}

      {type === "transfer" && toAcc && toAcc.currency !== accCur && (
        <div>
          <label className="label">Amount received ({toAcc.currency})</label>
          <input
            name="to_amount"
            inputMode="decimal"
            defaultValue={major(initial?.to_amount, initial?.to_account_currency)}
            className="input"
            placeholder="0.00"
            required
          />
        </div>
      )}

      {(personLinked || personAdjust) && (
        <div>
          <label className="label">Person&apos;s ledger currency عملة الامانة</label>
          <select name="person_currency" value={effPersonCur} onChange={(e) => setPersonCurrency(e.target.value)} className="input">
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
      )}

      {(showPersonAmount || personAdjust) && (
        <div>
          <label className="label">
            Amount on person&apos;s ledger ({effPersonCur})
            {personAdjust ? " — minus = they owe me more" : ""}
          </label>
          <input
            name="person_amount"
            inputMode="decimal"
            defaultValue={major(initial?.person_amount, initial?.person_currency)}
            className="input"
            placeholder="0.00"
            required
          />
        </div>
      )}

      {showCategory && (
        <div>
          <label className="label">Category التصنيف</label>
          <select name="category_id" defaultValue={initial?.category_id ?? ""} className="input">
            <option value="">— none —</option>
            {categories
              .filter((c) => c.kind === kind)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {(type === "expense" || type === "person_out") && (
        <div>
          <label className="label">Payee المستفيد (optional)</label>
          <input name="payee" dir="auto" defaultValue={initial?.payee ?? ""} className="input" placeholder="فودافون / مدرسة / …" />
        </div>
      )}

      <div className="col-span-2">
        <label className="label">Description الوصف</label>
        <input name="description" dir="auto" defaultValue={initial?.description ?? ""} className="input" placeholder="…" />
      </div>

      <div className="col-span-2">
        <button className="btn w-full">{submitLabel}</button>
      </div>
    </form>
  );
}
