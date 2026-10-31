"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AccountWithBalance,
  Category,
  CreditCardStatus,
  Currency,
  Person,
  PersonDebtSummary,
} from "@/lib/types";
import { fmtMoney, todayISO } from "@/lib/money";
import { createTxn } from "@/app/actions/transactions";

export interface QuickPayTarget {
  type: "person" | "card";
  id: number;
  name: string;
  amount?: number;
}

export default function QuickActionToolbar({
  accounts,
  people,
  personDebts,
  creditCards,
  categories,
  currencies,
  externalTrigger,
}: {
  accounts: AccountWithBalance[];
  people: Person[];
  personDebts: PersonDebtSummary[];
  creditCards: CreditCardStatus[];
  categories: Category[];
  currencies: Currency[];
  externalTrigger?: QuickPayTarget | null;
}) {
  const [modalType, setModalType] = useState<
    "debt" | "card" | "expense" | "income" | "transfer" | null
  >(null);

  // Form states
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedFromAccountId, setSelectedFromAccountId] = useState<string>("");
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");

  const dialogRef = useRef<HTMLDialogElement>(null);

  const fundingAccounts = accounts.filter((a) => a.type !== "credit_card" && a.type !== "bnpl");

  // Handle external trigger (e.g. clicking "سداد دفعة" on a person card or "سداد البطاقة" on a credit card)
  useEffect(() => {
    if (externalTrigger) {
      if (externalTrigger.type === "person") {
        setSelectedPersonId(String(externalTrigger.id));
        if (externalTrigger.amount) {
          setAmountInput(String(externalTrigger.amount / 100));
        }
        openModal("debt");
      } else if (externalTrigger.type === "card") {
        setSelectedCardId(String(externalTrigger.id));
        if (externalTrigger.amount) {
          setAmountInput(String(externalTrigger.amount / 100));
        }
        openModal("card");
      }
    }
  }, [externalTrigger]);

  function openModal(type: "debt" | "card" | "expense" | "income" | "transfer") {
    setModalType(type);
    if (!selectedFromAccountId && fundingAccounts.length > 0) {
      setSelectedFromAccountId(String(fundingAccounts[0].id));
    }
    if (type === "debt" && !selectedPersonId && people.length > 0) {
      const firstWithDebt = personDebts.find((p) => p.remaining > 0);
      setSelectedPersonId(String(firstWithDebt ? firstWithDebt.person_id : people[0].id));
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
  }

  // Active target calculations
  const targetPerson = personDebts.find((p) => String(p.person_id) === selectedPersonId);
  const targetCard = creditCards.find((c) => String(c.id) === selectedCardId);
  const selectedFromAcc = accounts.find((a) => String(a.id) === selectedFromAccountId);

  return (
    <>
      {/* Quick Action Toolbar Buttons */}
      <div className="card p-3 sm:p-4 bg-white border-stone-200">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            ⚡ عمليات سريعة بنقرة واحدة (Quick Actions)
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => openModal("debt")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 text-emerald-900 font-bold text-xs sm:text-sm hover:bg-emerald-100 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-base sm:text-lg">🤝</span>
            <span>سداد دين أمانة</span>
          </button>

          <button
            onClick={() => openModal("card")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-amber-300 bg-amber-50/70 text-amber-900 font-bold text-xs sm:text-sm hover:bg-amber-100 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-base sm:text-lg">💳</span>
            <span>سداد بطاقة</span>
          </button>

          <button
            onClick={() => openModal("expense")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-red-200 bg-red-50/50 text-red-900 font-semibold text-xs sm:text-sm hover:bg-red-100 hover:border-red-300 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-base sm:text-lg">🛒</span>
            <span>مصروف سريع</span>
          </button>

          <button
            onClick={() => openModal("income")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 font-semibold text-xs sm:text-sm hover:bg-stone-100 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-base sm:text-lg">💰</span>
            <span>دخل جديد</span>
          </button>

          <button
            onClick={() => openModal("transfer")}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 font-semibold text-xs sm:text-sm hover:bg-stone-100 transition-all cursor-pointer shadow-2xs"
          >
            <span className="text-base sm:text-lg">🔄</span>
            <span>تحويل رصيد</span>
          </button>
        </div>
      </div>

      {/* Accessible Native <dialog> Modal */}
      <dialog
        ref={dialogRef}
        onCancel={closeModal}
        className="backdrop:bg-stone-900/60 backdrop:backdrop-blur-xs rounded-2xl p-0 border border-stone-200 shadow-2xl w-full max-w-lg m-auto"
      >
        <div className="p-5 space-y-4 bg-white" dir="auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              {modalType === "debt" && <span>🤝 سداد دفعة من دين أمانة</span>}
              {modalType === "card" && <span>💳 سداد مستحقات بطاقة ائتمانية</span>}
              {modalType === "expense" && <span>🛒 تسجيل مصروف جديد</span>}
              {modalType === "income" && <span>💰 إضافة دخل جديد</span>}
              {modalType === "transfer" && <span>🔄 تحويل بين حساباتي</span>}
            </h3>
            <button
              onClick={closeModal}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-lg text-lg cursor-pointer"
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
              <div className="space-y-3">
                <input type="hidden" name="type" value="person_out" />

                <div>
                  <label className="label">الشخص المستحق للدين (صاحب الأمانة)</label>
                  <select
                    name="person_id"
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    className="input font-medium"
                    required
                  >
                    {people.map((p) => {
                      const d = personDebts.find((x) => x.person_id === p.id);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name}{" "}
                          {d && d.remaining > 0
                            ? `(متبقي له: ${fmtMoney(d.remaining, d.currency)})`
                            : "(خالص)"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {targetPerson && (
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-900 flex justify-between items-center">
                    <span>
                      المتبقي لسداد هذا الدين: <b>{fmtMoney(targetPerson.remaining, targetPerson.currency)}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(targetPerson.remaining / 100))}
                      className="text-emerald-700 underline font-bold cursor-pointer"
                    >
                      سداد الكل
                    </button>
                  </div>
                )}

                <div>
                  <label className="label">سداد من حساب (الحساب الذي يخرج منه المال)</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => setSelectedFromAccountId(e.target.value)}
                    className="input font-medium"
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
                  <label className="label">المبلغ المسدد ({targetPerson?.currency ?? "EGP"})</label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="input text-lg font-bold"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                  {/* Quick Amount Chips */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {[500, 1000, 2000, 5000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmountInput(String(v))}
                        className="text-xs bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg border border-stone-200 text-stone-700 cursor-pointer"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">ملاحظات / وصف السداد</label>
                  <input
                    name="description"
                    className="input"
                    defaultValue={`سداد دفعة أمانة — ${targetPerson?.name ?? ""}`}
                  />
                </div>

                <div className="pt-2">
                  <button className="btn w-full py-2.5 text-base bg-emerald-700 hover:bg-emerald-800">
                    تأكيد السداد والخصم من الدين 🤝
                  </button>
                </div>
              </div>
            )}

            {/* 2. PAY CREDIT CARD MODAL */}
            {modalType === "card" && (
              <div className="space-y-3">
                <input type="hidden" name="type" value="transfer" />

                <div>
                  <label className="label">البطاقة الائتمانية المطلوب سدادها</label>
                  <select
                    name="to_account_id"
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="input font-medium"
                    required
                  >
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji ?? "💳"} {c.name} — المستحق: {fmtMoney(c.owed_amount, c.currency)}{" "}
                        (يوم {c.due_day})
                      </option>
                    ))}
                  </select>
                </div>

                {targetCard && (
                  <div className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 flex justify-between items-center">
                    <span>
                      إجمالي المديونية المستحقة: <b>{fmtMoney(targetCard.owed_amount, targetCard.currency)}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(targetCard.owed_amount / 100))}
                      className="text-amber-800 underline font-bold cursor-pointer"
                    >
                      سداد المديونية كاملة
                    </button>
                  </div>
                )}

                <div>
                  <label className="label">سداد من حساب (الحساب المخصوم منه)</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => setSelectedFromAccountId(e.target.value)}
                    className="input font-medium"
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
                    className="input text-lg font-bold"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {[500, 1000, 2000, 5000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmountInput(String(v))}
                        className="text-xs bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg border border-stone-200 text-stone-700 cursor-pointer"
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
                    className="input"
                    defaultValue={`سداد بطاقة ${targetCard?.name ?? ""}`}
                  />
                </div>

                <div className="pt-2">
                  <button className="btn w-full py-2.5 text-base bg-amber-600 hover:bg-amber-700 text-white">
                    تأكيد سداد البطاقة وتفادي الغرامات 💳
                  </button>
                </div>
              </div>
            )}

            {/* 3. QUICK EXPENSE MODAL */}
            {modalType === "expense" && (
              <div className="space-y-3">
                <input type="hidden" name="type" value="expense" />

                <div>
                  <label className="label">خصم من حساب</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => setSelectedFromAccountId(e.target.value)}
                    className="input font-medium"
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
                  <label className="label">المبلغ</label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="input text-lg font-bold"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">التصنيف</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {categories
                      .filter((c) => c.kind === "expense")
                      .slice(0, 8)
                      .map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setSelectedCategoryId(String(c.id))}
                          className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
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
                  <button className="btn w-full py-2.5 text-base bg-red-600 hover:bg-red-700">
                    حفظ المصروف 🛒
                  </button>
                </div>
              </div>
            )}

            {/* 4. QUICK INCOME MODAL */}
            {modalType === "income" && (
              <div className="space-y-3">
                <input type="hidden" name="type" value="income" />

                <div>
                  <label className="label">إيداع في حساب</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => setSelectedFromAccountId(e.target.value)}
                    className="input font-medium"
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
                    className="input text-lg font-bold"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">مصدر الدخل</label>
                  <select name="category_id" className="input">
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
                  <button className="btn w-full py-2.5 text-base bg-emerald-700 hover:bg-emerald-800">
                    إضافة الدخل 💰
                  </button>
                </div>
              </div>
            )}

            {/* 5. QUICK TRANSFER MODAL */}
            {modalType === "transfer" && (
              <div className="space-y-3">
                <input type="hidden" name="type" value="transfer" />

                <div>
                  <label className="label">من حساب</label>
                  <select
                    name="account_id"
                    value={selectedFromAccountId}
                    onChange={(e) => setSelectedFromAccountId(e.target.value)}
                    className="input font-medium"
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
                    className="input font-medium"
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
                    className="input text-lg font-bold"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>

                <div className="pt-2">
                  <button className="btn w-full py-2.5 text-base bg-stone-800 hover:bg-stone-900">
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
