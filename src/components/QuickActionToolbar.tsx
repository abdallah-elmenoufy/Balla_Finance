"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AccountWithBalance,
  Category,
  CreditCardStatus,
  Currency,
  Person,
  PersonDebtSummary,
  PersonReceivableSummary,
} from "@/lib/types";
import { fmtMoney, todayISO } from "@/lib/money";
import { createTxn } from "@/app/actions/transactions";

export interface QuickPayTarget {
  type: "person" | "card" | "collect";
  id: number;
  name: string;
  amount?: number;
  currency?: string;
}

export default function QuickActionToolbar({
  accounts,
  people,
  personDebts,
  creditCards,
  categories,
  currencies,
  externalTrigger,
  receivables = [],
}: {
  accounts: AccountWithBalance[];
  people: Person[];
  personDebts: PersonDebtSummary[];
  creditCards: CreditCardStatus[];
  categories: Category[];
  currencies: Currency[];
  externalTrigger?: QuickPayTarget | null;
  receivables?: PersonReceivableSummary[];
}) {
  const [modalType, setModalType] = useState<
    "debt" | "card" | "expense" | "income" | "transfer" | "collect" | null
  >(null);

  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedFromAccountId, setSelectedFromAccountId] = useState<string>("");
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [personAmountInput, setPersonAmountInput] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<string>("50.00");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const fundingAccounts = accounts.filter((a) => a.type !== "credit_card" && a.type !== "bnpl");

  const targetDebtPerson = personDebts.find((p) => String(p.person_id) === selectedPersonId);
  const targetReceivablePerson = receivables.find((p) => String(p.person_id) === selectedPersonId);

  const fromAccount = fundingAccounts.find((a) => String(a.id) === selectedFromAccountId);
  const accCur = fromAccount?.currency || "EGP";
  const personCur =
    modalType === "collect"
      ? (targetReceivablePerson?.currency || "EGP")
      : (targetDebtPerson?.currency || "EGP");
  const isCrossCurrency = Boolean(accCur && personCur && accCur !== personCur);

  function handlePersonAmountChange(val: string, rateVal = exchangeRate) {
    setPersonAmountInput(val);
    const r = parseFloat(rateVal);
    if (!isNaN(r) && r > 0 && val) {
      setAmountInput((parseFloat(val) * r).toFixed(2));
    } else if (!val) {
      setAmountInput("");
    }
  }

  function handleAccountAmountChange(val: string, rateVal = exchangeRate) {
    setAmountInput(val);
    const r = parseFloat(rateVal);
    if (!isNaN(r) && r > 0 && val) {
      setPersonAmountInput((parseFloat(val) / r).toFixed(2));
    } else if (!val) {
      setPersonAmountInput("");
    }
  }

  function handleRateChange(newRate: string) {
    setExchangeRate(newRate);
    const r = parseFloat(newRate);
    if (!isNaN(r) && r > 0 && personAmountInput) {
      setAmountInput((parseFloat(personAmountInput) * r).toFixed(2));
    }
  }

  useEffect(() => {
    if (externalTrigger) {
      if (externalTrigger.type === "person") {
        setSelectedPersonId(String(externalTrigger.id));
        const pTarget = personDebts.find((p) => p.person_id === externalTrigger.id);
        const fromAcc = fundingAccounts.find((a) => String(a.id) === selectedFromAccountId) || fundingAccounts[0];
        const pCur = externalTrigger.currency || pTarget?.currency || "EGP";
        const aCur = fromAcc?.currency || "EGP";
        const amtMajor = externalTrigger.amount ? String(externalTrigger.amount / 100) : "";

        if (pCur !== aCur) {
          setPersonAmountInput(amtMajor);
          const r = parseFloat(exchangeRate) || 50;
          if (amtMajor) {
            setAmountInput((parseFloat(amtMajor) * r).toFixed(2));
          }
        } else {
          setAmountInput(amtMajor);
          setPersonAmountInput(amtMajor);
        }
        openModal("debt");
      } else if (externalTrigger.type === "collect") {
        setSelectedPersonId(String(externalTrigger.id));
        const pTarget = receivables.find((p) => p.person_id === externalTrigger.id);
        const fromAcc = fundingAccounts.find((a) => String(a.id) === selectedFromAccountId) || fundingAccounts[0];
        const pCur = externalTrigger.currency || pTarget?.currency || "EGP";
        const aCur = fromAcc?.currency || "EGP";
        const amtMajor = externalTrigger.amount ? String(externalTrigger.amount / 100) : "";

        if (pCur !== aCur) {
          setPersonAmountInput(amtMajor);
          const r = parseFloat(exchangeRate) || 50;
          if (amtMajor) {
            setAmountInput((parseFloat(amtMajor) * r).toFixed(2));
          }
        } else {
          setAmountInput(amtMajor);
          setPersonAmountInput(amtMajor);
        }
        openModal("collect");
      } else if (externalTrigger.type === "card") {
        setSelectedCardId(String(externalTrigger.id));
        if (externalTrigger.amount) {
          setAmountInput(String(externalTrigger.amount / 100));
        }
        openModal("card");
      }
    }
  }, [externalTrigger]);

  function openModal(type: "debt" | "card" | "expense" | "income" | "transfer" | "collect") {
    setModalType(type);
    if (!selectedFromAccountId && fundingAccounts.length > 0) {
      setSelectedFromAccountId(String(fundingAccounts[0].id));
    }
    if (type === "debt") {
      const firstWithDebt = personDebts.find((p) => p.remaining > 0);
      const debtPeople = people.filter((p) => p.initial_type !== "receivable");
      setSelectedPersonId(String(firstWithDebt ? firstWithDebt.person_id : (debtPeople[0]?.id || people[0]?.id || "")));
    }
    if (type === "collect") {
      const firstWithReceivable = receivables.find((r) => r.remaining > 0);
      const receivablePeople = people.filter((p) => p.initial_type === "receivable");
      setSelectedPersonId(String(firstWithReceivable ? firstWithReceivable.person_id : (receivablePeople[0]?.id || "")));
    }
    if (type === "card" && !selectedCardId && creditCards.length > 0) {
      setSelectedCardId(String(creditCards[0].id));
    }
    if (type === "expense" && !selectedCategoryId && categories.length > 0) {
      const firstExp = categories.find((c) => c.kind === "expense");
      if (firstExp) setSelectedCategoryId(String(firstExp.id));
    }
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
    setModalType(null);
    setAmountInput("");
    setPersonAmountInput("");
  }

  const targetCard = creditCards.find((c) => String(c.id) === selectedCardId);

  return (
    <>
      {/* Quick Action Toolbar Buttons */}
      <div className="card p-4 sm:p-5 bg-white border-stone-200/90 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span>
            <span>شريط العمليات السريعة بضغطة زر واحدة (Quick Actions)</span>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => openModal("debt")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-emerald-300 bg-emerald-50/80 text-emerald-950 font-bold text-sm sm:text-base hover:bg-emerald-100 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-xl">🤝</span>
            <span>سداد دين أمانة</span>
          </button>

          <button
            onClick={() => openModal("collect")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-teal-300 bg-teal-50/80 text-teal-950 font-bold text-sm sm:text-base hover:bg-teal-100 hover:border-teal-400 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-xl">📥</span>
            <span>تحصيل مستحق لي</span>
          </button>

          <button
            onClick={() => openModal("card")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-amber-300 bg-amber-50/80 text-amber-950 font-bold text-sm sm:text-base hover:bg-amber-100 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-xl">💳</span>
            <span>سداد بطاقة</span>
          </button>

          <button
            onClick={() => openModal("expense")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-red-200 bg-red-50/60 text-red-950 font-semibold text-sm sm:text-base hover:bg-red-100 hover:border-red-300 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-xl">🛒</span>
            <span>مصروف سريع</span>
          </button>

          <button
            onClick={() => openModal("income")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-stone-200 bg-stone-50 text-stone-900 font-semibold text-sm sm:text-base hover:bg-stone-100 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-xl">💰</span>
            <span>دخل جديد</span>
          </button>

          <button
            onClick={() => openModal("transfer")}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-stone-200 bg-stone-50 text-stone-900 font-semibold text-sm sm:text-base hover:bg-stone-100 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-xl">🔄</span>
            <span>تحويل رصيد</span>
          </button>
        </div>
      </div>

      {/* Accessible Native <dialog> Modal with Large Comfortable Controls */}
      <dialog
        ref={dialogRef}
        onCancel={closeModal}
        className="backdrop:bg-stone-900/60 backdrop:backdrop-blur-xs rounded-3xl p-0 border border-stone-300 shadow-2xl w-full max-w-lg m-auto"
      >
        <div className="p-6 sm:p-7 space-y-4 bg-white" dir="auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-black text-xl text-stone-900 flex items-center gap-2">
              {modalType === "debt" && <span>🤝 سداد دفعة من دين أمانة عائلية</span>}
              {modalType === "collect" && <span>📥 تحصيل دفعة من مستحقاتك بالخارج</span>}
              {modalType === "card" && <span>💳 سداد مستحقات بطاقة ائتمانية</span>}
              {modalType === "expense" && <span>🛒 تسجيل مصروف جديد</span>}
              {modalType === "income" && <span>💰 إضافة دخل أو إيراد جديد</span>}
              {modalType === "transfer" && <span>🔄 تحويل أموال بين حساباتي</span>}
            </h3>
            <button
              onClick={closeModal}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl text-xl cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Form Content */}
          <form action={createTxn} onSubmit={() => dialogRef.current?.close()}>
            <input type="hidden" name="redirect_to" value="/" />
            <input type="hidden" name="date" value={todayISO()} />

            {/* 1. REPAY FAMILY DEBT MODAL */}
            {modalType === "debt" && (
              <div className="space-y-4">
                <input type="hidden" name="type" value="person_out" />

                <div>
                  <label className="label">الشخص المستحق للدين (صاحب الأمانة)</label>
                  <select
                    name="person_id"
                    value={selectedPersonId}
                    onChange={(e) => {
                      const newPid = e.target.value;
                      setSelectedPersonId(newPid);
                      const target = personDebts.find((x) => String(x.person_id) === newPid);
                      if (target && fromAccount && target.currency !== fromAccount.currency) {
                        const remMajor = target.remaining > 0 ? String(target.remaining / 100) : "";
                        handlePersonAmountChange(remMajor);
                      }
                    }}
                    className="input font-bold"
                    required
                  >
                    {people.map((p) => {
                      const d = personDebts.find((x) => x.person_id === p.id);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name}{" "}
                          {d && d.remaining > 0
                            ? `(متبقي له في ذمتك: ${fmtMoney(d.remaining, d.currency)})`
                            : "(خالص)"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {targetDebtPerson && (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-950 flex justify-between items-center">
                    <span>
                      المتبقي لسداد هذا الدين: <b>{fmtMoney(targetDebtPerson.remaining, targetDebtPerson.currency)}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const remMajor = String(targetDebtPerson.remaining / 100);
                        if (isCrossCurrency) {
                          handlePersonAmountChange(remMajor);
                        } else {
                          setAmountInput(remMajor);
                          setPersonAmountInput(remMajor);
                        }
                      }}
                      className="text-emerald-800 underline font-black cursor-pointer text-sm"
                    >
                      سداد كامل الدين المتبقي
                    </button>
                  </div>
                )}

                <div>
                  <label className="label">سداد من حساب (الحساب الذي تدفع منه المال)</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => {
                      const newAccId = e.target.value;
                      setSelectedFromAccountId(newAccId);
                      const acc = fundingAccounts.find((a) => String(a.id) === newAccId);
                      if (acc && targetDebtPerson && acc.currency !== targetDebtPerson.currency && personAmountInput) {
                        handlePersonAmountChange(personAmountInput);
                      }
                    }}
                    className="input font-semibold"
                    required
                  >
                    {fundingAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji ?? "💼"} {a.name} — الرصيد: {fmtMoney(a.balance, a.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cross-Currency Converter (سداد دين دولاري بالجنيه المصري أو العكس) */}
                {isCrossCurrency ? (
                  <div className="space-y-3 pt-1">
                    <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                        <span className="flex items-center gap-1.5">
                          <span>💱</span>
                          <span>سداد دين بعملة ({personCur}) من حساب بعملة ({accCur})</span>
                        </span>
                        <span className="text-[11px] bg-amber-200/90 px-2 py-0.5 rounded-full font-bold">
                          تحويل تلقائي
                        </span>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-amber-900 block mb-1">
                          سعر تحويل العملة (1 {personCur} = كم {accCur}؟)
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-700 font-mono">1 {personCur} =</span>
                          <input
                            type="number"
                            step="any"
                            value={exchangeRate}
                            onChange={(e) => handleRateChange(e.target.value)}
                            className="input text-base font-black font-mono py-1.5 px-3 w-28 bg-white border-amber-300"
                            placeholder="50.00"
                            required
                          />
                          <span className="text-sm font-bold text-stone-700">{accCur}</span>
                        </div>
                      </div>
                    </div>

                    {/* Person Debt Amount in USD */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="label mb-0">
                          1. المبلغ المخصوم من الدين ({personCur})
                        </label>
                        {targetDebtPerson && (
                          <button
                            type="button"
                            onClick={() => handlePersonAmountChange(String(targetDebtPerson.remaining / 100))}
                            className="text-xs text-emerald-800 underline font-bold cursor-pointer"
                          >
                            كامل المتبقي ({fmtMoney(targetDebtPerson.remaining, personCur)})
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={personAmountInput}
                        onChange={(e) => handlePersonAmountChange(e.target.value)}
                        className="input text-xl font-black font-mono py-2.5 border-emerald-400 bg-emerald-50/30"
                        placeholder="0.00"
                        required
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {[20, 50, 100, 200, 500].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handlePersonAmountChange(String(v))}
                            className="text-xs font-bold bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 cursor-pointer"
                          >
                            +{v} {personCur}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Account Amount in EGP */}
                    <div>
                      <label className="label">
                        2. المبلغ المسدد من حسابك ({accCur}) — يتم خصمه من رصيدك
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={amountInput}
                        onChange={(e) => handleAccountAmountChange(e.target.value)}
                        className="input text-xl font-black font-mono py-2.5"
                        placeholder="0.00"
                        required
                      />
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {[500, 1000, 2500, 5000].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleAccountAmountChange(String(v))}
                            className="text-xs font-bold bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 cursor-pointer"
                          >
                            +{v} {accCur}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hidden Inputs for Backend */}
                    <input type="hidden" name="amount" value={amountInput} />
                    <input type="hidden" name="person_currency" value={personCur} />
                    <input type="hidden" name="person_amount" value={personAmountInput} />
                    <input type="hidden" name="exchange_rate" value={exchangeRate} />
                    <input
                      type="hidden"
                      name="notes"
                      value={`سعر الصرف: 1 ${personCur} = ${exchangeRate} ${accCur} (سداد ${amountInput} ${accCur} = خصم ${personAmountInput} ${personCur} من الدين)`}
                    />

                    {/* Visual Conversion Summary Box */}
                    <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-1.5">
                      <div className="font-bold flex items-center justify-between">
                        <span>💡 النتيجة المباشرة لتأكيد السداد:</span>
                        <span className="font-mono font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md">
                          1 {personCur} = {exchangeRate} {accCur}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200">
                        <div>
                          <span className="text-stone-500 block">يُخصم من رصيدك في {fromAccount?.name ?? "الحساب"}:</span>
                          <b className="text-stone-900 font-mono text-sm block mt-0.5">
                            {amountInput ? `${Number(amountInput).toLocaleString()} ${accCur}` : `0.00 ${accCur}`}
                          </b>
                        </div>
                        <div>
                          <span className="text-stone-500 block">يُنقص من دين {targetDebtPerson?.name ?? "الشخص"}:</span>
                          <b className="text-emerald-800 font-mono text-sm block mt-0.5">
                            {personAmountInput ? `${Number(personAmountInput).toLocaleString()} ${personCur}` : `0.00 ${personCur}`}
                          </b>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Same Currency Flow */
                  <div>
                    <label className="label">المبلغ المسدد ({targetDebtPerson?.currency ?? "EGP"})</label>
                    <input
                      name="amount"
                      type="number"
                      step="any"
                      value={amountInput}
                      onChange={(e) => {
                        setAmountInput(e.target.value);
                        setPersonAmountInput(e.target.value);
                      }}
                      className="input text-2xl font-black font-mono py-3"
                      placeholder="0.00"
                      required
                      autoFocus
                    />
                    <input type="hidden" name="person_currency" value={personCur} />
                    <input type="hidden" name="person_amount" value={amountInput} />
                    {/* Quick Amount Chips */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[500, 1000, 2000, 5000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setAmountInput(String(v));
                            setPersonAmountInput(String(v));
                          }}
                          className="text-xs sm:text-sm font-bold bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 cursor-pointer"
                        >
                          +{v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">وصف وبيان السداد</label>
                  <input
                    name="description"
                    className="input font-medium"
                    defaultValue={`سداد دفعة أمانة — ${targetDebtPerson?.name ?? ""}`}
                  />
                </div>

                <div className="pt-2">
                  <button className="btn w-full py-3.5 text-lg font-black bg-emerald-700 hover:bg-emerald-800 shadow-md">
                    تأكيد السداد والخصم من الدين 🤝
                  </button>
                </div>
              </div>
            )}

            {/* 6. COLLECT RECEIVABLE MODAL */}
            {modalType === "collect" && (
              <div className="space-y-4">
                <input type="hidden" name="type" value="person_in" />

                <div>
                  <label className="label">الشخص المدين لك (المطلوب منه المبلغ)</label>
                  {people.filter((p) => p.initial_type === "receivable").length === 0 && receivables.length === 0 ? (
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 space-y-2">
                      <p>لا يوجد أشخاص مسجلين كمدينين لك بعد ("فلوس ليك برة").</p>
                      <a href="/people" className="font-bold text-amber-800 underline block">
                        ➕ اذهب لصفحة الأشخاص لإضافة شخص مدين لك الآن ←
                      </a>
                    </div>
                  ) : (
                    <select
                      name="person_id"
                      value={selectedPersonId}
                      onChange={(e) => {
                        const newPid = e.target.value;
                        setSelectedPersonId(newPid);
                        const target = receivables.find((x) => String(x.person_id) === newPid);
                        if (target && fromAccount && target.currency !== fromAccount.currency) {
                          const remMajor = target.remaining > 0 ? String(target.remaining / 100) : "";
                          handlePersonAmountChange(remMajor);
                        }
                      }}
                      className="input font-bold"
                      required
                    >
                      {people
                        .filter((p) => p.initial_type === "receivable")
                        .map((p) => {
                          const r = receivables.find((x) => x.person_id === p.id);
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name}{" "}
                              {r && r.remaining > 0
                                ? `(متبقي لك في ذمته: ${fmtMoney(r.remaining, r.currency)})`
                                : "(تم استرداده بالكامل ✓)"}
                            </option>
                          );
                        })}
                    </select>
                  )}
                </div>

                {targetReceivablePerson && (
                  <div className="rounded-2xl bg-teal-50 border border-teal-200 p-3 text-sm text-teal-950 flex justify-between items-center">
                    <span>
                      المتبقي لتحصيل هذا المبلغ: <b>{fmtMoney(targetReceivablePerson.remaining, personCur)}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const remMajor = String(targetReceivablePerson.remaining / 100);
                        if (isCrossCurrency) {
                          handlePersonAmountChange(remMajor);
                        } else {
                          setAmountInput(remMajor);
                          setPersonAmountInput(remMajor);
                        }
                      }}
                      className="text-teal-800 underline font-black cursor-pointer text-sm"
                    >
                      تحصيل كامل المبلغ المتبقي
                    </button>
                  </div>
                )}

                <div>
                  <label className="label">إيداع في حساب (الحساب الذي دخلت إليه الأموال المحصلة)</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => {
                      const newAccId = e.target.value;
                      setSelectedFromAccountId(newAccId);
                      const acc = fundingAccounts.find((a) => String(a.id) === newAccId);
                      if (acc && targetReceivablePerson && acc.currency !== personCur && personAmountInput) {
                        handlePersonAmountChange(personAmountInput);
                      }
                    }}
                    className="input font-semibold"
                    required
                  >
                    {fundingAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji ?? "💼"} {a.name} — الرصيد: {fmtMoney(a.balance, a.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cross-Currency Converter (تحصيل مستحق دولاري وإيداعه بالجنيه أو العكس) */}
                {isCrossCurrency ? (
                  <div className="space-y-3 pt-1">
                    <div className="bg-teal-50/90 border border-teal-300 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                        <span className="flex items-center gap-1.5">
                          <span>💱</span>
                          <span>تحصيل مستحق بعملة ({personCur}) وإيداع بعملة ({accCur})</span>
                        </span>
                        <span className="text-[11px] bg-teal-200/90 px-2 py-0.5 rounded-full font-bold">
                          تحويل تلقائي
                        </span>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-teal-900 block mb-1">
                          سعر تحويل العملة (1 {personCur} = كم {accCur}؟)
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-700 font-mono">1 {personCur} =</span>
                          <input
                            type="number"
                            step="any"
                            value={exchangeRate}
                            onChange={(e) => handleRateChange(e.target.value)}
                            className="input text-base font-black font-mono py-1.5 px-3 w-28 bg-white border-teal-300"
                            placeholder="50.00"
                            required
                          />
                          <span className="text-sm font-bold text-stone-700">{accCur}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="label mb-0">
                          1. المبلغ المخصوم من المستحق ({personCur})
                        </label>
                        {targetReceivablePerson && (
                          <button
                            type="button"
                            onClick={() => handlePersonAmountChange(String(targetReceivablePerson.remaining / 100))}
                            className="text-xs text-teal-800 underline font-bold cursor-pointer"
                          >
                            كامل المتبقي ({fmtMoney(targetReceivablePerson.remaining, personCur)})
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={personAmountInput}
                        onChange={(e) => handlePersonAmountChange(e.target.value)}
                        className="input text-xl font-black font-mono py-2.5 border-teal-400 bg-teal-50/30"
                        placeholder="0.00"
                        required
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {[20, 50, 100, 200, 500].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handlePersonAmountChange(String(v))}
                            className="text-xs font-bold bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 cursor-pointer"
                          >
                            +{v} {personCur}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="label">
                        2. المبلغ المودع في حسابك ({accCur}) — يُضاف لرصيدك المتاح
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={amountInput}
                        onChange={(e) => handleAccountAmountChange(e.target.value)}
                        className="input text-xl font-black font-mono py-2.5"
                        placeholder="0.00"
                        required
                      />
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {[500, 1000, 2500, 5000].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleAccountAmountChange(String(v))}
                            className="text-xs font-bold bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 cursor-pointer"
                          >
                            +{v} {accCur}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input type="hidden" name="amount" value={amountInput} />
                    <input type="hidden" name="person_currency" value={personCur} />
                    <input type="hidden" name="person_amount" value={personAmountInput} />
                    <input type="hidden" name="exchange_rate" value={exchangeRate} />
                    <input
                      type="hidden"
                      name="notes"
                      value={`سعر الصرف: 1 ${personCur} = ${exchangeRate} ${accCur} (تحصيل ${personAmountInput} ${personCur} وإيداع ${amountInput} ${accCur})`}
                    />

                    <div className="bg-teal-50 border border-teal-300 rounded-2xl p-3.5 text-xs text-teal-950 space-y-1.5">
                      <div className="font-bold flex items-center justify-between">
                        <span>💡 النتيجة المباشرة لتأكيد التحصيل:</span>
                        <span className="font-mono font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded-md">
                          1 {personCur} = {exchangeRate} {accCur}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-teal-200">
                        <div>
                          <span className="text-stone-500 block">يُضاف لرصيدك في {fromAccount?.name ?? "الحساب"}:</span>
                          <b className="text-teal-900 font-mono text-sm block mt-0.5">
                            +{amountInput ? `${Number(amountInput).toLocaleString()} ${accCur}` : `0.00 ${accCur}`}
                          </b>
                        </div>
                        <div>
                          <span className="text-stone-500 block">يُنقص من مستحق {targetReceivablePerson?.name ?? "الشخص"}:</span>
                          <b className="text-teal-800 font-mono text-sm block mt-0.5">
                            -{personAmountInput ? `${Number(personAmountInput).toLocaleString()} ${personCur}` : `0.00 ${personCur}`}
                          </b>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="label">المبلغ المحصل والمودع ({personCur})</label>
                    <input
                      name="amount"
                      type="number"
                      step="any"
                      value={amountInput}
                      onChange={(e) => {
                        setAmountInput(e.target.value);
                        setPersonAmountInput(e.target.value);
                      }}
                      className="input text-2xl font-black font-mono py-3"
                      placeholder="0.00"
                      required
                      autoFocus
                    />
                    <input type="hidden" name="person_currency" value={personCur} />
                    <input type="hidden" name="person_amount" value={amountInput} />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[500, 1000, 2000, 5000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setAmountInput(String(v));
                            setPersonAmountInput(String(v));
                          }}
                          className="text-xs sm:text-sm font-bold bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 cursor-pointer"
                        >
                          +{v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">وصف وبيان التحصيل</label>
                  <input
                    name="description"
                    className="input font-medium"
                    defaultValue={`تحصيل دفعة مستحقة — ${targetReceivablePerson?.name ?? ""}`}
                  />
                </div>

                <div className="pt-2">
                  <button className="btn w-full py-3.5 text-lg font-black bg-teal-700 hover:bg-teal-800 shadow-md">
                    تأكيد استلام المبلغ وإيداعه في الحساب 📥
                  </button>
                </div>
              </div>
            )}

            {/* 2. PAY CREDIT CARD MODAL */}
            {modalType === "card" && (
              <div className="space-y-4">
                <input type="hidden" name="type" value="transfer" />

                <div>
                  <label className="label">البطاقة الائتمانية المطلوب سدادها</label>
                  <select
                    name="to_account_id"
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="input font-bold"
                    required
                  >
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji ?? "💳"} {c.name} — المديونية المستحقة: {fmtMoney(c.owed_amount, c.currency)}{" "}
                        (يوم {c.due_day})
                      </option>
                    ))}
                  </select>
                </div>

                {targetCard && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-950 flex justify-between items-center">
                    <span>
                      إجمالي مديونية البطاقة: <b>{fmtMoney(targetCard.owed_amount, targetCard.currency)}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(targetCard.owed_amount / 100))}
                      className="text-amber-900 underline font-black cursor-pointer text-sm"
                    >
                      سداد المديونية كاملة
                    </button>
                  </div>
                )}

                <div>
                  <label className="label">سداد من حساب (الحساب الذي يخرج منه المبلغ)</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => setSelectedFromAccountId(e.target.value)}
                    className="input font-semibold"
                    required
                  >
                    {fundingAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji ?? "💼"} {a.name} — الرصيد: {fmtMoney(a.balance, a.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">المبلغ المراد سداده ({targetCard?.currency ?? "EGP"})</label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="input text-2xl font-black font-mono py-3"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[500, 1000, 2000, 5000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmountInput(String(v))}
                        className="text-xs sm:text-sm font-bold bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 cursor-pointer"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">الوصف</label>
                  <input
                    name="description"
                    className="input font-medium"
                    defaultValue={`سداد بطاقة ${targetCard?.name ?? ""}`}
                  />
                </div>

                <div className="pt-2">
                  <button className="btn w-full py-3.5 text-lg font-black bg-amber-600 hover:bg-amber-700 text-white">
                    تأكيد سداد البطاقة وتفادي الغرامات 💳
                  </button>
                </div>
              </div>
            )}

            {/* 3. QUICK EXPENSE MODAL */}
            {modalType === "expense" && (
              <div className="space-y-4">
                <input type="hidden" name="type" value="expense" />

                <div>
                  <label className="label">خصم من حساب</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => setSelectedFromAccountId(e.target.value)}
                    className="input font-semibold"
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji ?? "💼"} {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">المبلغ المنفق</label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="input text-2xl font-black font-mono py-3"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">التصنيف</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {categories
                      .filter((c) => c.kind === "expense")
                      .slice(0, 8)
                      .map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setSelectedCategoryId(String(c.id))}
                          className={`text-xs sm:text-sm px-3 py-1.5 rounded-xl border cursor-pointer transition-colors font-medium ${
                            selectedCategoryId === String(c.id)
                              ? "bg-red-600 text-white border-red-600 font-bold"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          {c.emoji} {c.name}
                        </button>
                      ))}
                  </div>
                  <input type="hidden" name="category_id" value={selectedCategoryId} />
                </div>

                <div>
                  <label className="label">الوصف / المستفيد (اختياري)</label>
                  <input
                    name="description"
                    className="input"
                    placeholder="سوبرماركت / بنزين / فواتير..."
                  />
                </div>

                <div className="pt-2">
                  <button className="btn w-full py-3.5 text-lg font-black bg-red-600 hover:bg-red-700">
                    حفظ المصروف 🛒
                  </button>
                </div>
              </div>
            )}

            {/* 4. QUICK INCOME MODAL */}
            {modalType === "income" && (
              <div className="space-y-4">
                <input type="hidden" name="type" value="income" />

                <div>
                  <label className="label">إيداع في حساب</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => setSelectedFromAccountId(e.target.value)}
                    className="input font-semibold"
                    required
                  >
                    {fundingAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji ?? "💼"} {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">المبلغ المكتسب</label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="input text-2xl font-black font-mono py-3"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">مصدر الدخل</label>
                  <select name="category_id" className="input font-semibold">
                    {categories
                      .filter((c) => c.kind === "income")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="label">الوصف</label>
                  <input
                    name="description"
                    className="input"
                    placeholder="مرتب الشهر / شغل جانبي فريلانس..."
                  />
                </div>

                <div className="pt-2">
                  <button className="btn w-full py-3.5 text-lg font-black bg-emerald-700 hover:bg-emerald-800">
                    إضافة الدخل 💰
                  </button>
                </div>
              </div>
            )}

            {/* 5. QUICK TRANSFER MODAL */}
            {modalType === "transfer" && (
              <div className="space-y-4">
                <input type="hidden" name="type" value="transfer" />

                <div>
                  <label className="label">من حساب</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => setSelectedFromAccountId(e.target.value)}
                    className="input font-semibold"
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji ?? "💼"} {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">إلى حساب</label>
                  <select
                    name="to_account_id"
                    value={selectedToAccountId}
                    onChange={(e) => setSelectedToAccountId(e.target.value)}
                    className="input font-semibold"
                    required
                  >
                    <option value="">— اختر الحساب المستلم —</option>
                    {accounts
                      .filter((a) => String(a.id) !== selectedFromAccountId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.emoji ?? "💼"} {a.name} ({a.currency})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="label">المبلغ المحول</label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="input text-2xl font-black font-mono py-3"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>

                <div className="pt-2">
                  <button className="btn w-full py-3.5 text-lg font-black bg-stone-900 hover:bg-stone-950">
                    تنفيذ التحويل 🔄
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </dialog>
    </>
  );
}
