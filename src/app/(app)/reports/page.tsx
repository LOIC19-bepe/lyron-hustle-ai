"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney, toDateInputValue } from "@/lib/format";
import type { Metrics, SeriesPoint } from "@/lib/types";
import { useApp } from "@/components/app-provider";
import {
  Card,
  StatCard,
  Button,
  Input,
  Spinner,
  ErrorBanner,
  EmptyState,
} from "@/components/ui";
import { PerformanceChart } from "@/components/performance-chart";

type Report = {
  label: string;
  metrics: Metrics;
  series: SeriesPoint[];
  topCustomers: {
    customerId: string;
    name: string;
    totalPurchased: number;
    debt: number;
    salesCount: number;
  }[];
  expenseCategories: { category: string; amount: number }[];
};

const PERIODS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "custom", label: "Personnalisé" },
] as const;

export default function ReportsPage() {
  const { business } = useApp();
  const c = business.currency;
  const [period, setPeriod] = useState<string>("30d");
  const [customFrom, setCustomFrom] = useState(
    toDateInputValue(new Date(Date.now() - 29 * 86400000))
  );
  const [customTo, setCustomTo] = useState(toDateInputValue(new Date()));
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params =
        period === "custom"
          ? `period=custom&from=${customFrom}&to=${customTo}`
          : `period=${period}`;
      const data = await api.get<Report>(`/api/reports?${params}`);
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    if (period !== "custom") void load();
  }, [period, load]);

  const m = report?.metrics;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Rapports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Analyse tes performances sur la période de ton choix.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              period === p.key
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Du</span>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Au</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </label>
          <Button onClick={() => void load()}>Appliquer</Button>
        </Card>
      )}

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner label="Génération du rapport…" />
      ) : report && m ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Chiffre d'affaires" value={formatMoney(m.revenue, c)} icon="🛒" tone="blue" sub={`${m.salesCount} ventes`} />
            <StatCard label="Dépenses" value={formatMoney(m.expensesTotal, c)} icon="💸" tone="red" />
            <StatCard label="Bénéfice" value={formatMoney(m.profit, c)} icon="💰" tone={m.profit >= 0 ? "green" : "red"} />
            <StatCard label="À recevoir" value={formatMoney(m.unpaid, c)} icon="⏳" tone="amber" />
          </div>

          {report.series.length > 1 && (
            <Card className="p-4 sm:p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                Évolution — {report.label}
              </h2>
              <PerformanceChart data={report.series} currency={c} />
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                🏆 Meilleurs clients
              </h2>
              {report.topCustomers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucune vente associée à un client sur cette période.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {report.topCustomers.map((tc, i) => (
                    <li key={tc.customerId} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-slate-700">
                        {i + 1}. {tc.name}
                        <span className="ml-1 text-xs text-slate-400">
                          ({tc.salesCount} achats)
                        </span>
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatMoney(tc.totalPurchased, c)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                📂 Dépenses par catégorie
              </h2>
              {report.expenseCategories.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucune dépense sur cette période.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {report.expenseCategories.map((cat) => {
                    const pct =
                      m.expensesTotal > 0
                        ? (cat.amount / m.expensesTotal) * 100
                        : 0;
                    return (
                      <li key={cat.category} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-700">{cat.category}</span>
                          <span className="font-semibold text-slate-900">
                            {formatMoney(cat.amount, c)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-red-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          icon="📈"
          title="Aucune donnée"
          description="Choisis une période et applique le filtre."
        />
      )}
    </div>
  );
}
