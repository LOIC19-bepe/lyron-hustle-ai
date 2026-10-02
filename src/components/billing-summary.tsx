import Link from "next/link";
import type { BillingOverview } from "@/lib/types";
import { Badge, Card } from "@/components/ui";

const PLAN_LABELS: Record<BillingOverview["subscription"]["plan"], string> = {
  FREE: "FREE",
  STARTER: "STARTER",
  BUSINESS: "BUSINESS",
  PRO: "PRO",
};

const STATUS_LABELS: Record<BillingOverview["subscription"]["status"], string> = {
  active: "Actif",
  pending: "En attente",
  cancelled: "Annulé",
  expired: "Expiré",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Africa/Douala",
  }).format(new Date(value));
}

export function BillingSummary({ billing }: { billing: BillingOverview }) {
  const usagePercent = billing.credits.monthlyAllowance > 0
    ? Math.min(100, (billing.credits.usedThisPeriod / billing.credits.monthlyAllowance) * 100)
    : 0;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Espace LYRON</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Mon abonnement</h2>
        </div>
        <Badge tone={billing.subscription.status === "active" ? "green" : "amber"}>
          {STATUS_LABELS[billing.subscription.status]}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Plan actuel</p>
          <p className="mt-1 font-bold text-slate-900">{PLAN_LABELS[billing.subscription.plan]}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Crédits disponibles</p>
          <p className="mt-1 font-bold text-slate-900">{billing.credits.balance.toLocaleString("fr-FR")} <span className="text-xs font-medium text-slate-500">/ {billing.credits.monthlyAllowance.toLocaleString("fr-FR")}</span></p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Prochaine échéance</p>
          <p className="mt-1 font-bold text-slate-900">{billing.subscription.renewalAt ? formatDate(billing.subscription.renewalAt) : "Aucune échéance"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Crédits utilisés</p>
          <p className="mt-1 font-bold text-slate-900">{billing.credits.usedThisPeriod.toLocaleString("fr-FR")} <span className="text-xs font-medium text-slate-500">ce mois</span></p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Crédits IA utilisés" aria-valuemin={0} aria-valuemax={billing.credits.monthlyAllowance} aria-valuenow={billing.credits.usedThisPeriod}>
        <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${usagePercent}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">Renouvellement des crédits : {formatDate(billing.credits.renewalAt)}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Historique des crédits</h3>
          {billing.recentTransactions.length ? (
            <ul className="mt-2 divide-y divide-slate-100">
              {billing.recentTransactions.map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <span className="min-w-0 truncate text-slate-600">{transaction.description}</span>
                  <span className={`shrink-0 font-semibold ${transaction.delta < 0 ? "text-slate-700" : "text-emerald-700"}`}>
                    {transaction.delta > 0 ? "+" : ""}{transaction.delta.toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Aucun mouvement enregistré.</p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Historique des paiements</h3>
          {billing.recentPayments.length ? (
            <ul className="mt-2 divide-y divide-slate-100">
              {billing.recentPayments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <span className="text-slate-600">{formatDate(payment.createdAt)} · {payment.method}</span>
                  <span className="font-semibold text-slate-800">{Number(payment.amount).toLocaleString("fr-FR")} {payment.currency}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Aucun paiement enregistré.</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Link href="/pricing" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Changer de plan</Link>
        <Link href="/settings#subscription" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Gérer mon abonnement</Link>
      </div>
    </Card>
  );
}
