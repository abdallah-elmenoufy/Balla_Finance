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
        className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl"
      >
        <div className="text-3xl mb-2 text-center">💰</div>
        <h1 className="text-xl font-bold text-center">{title}</h1>
        <p className="text-sm text-stone-500 text-center mb-6">{subtitle}</p>
        <label className="label">PIN</label>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoFocus
          className="input mb-3 text-center text-lg tracking-widest"
        />
        {confirmField && (
          <>
            <label className="label">Confirm PIN</label>
            <input
              name="confirm"
              type="password"
              inputMode="numeric"
              className="input mb-3 text-center text-lg tracking-widest"
            />
          </>
        )}
        {state.error && (
          <p className="text-sm text-red-600 text-center mb-3">{state.error}</p>
        )}
        <button className="btn w-full" disabled={pending}>
          {pending ? "..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
