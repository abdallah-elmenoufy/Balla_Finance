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

const TYPE_DESCRIPTIONS: Record<TxnType, string> = {
  expense: "🛒 مصروف شخصي عادي يتم خصمه من رصيد حسابك أو محفظتك",
  income: "💰 دخل أو مرتب أو أرباح واردة إلى أحد حساباتك",
  transfer: "🔄 تحويل أموال بين حساباتك (أو سداد لبطاقة ائتمانية من حسابك البنكي)",
  person_out: "🤝 سداد دين عائلي لشخص — يُخصم من حسابك ويُخصم من رصيد دين ذلك الشخص",
  person_in: "📥 استلام أمانة أو مبلغ جديد من شخص يُسجل كدين في ذمتك",
  adjustment: "⚖️ تسوية وتعديل رصيد حساب أو مديونية شخص لمطابقة الواقع",
};

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
  people: { id: number; name: string; initial_currency?: string }[];
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

  const [exchangeRate, setExchangeRate] = useState<string>("50.00");
  const [amountVal, setAmountVal] = useState<string>(
    major(initial?.amount, initial?.account_currency)
  );
  const [personAmountVal, setPersonAmountVal] = useState<string>(
    major(initial?.person_amount, initial?.person_currency)
  );

  const accCur = acc?.currency ?? "EGP";
  const effPersonCur = personCurrency || accCur;
  const personLinked =
    type === "person_in" || type === "person_out" || (type === "expense" && personId !== "");
  const showPersonAmount = personLinked && effPersonCur !== accCur;
  const showCategory = type === "expense" || type === "income";
  const kind = type === "income" ? "income" : "expense";
  const personAdjust = type === "adjustment" && adjustTarget === "person";

  function handlePersonChange(newPid: string) {
    setPersonId(newPid);
    const p = people.find((x) => String(x.id) === newPid);
    if (p?.initial_currency && !initial) {
      setPersonCurrency(p.initial_currency);
    }
  }

  function handlePersonAmountChange(val: string, rVal = exchangeRate) {
    setPersonAmountVal(val);
    const r = parseFloat(rVal);
    if (!isNaN(r) && r > 0 && val) {
      setAmountVal((parseFloat(val) * r).toFixed(2));
    }
  }

  function handleAmountChange(val: string, rVal = exchangeRate) {
    setAmountVal(val);
    const r = parseFloat(rVal);
    if (!isNaN(r) && r > 0 && val && showPersonAmount) {
      setPersonAmountVal((parseFloat(val) / r).toFixed(2));
    }
  }

  function handleRateChange(newRate: string) {
    setExchangeRate(newRate);
    const r = parseFloat(newRate);
    if (!isNaN(r) && r > 0 && personAmountVal) {
      setAmountVal((parseFloat(personAmountVal) * r).toFixed(2));
    }
  }

  const accountSelect = (
    name: string,
    value: string,
    onChange: (v: string) => void,
    label: string,
    helper?: string
  ) => (
    <div>
      <label className="label">{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input font-semibold"
        required
      >
        <option value="">— اختر الحساب —</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.emoji ?? "💼"} {a.name} ({a.currency})
          </option>
        ))}
      </select>
      {helper && <span className="helper-text">{helper}</span>}
    </div>
  );

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base" dir="auto">
      <input type="hidden" name="redirect_to" value={redirectTo} />

      {/* Type Selector with Pills */}
      <div className="col-span-1 sm:col-span-2 space-y-2">
        <label className="label">نوع العملية (Type)</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TXN_TYPE_LABELS) as TxnType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`rounded-xl px-4 py-2 text-sm sm:text-base font-semibold border cursor-pointer transition-all shadow-2xs ${
                type === t
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                  : "bg-white border-stone-200 text-stone-700 hover:border-emerald-600 hover:bg-stone-50"
              }`}
            >
              {TXN_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
        <div className="text-xs text-stone-600 bg-stone-50 border border-stone-200/80 p-2.5 rounded-xl mt-1">
          {TYPE_DESCRIPTIONS[type]}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="label">التاريخ (Date)</label>
        <input
          name="date"
          type="date"
          defaultValue={initial?.date ?? todayISO()}
          className="input font-semibold"
          required
        />
        <span className="helper-text">تاريخ حدوث المعاملة</span>
      </div>

      {/* Adjustment Target */}
      {type === "adjustment" && (
        <div>
          <label className="label">الجهة المراد تسوية رصيدها</label>
          <select
            name="adjust_target"
            value={adjustTarget}
            onChange={(e) => setAdjustTarget(e.target.value)}
            className="input font-semibold"
          >
            <option value="account">تسوية رصيد حساب بنكي / محفظة</option>
            <option value="person">تسوية رصيد أمانة / دين شخص</option>
          </select>
        </div>
      )}

      {/* From Account / Account */}
      {!personAdjust &&
        accountSelect(
          "account_id",
          accountId,
          setAccountId,
          type === "transfer"
            ? "من حساب (الحساب المخصوم منه)"
            : type === "income" || type === "person_in"
              ? "إلى حساب (الحساب المودع فيه)"
              : "الحساب المعني",
          type === "person_out" ? "الحساب الذي خرجت منه أموال السداد" : undefined
        )}

      {/* To Account (Transfer) */}
      {type === "transfer" &&
        accountSelect(
          "to_account_id",
          toAccountId,
          setToAccountId,
          "إلى حساب (الحساب المستلم)",
          "يمكنك اختيار بطاقة ائتمانية لسداد مستحقاتها"
        )}

      {/* Person Selection */}
      {(type === "person_in" || type === "person_out" || personAdjust) && (
        <div>
          <label className="label">
            {type === "person_out" ? "الشخص المستلم لسداد الدين" : "الشخص صاحب الأمانة"}
          </label>
          <select
            name="person_id"
            value={personId}
            onChange={(e) => handlePersonChange(e.target.value)}
            className="input font-semibold"
            required
          >
            <option value="">— اختر الشخص —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.initial_currency ? `(${p.initial_currency})` : ""}
              </option>
            ))}
          </select>
          <span className="helper-text">سيتم خصم هذا المبلغ فوراً من دينه المسجل</span>
        </div>
      )}

      {/* Expense on behalf of */}
      {type === "expense" && (
        <div>
          <label className="label">بالنيابة عن شخص (اختياري)</label>
          <select
            name="person_id"
            value={personId}
            onChange={(e) => handlePersonChange(e.target.value)}
            className="input font-semibold"
          >
            <option value="">— لنفسي (مصروف شخصي) —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.initial_currency ? `(${p.initial_currency})` : ""}
              </option>
            ))}
          </select>
          <span className="helper-text">إذا دفعت عنه سيُحسب كسداد دين أو دين عليه</span>
        </div>
      )}

      {/* Cross-Currency Debt Repayment Banner */}
      {showPersonAmount && (
        <div className="col-span-1 sm:col-span-2 bg-amber-50/90 border border-amber-300 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-950">
            <span className="flex items-center gap-1.5">
              <span>💱</span>
              <span>تحويل وصرف عملات لسداد الدين: ({effPersonCur}) مقابل حسابك ({accCur})</span>
            </span>
            <span className="text-[11px] bg-amber-200/90 px-2.5 py-0.5 rounded-full font-bold">
              حساب ثنائي الاتجاه
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-stone-700 font-mono">سعر الصرف: 1 {effPersonCur} =</span>
            <input
              type="number"
              step="any"
              name="exchange_rate"
              value={exchangeRate}
              onChange={(e) => handleRateChange(e.target.value)}
              className="input text-base font-black font-mono py-1.5 px-3 w-28 bg-white border-amber-300"
              placeholder="50.00"
            />
            <span className="text-sm font-bold text-stone-700">{accCur}</span>
            <span className="text-xs text-stone-500">
              (تعديل أي من المبلغين يحسب الآخر فوراً بهذا السعر)
            </span>
          </div>
        </div>
      )}

      {/* Amount Input */}
      {!personAdjust && (
        <div>
          <label className="label">
            المبلغ المسدد من حسابك {acc ? `(${accCur})` : ""}
            {type === "adjustment" ? " — (استخدم سالب للتخفيض)" : ""}
          </label>
          <input
            name="amount"
            inputMode="decimal"
            value={amountVal}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="input text-lg font-black font-mono"
            placeholder="0.00"
            required
          />
          <span className="helper-text">
            {showPersonAmount ? `المبلغ الذي سيُخصم من رصيدك في ${acc?.name ?? "الحساب"}` : "قيمة المعاملة بالعملة المختارة"}
          </span>
        </div>
      )}

      {/* Cross Currency Transfer Amount */}
      {type === "transfer" && toAcc && toAcc.currency !== accCur && (
        <div>
          <label className="label">المبلغ المستلم في الحساب الوجهة ({toAcc.currency})</label>
          <input
            name="to_amount"
            inputMode="decimal"
            defaultValue={major(initial?.to_amount, initial?.to_account_currency)}
            className="input text-lg font-black font-mono"
            placeholder="0.00"
            required
          />
          <span className="helper-text">المبلغ الفعلي الذي وصل بعد الصرف</span>
        </div>
      )}

      {/* Person Currency (if different) */}
      {(personLinked || personAdjust) && (
        <div>
          <label className="label">عملة دين الشخص</label>
          <select
            name="person_currency"
            value={effPersonCur}
            onChange={(e) => setPersonCurrency(e.target.value)}
            className="input font-semibold"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.name})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Person Amount */}
      {(showPersonAmount || personAdjust) && (
        <div>
          <label className="label">المبلغ المخصوم من دين الشخص ({effPersonCur})</label>
          <input
            name="person_amount"
            inputMode="decimal"
            value={personAmountVal}
            onChange={(e) => handlePersonAmountChange(e.target.value)}
            className="input text-lg font-black font-mono bg-emerald-50/40 border-emerald-300"
            placeholder="0.00"
            required
          />
          <span className="helper-text">القيمة التي ستُسقط فوراً من دين الشخص بالـ {effPersonCur}</span>
        </div>
      )}

      {/* Category */}
      {showCategory && (
        <div>
          <label className="label">التصنيف (Category)</label>
          <select
            name="category_id"
            defaultValue={initial?.category_id ?? ""}
            className="input font-semibold"
          >
            <option value="">— بدون تصنيف —</option>
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

      {/* Payee */}
      {(type === "expense" || type === "person_out") && (
        <div>
          <label className="label">المستفيد / المحل (اختياري)</label>
          <input
            name="payee"
            dir="auto"
            defaultValue={initial?.payee ?? ""}
            className="input"
            placeholder="فودافون / كارفور / الصيدلية..."
          />
        </div>
      )}

      {/* Description */}
      <div className="col-span-1 sm:col-span-2">
        <label className="label">البيان / الوصف (Description)</label>
        <input
          name="description"
          dir="auto"
          defaultValue={initial?.description ?? ""}
          className="input"
          placeholder="تفاصيل المعاملة..."
        />
      </div>

      {/* Submit Button */}
      <div className="col-span-1 sm:col-span-2 pt-2">
        <button className="btn w-full py-3 text-lg font-bold">{submitLabel}</button>
      </div>
    </form>
  );
}
