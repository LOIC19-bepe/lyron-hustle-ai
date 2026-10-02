"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/components/app-provider";

const DESKTOP_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/sales", label: "Ventes", icon: "🛒" },
  { href: "/expenses", label: "Dépenses", icon: "💸" },
  { href: "/customers", label: "Clients", icon: "👥" },
  { href: "/reports", label: "Rapports", icon: "📈" },
  { href: "/assistant", label: "Assistant IA", icon: "🤖" },
  { href: "/settings", label: "Paramètres", icon: "⚙️" },
];

const MOBILE_NAV = [
  { href: "/dashboard", label: "Accueil", icon: "🏠" },
  { href: "/sales", label: "Ventes", icon: "🛒" },
  { href: "/customers", label: "Clients", icon: "👥" },
  { href: "/assistant", label: "IA", icon: "🤖" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { business, logout } = useApp();
  const [fabOpen, setFabOpen] = useState(false);

  // `new` gets a unique value so the target page reacts even when the user
  // is already on it (searchParams change re-triggers the open-modal effect).
  const quickActions = [
    { label: "+ Vente", path: "/sales" },
    { label: "+ Dépense", path: "/expenses" },
    { label: "+ Client", path: "/customers" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-base font-bold text-white">
            L
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-slate-900">
              LYRON HUSTLE AI
            </p>
            <p className="truncate text-xs text-slate-600">
              {business.name}
            </p>
            <p className="text-[11px] text-slate-500">{business.currency} · {business.plan}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {DESKTOP_NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <span aria-hidden>🚪</span> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 pb-24 lg:ml-60 lg:pb-8">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
      </main>

      {/* Quick action FAB */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 lg:bottom-8 lg:right-8">
        {fabOpen &&
          quickActions.map((a) => (
            <button
              key={a.path}
              onClick={() => {
                setFabOpen(false);
                router.push(`${a.path}?new=${Date.now()}`);
              }}
              className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {a.label}
            </button>
          ))}
        <button
          onClick={() => setFabOpen((v) => !v)}
          aria-label="Actions rapides"
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-lg transition-transform hover:bg-blue-700 ${fabOpen ? "rotate-45" : ""}`}
        >
          +
        </button>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        {MOBILE_NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-blue-600" : "text-slate-500"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
