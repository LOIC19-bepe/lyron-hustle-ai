"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type ResultState = "checking" | "pending" | "successful" | "failed" | "error";

export function CheckoutResult({
  txRef,
  transactionId,
}: {
  txRef: string;
  transactionId: string;
}) {
  const [state, setState] = useState<ResultState>("checking");
  const [planName, setPlanName] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!txRef || !transactionId) {
      setState("failed");
      return () => {
        cancelled = true;
      };
    }

    setState("checking");
    api
      .post<{ status: string; planId?: string }>("/api/payments/verify", {
        txRef,
        transactionId,
      })
      .then((result) => {
        if (cancelled) return;
        setPlanName(result.planId ?? "");
        if (result.status === "successful") setState("successful");
        else if (result.status === "pending") setState("pending");
        else setState("failed");
      })
      .catch(() => !cancelled && setState("error"));

    return () => {
      cancelled = true;
    };
  }, [attempt, transactionId, txRef]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-9">
        {state === "checking" && (
          <>
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
            <h1 className="mt-5 text-2xl font-bold">Paiement en cours...</h1>
            <p className="mt-2 text-sm text-slate-600">Nous vérifions la transaction auprès de Flutterwave.</p>
          </>
        )}
        {state === "successful" && (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700">✓</span>
            <h1 className="mt-5 text-2xl font-bold">Paiement confirmé 🎉</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Ton abonnement LYRON HUSTLE AI est maintenant actif{planName ? ` (${planName})` : ""}.</p>
            <Link href="/dashboard" className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Aller au dashboard</Link>
          </>
        )}
        {state === "pending" && (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-xl text-amber-700">…</span>
            <h1 className="mt-5 text-2xl font-bold">Paiement en cours...</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Autorise le paiement sur ton téléphone si nécessaire. Nous n&apos;activerons l&apos;abonnement qu&apos;après confirmation Flutterwave.</p>
            <button type="button" onClick={() => setAttempt((current) => current + 1)} className="mt-6 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Vérifier à nouveau</button>
          </>
        )}
        {(state === "failed" || state === "error") && (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-700">!</span>
            <h1 className="mt-5 text-2xl font-bold">Le paiement n&apos;a pas pu être confirmé.</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Aucun abonnement ni crédit n&apos;a été activé. Tu peux réessayer ou contacter le support si un montant a été prélevé.</p>
            {txRef && transactionId && <button type="button" onClick={() => setAttempt((current) => current + 1)} className="mt-5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Vérifier à nouveau</button>}
            <div><Link href="/pricing" className="mt-5 inline-block text-sm font-semibold text-blue-700 hover:underline">Retour aux forfaits</Link></div>
          </>
        )}
      </section>
    </main>
  );
}
