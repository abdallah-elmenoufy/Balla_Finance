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
    minor == null ? "" : String(Math.abs(minor) / 10 ** dec(code));
  const cur = initial?.currency ?? "EGP";
  const isCreditCard = type === "credit_card";
  const isBnpl = type === "bnpl";
  const isReceivable = type === "receivable";

  const selectedTypeObj = ACCOUNT_TYPES.find((t) => t.value === type);

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base" dir="auto">
      {/* Name and Emoji */}
      <div>
        <label className="label">اسم الحساب / البطاقة</label>
        <input
          name="name"
          required
          dir="auto"
          defaultValue={initial?.name ?? ""}
          className="input text-base font-semibold"
          placeholder="فودافون كاش / CIB / بنك مصر / فيزا مشتريات..."
        />
        <span className="helper-text">الاسم الذي يظهر لك في المعاملات اليومية</span>
      </div>

      <div>
        <label className="label">الأيقونة (Emoji)</label>
        <input
          name="emoji"
          defaultValue={initial?.emoji ?? selectedTypeObj?.emoji ?? "💳"}
          className="input text-lg text-center font-emoji"
          placeholder="💳"
        />
        <span className="helper-text">رمز تعبيري لتمييز الحساب سريعاً</span>
      </div>

      {/* Account Type with Description Box */}
      <div className="col-span-1 sm:col-span-2 space-y-2">
        <label className="label">نوع الحساب (تصنيف المعاملة)</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="input text-base font-semibold"
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.emoji} {t.label}
            </option>
          ))}
        </select>
        {selectedTypeObj && (
          <div className="rounded-xl bg-stone-50 border border-stone-200/90 p-3 text-sm text-stone-600 flex items-start gap-2">
            <span className="text-lg">{selectedTypeObj.emoji}</span>
            <span>{selectedTypeObj.description}</span>
          </div>
        )}
      </div>

      {/* Currency */}
      <div>
        <label className="label">العملة</label>
        <select name="currency" defaultValue={cur} className="input text-base font-medium">
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name} ({c.symbol})
            </option>
          ))}
        </select>
      </div>

      {/* Credit Card Educational Explanation Box */}
      {isCreditCard && (
        <div className="col-span-1 sm:col-span-2 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950 space-y-2">
          <div className="font-bold flex items-center gap-2 text-base text-amber-900">
            <span>💡</span>
            <span>توضيح مصطلحات البطاقات الائتمانية (لكي لا يحدث أي التباس):</span>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-amber-900/90 list-disc list-inside leading-relaxed">
            <li>
              <b>المديونية الحالية (Current Owed):</b> هي المبلغ الفعلي الذي استلفته من الكارت وصرفته، والمطلوب سداده منك للبنك حالياً.
            </li>
            <li>
              <b>الحد الائتماني الكلي (Credit Limit):</b> هو أقصى سقف يسمح لك البنك باستدانته (مثلاً: 50,000 ج.م). هذا ليس مالك، بل حد السلفة.
            </li>
            <li>
              <b>يوم استحقاق السداد (Due Day):</b> هو اليوم من الشهر الذي يجب السداد قبله لتفادي الفوائد التراكمية وغرامة التأخير (مثلاً: يوم 25).
            </li>
            <li>
              <b>يوم كشف الحساب (Statement Cutoff):</b> هو اليوم الذي تصدر فيه فاتورة الشهر (مثلاً: يوم 5).
            </li>
          </ul>
        </div>
      )}

      {/* BNPL Explanation Box */}
      {isBnpl && (
        <div className="col-span-1 sm:col-span-2 rounded-2xl bg-purple-50 border border-purple-200 p-4 text-sm text-purple-950 space-y-2">
          <div className="font-bold flex items-center gap-2 text-base text-purple-900">
            <span>🧾</span>
            <span>توضيح حسابات التقسيط (BNPL - فاليو، سهولة، كونتكت، أمان):</span>
          </div>
          <p className="text-xs sm:text-sm text-purple-900/90 leading-relaxed">
            هذا الحساب يمثل وسيلة أو جهة التقسيط الخاصة بك. لكل عملية شراء تقوم بها، ستنشئ لها خطة تقسيط مستقلة بمشتريات محددة وجدول استحقاق شهري، لمتابعة سداد كل قسط في موعده من حسابك البنكي أو محفظتك وتجنب أي تأخير.
          </p>
        </div>
      )}

      {/* Receivables Explanation Box */}
      {isReceivable && (
        <div className="col-span-1 sm:col-span-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-950 space-y-2">
          <div className="font-bold flex items-center gap-2 text-base text-emerald-900">
            <span>🤝</span>
            <span>تتبع الأموال المستحقة لك بالخارج (فلوس ليا برة):</span>
          </div>
          <p className="text-xs sm:text-sm text-emerald-900/90 leading-relaxed">
            استخدم هذا الحساب لتتبع الأموال التي سلفتها للآخرين أو مستحقة لك في ذمتهم. كل مبلغ يتم تحصيله منهم يُسجل كإيداع في حسابك الفعلي (البنك أو الكاش أو المحفظة) ويُخصم من رصيد الأموال المستحقة لك.
          </p>
        </div>
      )}

      {/* Balance / Owed input */}
      <div>
        <label className="label">
          {isCreditCard
            ? "المديونية الحالية المطلوب سدادها للبنك"
            : isBnpl
              ? "رصيد أقساط قائمة مسبقاً (اختياري)"
              : isReceivable
                ? "إجمالي المبالغ المستحقة لك بالخارج حالياً"
                : "الرصيد النقدي المتوفر حالياً"}
        </label>
        <input
          name="opening_balance"
          inputMode="decimal"
          defaultValue={initial ? major(initial.opening_balance, cur) : ""}
          className="input text-lg font-bold font-mono"
          placeholder="0.00"
        />
        <span className="helper-text">
          {isCreditCard
            ? "اكتب المبلغ بالموجب عادي (مثلاً: 12000)، والتطبيق سيسجلها كمديونية عليك تلقائياً"
            : isBnpl
              ? "اتركه 0 إذا كنت ستنشئ خطط الأقساط بالتفصيل من صفحة التقسيط (BNPL)"
              : isReceivable
                ? "أموال لك في ذمة الآخرين تنتظر تحصيلها منهم"
                : "النقود التي بحوزتك وتملكها فعلياً في هذا الحساب اليوم"}
        </span>
      </div>

      {/* Extra Credit Card Fields */}
      {isCreditCard && (
        <>
          <div>
            <label className="label">الحد الائتماني الكلي للبطاقة (Credit Limit)</label>
            <input
              name="credit_limit"
              inputMode="decimal"
              defaultValue={major(initial?.credit_limit, cur)}
              className="input text-lg font-bold font-mono"
              placeholder="50000"
            />
            <span className="helper-text">أقصى مبلغ مسموح لك باستخدامه في هذه البطاقة</span>
          </div>

          <div>
            <label className="label">يوم استحقاق السداد شهرياً (Due Day)</label>
            <input
              name="due_day"
              type="number"
              min={1}
              max={31}
              defaultValue={initial?.due_day ?? ""}
              className="input text-base font-bold"
              placeholder="25"
            />
            <span className="helper-text">اليوم من الشهر الواجب السداد قبله لتجنب الغرامات والفوائد</span>
          </div>

          <div>
            <label className="label">يوم صدور كشف الحساب (Statement Day) - اختياري</label>
            <input
              name="statement_day"
              type="number"
              min={1}
              max={31}
              defaultValue={initial?.statement_day ?? ""}
              className="input text-base font-bold"
              placeholder="5"
            />
            <span className="helper-text">اليوم من الشهر الذي يقفل فيه البنك الفاتورة الشهرية</span>
          </div>
        </>
      )}

      {/* Submit Button */}
      <div className="col-span-1 sm:col-span-2 pt-2">
        <button className="btn w-full py-3 text-lg font-bold">{submitLabel}</button>
      </div>
    </form>
  );
}
