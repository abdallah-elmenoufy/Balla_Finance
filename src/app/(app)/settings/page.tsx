import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCategories, getCurrencies } from "@/lib/queries";
import type { Account, Person } from "@/lib/types";
import { addCurrency, deleteCurrency } from "@/app/actions/settings";
import { createCategory, deleteCategory } from "@/app/actions/categories";
import { unarchiveAccount } from "@/app/actions/accounts";
import { unarchivePerson } from "@/app/actions/people";
import { logout } from "@/app/actions/auth";
import ChangePinForm from "@/components/ChangePinForm";
import ConfirmButton from "@/components/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAuth();
  const currencies = getCurrencies();
  const categories = getCategories();
  const archivedAccounts = db()
    .prepare("SELECT * FROM accounts WHERE archived=1 ORDER BY name")
    .all() as Account[];
  const archivedPeople = db()
    .prepare("SELECT * FROM people WHERE archived=1 ORDER BY name")
    .all() as Person[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings الإعدادات</h1>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">💾 Backup النسخ الاحتياطي</h2>
        <p className="text-sm text-stone-600 mb-3">
          All your data lives in one file (<code>data/balla.db</code>). Download a copy
          regularly and keep it somewhere safe (iCloud, Google Drive…).
        </p>
        <a href="/api/backup" className="btn">⬇️ Download backup</a>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">💱 Currencies العملات</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {currencies.map((c) => (
            <span key={c.code} className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-sm">
              <b>{c.code}</b> {c.symbol}
              <ConfirmButton
                action={deleteCurrency.bind(null, c.code)}
                label="✕"
                message={`Remove ${c.code}? (Only works if unused)`}
                className="text-stone-400 hover:text-red-600 cursor-pointer text-xs"
              />
            </span>
          ))}
        </div>
        <form action={addCurrency} className="grid grid-cols-4 gap-2 items-end">
          <div>
            <label className="label">Code</label>
            <input name="code" maxLength={3} required className="input" placeholder="KWD" />
          </div>
          <div>
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Kuwaiti Dinar" />
          </div>
          <div>
            <label className="label">Symbol</label>
            <input name="symbol" className="input" placeholder="د.ك" />
          </div>
          <button className="btn">Add</button>
        </form>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">🏷 Categories التصنيفات</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {(["expense", "income"] as const).map((kind) => (
            <div key={kind}>
              <div className="text-xs font-medium text-stone-500 mb-1.5">
                {kind === "expense" ? "Expenses مصروفات" : "Income دخل"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-sm" dir="auto">
                      {c.emoji} {c.name}
                      <ConfirmButton
                        action={deleteCategory.bind(null, c.id)}
                        label="✕"
                        message={`Delete category "${c.name}"? Transactions keep their data but lose this label.`}
                        className="text-stone-400 hover:text-red-600 cursor-pointer text-xs"
                      />
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <form action={createCategory} className="mt-3 grid grid-cols-4 gap-2 items-end">
          <div>
            <label className="label">Emoji</label>
            <input name="emoji" className="input" placeholder="🎁" />
          </div>
          <div>
            <label className="label">Name</label>
            <input name="name" dir="auto" required className="input" placeholder="هدايا" />
          </div>
          <div>
            <label className="label">Kind</label>
            <select name="kind" className="input">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <button className="btn">Add</button>
        </form>
      </div>

      {(archivedAccounts.length > 0 || archivedPeople.length > 0) && (
        <div className="card p-4">
          <h2 className="font-semibold mb-2">🗄 Archived المؤرشف</h2>
          <div className="flex flex-wrap gap-2">
            {archivedAccounts.map((a) => (
              <form key={`a${a.id}`} action={unarchiveAccount.bind(null, a.id)}>
                <button className="btn-secondary text-xs" dir="auto">
                  ♻️ {a.emoji ?? "💼"} {a.name}
                </button>
              </form>
            ))}
            {archivedPeople.map((p) => (
              <form key={`p${p.id}`} action={unarchivePerson.bind(null, p.id)}>
                <button className="btn-secondary text-xs" dir="auto">♻️ 🤝 {p.name}</button>
              </form>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-2">Click to restore.</p>
        </div>
      )}

      <div className="card p-4">
        <h2 className="font-semibold mb-3">🔒 Security</h2>
        <ChangePinForm />
        <form action={logout} className="mt-4">
          <button className="btn-danger">🚪 Log out</button>
        </form>
      </div>
    </div>
  );
}
