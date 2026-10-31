"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "الرئيسية", emoji: "🏠" },
  { href: "/transactions", label: "العمليات", emoji: "💸" },
  { href: "/people", label: "الأمانات والديون", emoji: "🤝" },
  { href: "/accounts", label: "الحسابات والبطاقات", emoji: "🏦" },
  { href: "/bnpl", label: "أقساط BNPL", emoji: "📅" },
  { href: "/reports", label: "التقارير", emoji: "📊" },
  { href: "/settings", label: "الإعدادات", emoji: "⚙️" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Nav() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="no-print hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-emerald-950 text-emerald-50 p-5 gap-1.5 z-20 shadow-lg">
        <div className="mb-5 px-2">
          <div className="text-xl font-black tracking-tight flex items-center gap-2">
            <span>💰</span>
            <span>Balla Finance</span>
          </div>
          <div className="text-xs text-emerald-300/80 mt-0.5">
            إدارة الأموال وسداد الأمانات
          </div>
        </div>
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-xl px-3.5 py-2.5 text-base font-medium flex items-center gap-3 transition-colors ${
              isActive(pathname, it.href)
                ? "bg-emerald-800 text-white font-bold shadow-xs"
                : "text-emerald-100 hover:bg-emerald-900/80 hover:text-white"
            }`}
          >
            <span className="text-lg">{it.emoji}</span>
            <span>{it.label}</span>
          </Link>
        ))}
      </aside>

      {/* Mobile bottom bar */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 bg-emerald-950 text-emerald-50 flex justify-around py-2 z-20 border-t border-emerald-900/80 shadow-2xl">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              isActive(pathname, it.href)
                ? "bg-emerald-800 text-white font-bold"
                : "text-emerald-200/80 hover:text-white"
            }`}
          >
            <span className="text-lg leading-none">{it.emoji}</span>
            <span className="mt-1 text-[11px]">{it.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
