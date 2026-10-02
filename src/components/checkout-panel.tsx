"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { PLAN_CATALOG, getPlanPrice, type BillingInterval, type BillingPlanCode } from "@/lib/billing-plans";
import type { PaymentMethod } from "@/server/payments/service";

const formatAmount = (amount: number) => new Intl.NumberFormat("fr-FR").format(amount);

export function CheckoutPanel({
  planCode,
  interval,
}: {
  planCode: BillingPlanCode;
  interval: BillingInterval;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mtn_mobile_money");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = PLAN_CATALOG[planCode];
  const amount = getPlanPrice(planCode, interval);

  async function continueToPayment() {
    setError(null);
    setSubmitting(true);
    try {
      const { link } = await api.post<{ link: string; txRef: string }>(
        "/api/payments/create",
        {
          planId: planCode,
          interval,
          paymentMethod,
          ...(paymentMethod === "card" ? {} : { phoneNumber }),
        }
      );
      window.location.assign(link);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Le paiement n’a pas pu être initié. Réessaie dans un instant."
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link href="/pricing" className="text-sm font-semibold text-blue-700 hover:underline">← Retour aux forfaits</Link>
        <header className="mt-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Récapitulatif</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Finalise ton choix de forfait.</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">Le paiement est traité sur la page sécurisée Flutterwave. Les données de carte ne transitent pas par LYRON HUSTLE AI.</p>
        </header>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="payment-methods-title">
            <div>
              <h2 id="payment-methods-title" className="text-lg font-bold">Choisissez votre moyen de paiement</h2>
              <p className="mt-1 text-sm text-slate-500">Paiement sécurisé par Flutterwave. Les moyens effectivement proposés dépendent des méthodes activées sur le compte marchand.</p>
            </div>

            {planCode !== "FREE" && <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {([
                { id: "mtn_mobile_money", name: "MTN Mobile Money", detail: "Autorisation sur ton téléphone" },
                { id: "orange_money", name: "Orange Money", detail: "Autorisation sur ton téléphone" },
                { id: "card", name: "Carte bancaire", detail: "Visa · Mastercard" },
              ] satisfies { id: PaymentMethod; name: string; detail: string }[]).map((method) => (
                <label key={method.id} className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === method.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="mt-0.5 h-4 w-4 accent-blue-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{method.name}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">{method.detail}</span>
                  </span>
                </label>
              ))}
            </div>}

            {planCode !== "FREE" && paymentMethod !== "card" && (
              <label className="mt-5 block max-w-sm">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Numéro {paymentMethod === "mtn_mobile_money" ? "MTN Mobile Money" : "Orange Money"}
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  pattern="\+237[0-9]{9}"
                  placeholder="+237XXXXXXXXX"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <span className="mt-1 block text-xs text-slate-500">Format Cameroun : +237 suivi de 9 chiffres.</span>
              </label>
            )}

            {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            {planCode === "FREE" ? (
              <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
                Le plan FREE ne nécessite aucun paiement.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void continueToPayment()}
                disabled={submitting || (paymentMethod !== "card" && !/^\+237\d{9}$/.test(phoneNumber))}
                className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? "Paiement en cours..." : "Continuer vers le paiement"}
              </button>
            )}
            <p className="mt-3 text-center text-xs text-slate-500">La confirmation dépend de la vérification sécurisée Flutterwave.</p>
          </section>

          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Plan choisi</p>
                <h2 className="mt-1 text-xl font-extrabold">{plan.name}</h2>
              </div>
              <Link href="/pricing" className="text-xs font-semibold text-blue-700 hover:underline">Modifier</Link>
            </div>
            <div className="py-5">
              <p className="text-3xl font-extrabold">{formatAmount(amount)} <span className="text-sm font-semibold text-slate-500">FCFA</span></p>
              <p className="mt-1 text-sm text-slate-500">{planCode === "FREE" ? "Sans frais" : interval === "monthly" ? "Facturation mensuelle" : "Facturation annuelle"}</p>
            </div>
            <div className="flex items-center justify-between border-y border-slate-100 py-4 text-sm">
              <span className="text-slate-600">Crédits IA inclus</span>
              <strong>{formatAmount(plan.monthlyCredits)} / mois</strong>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              {plan.features.map((feature) => <li key={feature} className="flex gap-2"><span aria-hidden className="text-blue-600">✓</span>{feature}</li>)}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-slate-500">Les crédits IA sont attribués après confirmation du paiement et renouvelés chaque mois.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
