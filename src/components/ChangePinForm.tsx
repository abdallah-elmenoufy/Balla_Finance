"use client";

import { useActionState } from "react";
import { changePin } from "@/app/actions/auth";

export default function ChangePinForm() {
  const [state, formAction, pending] = useActionState(changePin, {});
  return (
    <form action={formAction} className="grid grid-cols-3 gap-2 items-end">
      <div>
        <label className="label">Current PIN</label>
        <input name="current" type="password" inputMode="numeric" className="input" />
      </div>
      <div>
        <label className="label">New PIN</label>
        <input name="pin" type="password" inputMode="numeric" className="input" />
      </div>
      <div>
        <label className="label">Confirm new</label>
        <input name="confirm" type="password" inputMode="numeric" className="input" />
      </div>
      <div className="col-span-3 flex items-center gap-3">
        <button className="btn" disabled={pending}>Change PIN</button>
        {state.error && <span className="text-sm text-stone-600">{state.error}</span>}
      </div>
    </form>
  );
}
