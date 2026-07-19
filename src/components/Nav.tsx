"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard", emoji: "🏠" },
  { href: "/transactions", label: "Transactions", emoji: "💸" },
  { href: "/accounts", label: "Accounts", emoji: "🏦" },
  { href: "/people", label: "امانة People", emoji: "🤝" },
  { href: "/bnpl", label: "أقساط BNPL", emoji: "📅" },
  { href: "/reports", label: "Reports", emoji: "📊" },
  { href: "/settings", label: "Settings", emoji: "⚙️" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Nav() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="no-print hidden md:flex fixed inset-y-0 left-0 w-56 flex-col bg-emerald-950 text-emerald-50 p-4 gap-1 z-20">
        <div className="text-lg font-bold mb-4 px-2">💰 Balla Finance</div>
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 hover:bg-emerald-900 ${
              isActive(pathname, it.href) ? "bg-emerald-800 font-semibold" : ""
            }`}
          >
            <span>{it.emoji}</span> {it.label}
          </Link>
        ))}
      </aside>
      {/* Mobile bottom bar */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 bg-emerald-950 text-emerald-50 flex justify-around py-1.5 z-20 border-t border-emerald-900">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center px-1.5 py-1 rounded-md text-[10px] ${
              isActive(pathname, it.href) ? "bg-emerald-800" : ""
            }`}
          >
            <span className="text-base leading-none">{it.emoji}</span>
            <span className="mt-0.5">{it.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
