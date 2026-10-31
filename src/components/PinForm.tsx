"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";

export default function PinForm({
  action,
  title,
  subtitle,
  confirmField,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  title: string;
  subtitle: string;
  confirmField?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-950 px-4">
      <form
        action={formAction}
        className="bg-white rounded-3xl p-8 sm:p-10 w-full max-w-sm shadow-2xl space-y-4"
        dir="auto"
      >
        <div className="text-4xl text-center">💰</div>
        <div>
          <h1 className="text-2xl font-black text-center text-stone-900">{title}</h1>
          <p className="text-sm text-stone-500 text-center mt-1">{subtitle}</p>
        </div>
        <div>
          <label className="label text-center">أدخل الرمز السري (PIN)</label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoFocus
            className="input text-center text-2xl tracking-widest font-mono font-bold"
            placeholder="••••"
          />
        </div>
        {confirmField && (
          <div>
            <label className="label text-center">تأكيد الرمز السري</label>
            <input
              name="confirm"
              type="password"
              inputMode="numeric"
              className="input text-center text-2xl tracking-widest font-mono font-bold"
              placeholder="••••"
            />
          </div>
        )}
        {state.error && (
          <p className="text-sm font-bold text-red-600 text-center bg-red-50 p-2 rounded-xl border border-red-100">
            {state.error}
          </p>
        )}
        <div className="pt-2">
          <button className="btn w-full py-3 text-lg font-bold" disabled={pending}>
            {pending ? "جاري التحقق..." : "دخول ومتابعة"}
          </button>
        </div>
      </form>
    </div>
  );
}
