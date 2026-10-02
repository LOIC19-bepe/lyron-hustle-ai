"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  formatMoney,
  formatDate,
  PAYMENT_STATUS_LABELS,
} from "@/lib/format";
import type { Customer, Sale } from "@/lib/types";
import { useApp } from "@/components/app-provider";
import {
  Card,
  StatCard,
  Button,
  Spinner,
  EmptyState,
  ErrorBanner,
  Badge,
} from "@/components/ui";

type Detail = {
  customer: Customer;
  history: Sale[];
  stats: {
    totalPurchased: number;
    totalPaid: number;
    debt: number;
    salesCount: number;
  };
};

const statusTone = { PAID: "green", PARTIAL: "amber", UNPAID: "red" } as const;

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { business } = useApp();
  const c = business.currency;
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Detail>(`/api/customers/${id}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur de chargement.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!data) return;
    if (
      !confirm(
        `Supprimer ${data.customer.name} ? Ses ventes seront conservées sans client associé.`
      )
    )
      return;
    try {
      await api.delete(`/api/customers/${id}`);
      router.push("/customers");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de suppression.");
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner label="Chargement du client…" />;

  const { customer, history, stats } = data;

  return (
    <div className="space-y-5">
      <Link
        href="/customers"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        ← Retour aux clients
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
            <p className="text-sm text-slate-500">
              {[customer.phone, customer.email].filter(Boolean).join(" · ") ||
                "Aucun contact renseigné"}
            </p>
          </div>
        </div>
        <Button variant="danger" onClick={() => void handleDelete()}>
          Supprimer
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total acheté"
          value={formatMoney(stats.totalPurchased, c)}
          icon="🛍️"
          tone="blue"
          sub={`${stats.salesCount} achat${stats.salesCount > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Total payé"
          value={formatMoney(stats.totalPaid, c)}
          icon="✅"
          tone="green"
        />
        <StatCard
          label="Dette"
          value={formatMoney(stats.debt, c)}
          icon="⏳"
          tone={stats.debt > 0 ? "amber" : "green"}
        />
        <StatCard
          label="Client depuis"
          value={formatDate(customer.createdAt)}
          icon="📅"
          tone="blue"
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Historique des achats
        </h2>
        {history.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="Aucun achat"
            description="Les ventes associées à ce client apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {history.map((sale) => (
              <Card key={sale.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {sale.description}
                      </p>
                      <Badge tone={statusTone[sale.paymentStatus]}>
                        {PAYMENT_STATUS_LABELS[sale.paymentStatus]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(sale.soldAt)} · payé{" "}
                      {formatMoney(sale.paidAmount, c)}
                    </p>
                  </div>
                  <p className="font-bold text-slate-900">
                    {formatMoney(sale.total, c)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
