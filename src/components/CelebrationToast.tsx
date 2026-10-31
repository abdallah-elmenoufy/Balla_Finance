"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { REPAYMENT_CELEBRATION_MESSAGES } from "@/lib/motivation";
import { fmtMoney } from "@/lib/money";

export default function CelebrationToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [amountStr, setAmountStr] = useState<string | null>(null);

  const celebrate = searchParams.get("celebrate");
  const amount = searchParams.get("amount");

  useEffect(() => {
    if (celebrate) {
      if (celebrate === "debt_repaid") {
        const rand =
          REPAYMENT_CELEBRATION_MESSAGES[
            Math.floor(Math.random() * REPAYMENT_CELEBRATION_MESSAGES.length)
          ];
        setMessage(rand);
      } else if (celebrate === "card_paid") {
        setMessage("تم سداد البطاقة بنجاح! تجنبت الفوائد وغرامات التأخير، استمر في الانضباط 💳✨");
      }
      if (amount) {
        setAmountStr(fmtMoney(Number(amount), "EGP"));
      }
      setVisible(true);

      const timer = setTimeout(() => {
        handleDismiss();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [celebrate, amount]);

  function handleDismiss() {
    setVisible(false);
    // Remove query params cleanly without reload
    const params = new URLSearchParams(searchParams.toString());
    params.delete("celebrate");
    params.delete("amount");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  if (!visible) return null;

  return (
    <div className="fixed top-5 inset-x-4 max-w-lg mx-auto z-50 animate-bounce-short">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 rounded-2xl shadow-xl border border-emerald-600 flex items-start justify-between gap-3">
        <div className="text-3xl animate-pulse">🎉</div>
        <div className="flex-1" dir="auto">
          <div className="font-bold text-base flex items-center gap-2">
            <span>سداد ناجح ومبارك!</span>
            {amountStr && (
              <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded-full font-mono">
                {amountStr}
              </span>
            )}
          </div>
          <p className="text-sm text-emerald-100 mt-1 leading-relaxed">{message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-emerald-300 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
