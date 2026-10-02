"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { BillingOverview, Metrics, SeriesPoint } from "@/lib/types";
import { useApp } from "@/components/app-provider";
import { Card, StatCard, Spinner, ErrorBanner, Button } from "@/components/ui";
import { PerformanceChart } from "@/components/performance-chart";
import { BillingSummary } from "@/components/billing-summary";

type DashboardData = {
  userName: string;
  currency: string;
  metrics30: Metrics;
  allTime: Metrics;
  series: SeriesPoint[];
};

export default function DashboardPage() {
  const { user, business } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Fast load for metrics, then AI insight separately.
    api
      .get<DashboardData>("/api/dashboard")
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Erreur"));

    api
      .post<{ reply: string }>("/api/ai/chat", {
        message: "Donne-moi une analyse courte des principales tendances de mon business.",
      })
      .then((r) => !cancelled && setInsight(r.reply))
      .catch(() => !cancelled && setInsight(null))
      .finally(() => !cancelled && setInsightLoading(false));

    api
      .get<BillingOverview>("/api/billing/overview")
      .then((overview) => !cancelled && setBilling(overview))
      .catch((e) => !cancelled && setBillingError(e instanceof Error ? e.message : "Indisponible"));

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner label="Calcul de tes chiffres…" />;

  const m = data.metrics30;
  const c = business.currency;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bonjour {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Voici la situation de <strong>{business.name}</strong> sur les 30
            derniers jours.
          </p>
        </div>
        <Link href="/reports">
          <Button variant="secondary">Voir les rapports</Button>
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Chiffre d’affaires"
          value={formatMoney(m.revenue, c)}
          icon="🛒"
          tone="blue"
          sub={`${m.salesCount} vente${m.salesCount > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Dépenses"
          value={formatMoney(m.expensesTotal, c)}
          icon="💸"
          tone="red"
        />
        <StatCard
          label="Bénéfice"
          value={formatMoney(m.profit, c)}
          icon="💰"
          tone={m.profit >= 0 ? "green" : "red"}
        />
        <StatCard
          label="À recevoir"
          value={formatMoney(data.allTime.unpaid, c)}
          icon="⏳"
          tone="amber"
          sub={`${data.allTime.customersCount} client${data.allTime.customersCount > 1 ? "s" : ""}`}
        />
      </div>

      {billing ? (
        <BillingSummary billing={billing} />
      ) : (
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Mon abonnement</h2>
          <p className="mt-2 text-sm text-slate-500">
            {billingError ?? "Chargement du plan et des crédits…"}
          </p>
          <Link href="/pricing" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">
            Voir les forfaits →
          </Link>
        </Card>
      )}

      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Évolution des performances — 30 jours
        </h2>
        <PerformanceChart data={data.series} currency={c} />
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          🤖 Analyse de ton activité
        </h2>
        <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
          {insightLoading ? (
            <p className="animate-pulse text-slate-400">
              Analyse de tes données en cours…
            </p>
          ) : insight ? (
            <p className="whitespace-pre-line">{insight.replace(/\*\*/g, "")}</p>
          ) : (
            <p className="text-slate-500">
              L&apos;analyse n&apos;est pas disponible pour le moment.
            </p>
          )}
        </div>
        <Link
          href="/assistant"
          className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline"
        >
          Poser une question à l&apos;assistant →
        </Link>
      </Card>
    </div>
  );
}
