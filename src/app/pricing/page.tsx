"use client";

import Link from "next/link";
import { useState } from "react";
import { PLAN_CATALOG, getPlanPrice, type BillingInterval, type BillingPlanCode } from "@/lib/billing-plans";

const PLAN_ORDER: BillingPlanCode[] = ["FREE", "STARTER", "BUSINESS", "PRO"];
const formatAmount = (amount: number) => new Intl.NumberFormat("fr-FR").format(amount);

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">L</span>
            LYRON HUSTLE AI
          </Link>
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-700">Se connecter</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Des offres claires, sans surprise</p>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Des outils adaptés à chaque étape de ton business.</h1>
          <p className="mt-4 text-base text-slate-600">Choisis ton rythme de facturation. Tous les forfaits affichent leurs crédits IA mensuels inclus.</p>
          <div className="mt-7 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Période de facturation">
            {(["monthly", "annual"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={interval === choice}
                onClick={() => setInterval(choice)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${interval === choice ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {choice === "monthly" ? "Mensuel" : "Annuel"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((planCode) => {
            const plan = PLAN_CATALOG[planCode];
            const price = getPlanPrice(planCode, interval);
            return (
              <article key={planCode} className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${planCode === "BUSINESS" ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{plan.name}</p>
                    <p className="mt-3 text-3xl font-extrabold text-slate-950">{formatAmount(price)} <span className="text-sm font-semibold text-slate-500">FCFA</span></p>
                    <p className="mt-1 text-xs text-slate-500">{planCode === "FREE" ? "Sans frais" : interval === "monthly" ? "par mois" : "par an"}</p>
                    {interval === "annual" && planCode !== "FREE" && (
                      <p className="mt-1 text-xs text-slate-500">Équivalent à {formatAmount(plan.monthlyPrice)} FCFA / mois</p>
                    )}
                  </div>
                  <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">IA</span>
                </div>

                <div className="my-5 rounded-lg bg-slate-50 p-3">
                  <p className="text-2xl font-bold text-slate-900">{formatAmount(plan.monthlyCredits)}</p>
                  <p className="text-xs text-slate-500">crédits IA / mois</p>
                </div>

                <ul className="flex-1 space-y-3 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden className="font-bold text-blue-600">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/checkout?plan=${planCode}&interval=${interval}`}
                  className={`mt-6 block rounded-lg px-4 py-3 text-center text-sm font-semibold ${planCode === "BUSINESS" ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                >
                  Choisir ce plan
                </Link>
              </article>
            );
          })}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-slate-500">Les moyens de paiement proposés peuvent dépendre des méthodes activées sur le compte marchand Flutterwave.</p>
      </section>
    </main>
  );
}
