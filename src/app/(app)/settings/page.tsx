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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          الإعدادات والنسخ الاحتياطي (Settings)
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          إدارة العملات، التصنيفات، حماية التطبيق برقم السري، وتنزيل نسخة احتياطية لأمان بياناتك
        </p>
      </div>

      {/* Backup Card */}
      <div className="card p-6 border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💾</span>
          <h2 className="text-lg font-bold text-stone-900">النسخ الاحتياطي للبيانات (Backup)</h2>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">
          جميع بياناتك المالية، الحسابات، الديون، وسجل المعاملات محفوظة محلياً بالكامل على جهازك في ملف واحد (<code>data/balla.db</code>).
          قم بتنزيل نسخة احتياطية بانتظام واحتفظ بها على Google Drive أو iCloud لضمان عدم ضياع أي سجل.
        </p>
        <div className="pt-1">
          <a href="/api/backup" className="btn text-sm py-2.5 px-5">
            ⬇️ تنزيل نسخة احتياطية من قاعدة البيانات
          </a>
        </div>
      </div>

      {/* Currencies Management */}
      <div className="card p-6 border-stone-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>💱</span>
            <span>العملات المعتمدة (Currencies)</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            يمكنك إضافة أي عملة عربية أو أجنبية لتتبع حساباتك أو ديونك بها
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {currencies.map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-sm font-semibold"
            >
              <b>{c.code}</b> ({c.name}) {c.symbol}
              <ConfirmButton
                action={deleteCurrency.bind(null, c.code)}
                label="✕"
                message={`حذف العملة ${c.code}؟ (يعمل فقط إذا لم تكن مستخدمة في أي حساب أو حركة)`}
                className="text-stone-400 hover:text-red-600 cursor-pointer text-xs p-0.5"
              />
            </span>
          ))}
        </div>

        <form action={addCurrency} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end pt-2 border-t border-stone-100 text-sm">
          <div>
            <label className="label">رمز العملة (الكود)</label>
            <input name="code" maxLength={3} required className="input text-sm uppercase font-bold" placeholder="KWD" />
          </div>
          <div>
            <label className="label">اسم العملة</label>
            <input name="name" required className="input text-sm" placeholder="دينار كويتي" />
          </div>
          <div>
            <label className="label">الرمز المختصر</label>
            <input name="symbol" className="input text-sm" placeholder="د.ك" />
          </div>
          <button className="btn text-sm py-2.5">إضافة العملة</button>
        </form>
      </div>

      {/* Categories Management */}
      <div className="card p-6 border-stone-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>🏷</span>
            <span>تصنيفات المصروفات والدخل (Categories)</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {(["expense", "income"] as const).map((kind) => (
            <div key={kind} className="space-y-2">
              <div className="text-sm font-bold text-stone-700">
                {kind === "expense" ? "🛒 تصنيفات المصروفات" : "💰 تصنيفات الدخل"}
              </div>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-medium"
                      dir="auto"
                    >
                      <span>{c.emoji}</span>
                      <span>{c.name}</span>
                      <ConfirmButton
                        action={deleteCategory.bind(null, c.id)}
                        label="✕"
                        message={`حذف تصنيف "${c.name}"؟`}
                        className="text-stone-400 hover:text-red-600 cursor-pointer text-xs p-0.5 mr-1"
                      />
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <form action={createCategory} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end pt-3 border-t border-stone-100 text-sm">
          <div>
            <label className="label">الأيقونة (Emoji)</label>
            <input name="emoji" className="input text-sm text-center" placeholder="🎁" />
          </div>
          <div>
            <label className="label">اسم التصنيف</label>
            <input name="name" dir="auto" required className="input text-sm" placeholder="هدايا / إلكترونيات..." />
          </div>
          <div>
            <label className="label">النوع</label>
            <select name="kind" className="input text-sm font-medium">
              <option value="expense">مصروف (Expense)</option>
              <option value="income">دخل (Income)</option>
            </select>
          </div>
          <button className="btn text-sm py-2.5">إضافة التصنيف</button>
        </form>
      </div>

      {/* Archived Records */}
      {(archivedAccounts.length > 0 || archivedPeople.length > 0) && (
        <div className="card p-6 border-stone-200 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>🗄</span>
            <span>الأرشيف (الحسابات والأشخاص المخفيون)</span>
          </h2>
          <p className="text-xs text-stone-500">انقر على أي عنصر لإلغاء أرشفته واستعادته للشاشة الرئيسية</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {archivedAccounts.map((a) => (
              <form key={`a${a.id}`} action={unarchiveAccount.bind(null, a.id)}>
                <button className="btn-secondary text-xs py-1.5 px-3 rounded-lg" dir="auto">
                  استعادة ♻️ {a.emoji ?? "💼"} {a.name}
                </button>
              </form>
            ))}
            {archivedPeople.map((p) => (
              <form key={`p${p.id}`} action={unarchivePerson.bind(null, p.id)}>
                <button className="btn-secondary text-xs py-1.5 px-3 rounded-lg" dir="auto">
                  استعادة ♻️ 🤝 {p.name}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* Security & Password */}
      <div className="card p-6 border-stone-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>🔒</span>
            <span>الأمان وحماية التطبيق</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">تغيير الرقم السري لحماية بياناتك من المتصلين على نفس شبكة الواي فاي</p>
        </div>
        <ChangePinForm />
        <div className="pt-3 border-t border-stone-100 flex justify-end">
          <form action={logout}>
            <button className="btn-danger text-sm py-2 px-4">🚪 تسجيل الخروج وقفل التطبيق</button>
          </form>
        </div>
      </div>
    </div>
  );
}
