"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  formatMoney,
  formatDate,
  toDateInputValue,
  currencyStep,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/format";
import type { Sale, Customer } from "@/lib/types";
import { useApp } from "@/components/app-provider";
import {
  Card,
  Button,
  Field,
  Input,
  Select,
  Modal,
  Spinner,
  EmptyState,
  ErrorBanner,
  Badge,
} from "@/components/ui";

type Settlement = "FULL" | "PARTIAL" | "UNPAID";

const SETTLEMENT_LABELS: Record<Settlement, string> = {
  FULL: "Payé intégralement",
  PARTIAL: "Partiellement payé",
  UNPAID: "Impayé",
};

type SaleForm = {
  description: string;
  quantity: string;
  unitPrice: string;
  settlement: Settlement;
  paidAmount: string;
  paymentMethod: Sale["paymentMethod"];
  customerId: string;
  soldAt: string;
};

const emptyForm = (): SaleForm => ({
  description: "",
  quantity: "1",
  unitPrice: "",
  settlement: "FULL", // quick cash sale by default
  paidAmount: "",
  paymentMethod: "CASH",
  customerId: "",
  soldAt: toDateInputValue(new Date()),
});

const statusTone = { PAID: "green", PARTIAL: "amber", UNPAID: "red" } as const;

const settlementFromStatus = (status: Sale["paymentStatus"]): Settlement =>
  status === "PAID" ? "FULL" : status === "PARTIAL" ? "PARTIAL" : "UNPAID";

export default function SalesPage() {
  return (
    <Suspense fallback={<Spinner label="Chargement des ventes…" />}>
      <SalesContent />
    </Suspense>
  );
}

function SalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { business } = useApp();
  const c = business.currency;
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [form, setForm] = useState<SaleForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, cu] = await Promise.all([
        api.get<{ sales: Sale[] }>("/api/sales"),
        api.get<{ customers: Customer[] }>("/api/customers"),
      ]);
      setSales(s.sales);
      setCustomers(cu.customers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  }, []);

  // Quick action (FAB): reacts to ?new=… even when already on this page.
  const newFlag = searchParams.get("new");
  useEffect(() => {
    if (!newFlag) return;
    const timer = setTimeout(openCreate, 0);
    router.replace("/sales", { scroll: false });
    return () => clearTimeout(timer);
  }, [newFlag, openCreate, router]);

  function openEdit(sale: Sale) {
    setEditing(sale);
    setForm({
      description: sale.description,
      quantity: String(sale.quantity),
      unitPrice: String(sale.unitPrice),
      settlement: settlementFromStatus(sale.paymentStatus),
      paidAmount: sale.paymentStatus === "PARTIAL" ? String(sale.paidAmount) : "",
      paymentMethod: sale.paymentMethod,
      customerId: sale.customerId ?? "",
      soldAt: toDateInputValue(sale.soldAt),
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    // The server recomputes total, paidAmount and paymentStatus from the
    // settlement intent — the client never imposes financial values.
    const payload = {
      description: form.description,
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
      settlement: form.settlement,
      paidAmount:
        form.settlement === "PARTIAL" ? Number(form.paidAmount) : undefined,
      paymentMethod: form.paymentMethod,
      customerId: form.customerId || null,
      soldAt: form.soldAt || undefined,
    };
    try {
      if (editing) {
        await api.put(`/api/sales/${editing.id}`, payload);
      } else {
        await api.post("/api/sales", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sale: Sale) {
    if (!confirm(`Supprimer la vente « ${sale.description} » ?`)) return;
    try {
      await api.delete(`/api/sales/${sale.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression.");
    }
  }

  const total = Number(form.quantity || 0) * Number(form.unitPrice || 0);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ventes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enregistre et suis toutes tes ventes.
          </p>
        </div>
        <Button onClick={openCreate}>+ Vente</Button>
      </header>

      {error && <ErrorBanner message={error} />}

      {!sales ? (
        <Spinner label="Chargement des ventes…" />
      ) : sales.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="Aucune vente enregistrée"
          description="Ajoute ta première vente pour commencer à suivre ton chiffre d'affaires."
          action={<Button onClick={openCreate}>Ajouter une vente</Button>}
        />
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <Card key={sale.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {sale.description}
                    </p>
                    <Badge tone={statusTone[sale.paymentStatus]}>
                      {PAYMENT_STATUS_LABELS[sale.paymentStatus]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(sale.soldAt)} · {sale.quantity} ×{" "}
                    {formatMoney(sale.unitPrice, c)} ·{" "}
                    {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                    {sale.customerName ? ` · ${sale.customerName}` : ""}
                  </p>
                  {sale.paymentStatus !== "PAID" && (
                    <p className="mt-1 text-xs font-medium text-amber-600">
                      Reste à payer : {formatMoney(sale.total - sale.paidAmount, c)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-slate-900">
                    {formatMoney(sale.total, c)}
                  </p>
                  <button
                    onClick={() => openEdit(sale)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                    aria-label="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => void handleDelete(sale)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title={editing ? "Modifier la vente" : "Nouvelle vente"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Produit / description">
            <Input
              required
              placeholder="Ex : Sac à main en cuir"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantité">
              <Input
                type="number"
                min={1}
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
            <Field label={`Prix unitaire (${c})`}>
              <Input
                type="number"
                min={0}
                step={currencyStep(c)}
                required
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              />
            </Field>
          </div>
          <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
            Total : {formatMoney(total, c)}
          </p>
          <Field label="Paiement">
            <Select
              value={form.settlement}
              onChange={(e) =>
                setForm({ ...form, settlement: e.target.value as Settlement })
              }
            >
              {(Object.keys(SETTLEMENT_LABELS) as Settlement[]).map((s) => (
                <option key={s} value={s}>
                  {SETTLEMENT_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          {form.settlement === "PARTIAL" && (
            <Field
              label={`Montant payé (${c})`}
              hint={
                total > 0 && form.paidAmount
                  ? `Reste à payer : ${formatMoney(Math.max(total - Number(form.paidAmount), 0), c)}`
                  : undefined
              }
            >
              <Input
                type="number"
                min={0}
                step={currencyStep(c)}
                required
                placeholder="0"
                value={form.paidAmount}
                onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
              />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Méthode de paiement">
              <Select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({
                    ...form,
                    paymentMethod: e.target.value as Sale["paymentMethod"],
                  })
                }
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.soldAt}
                onChange={(e) => setForm({ ...form, soldAt: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Client (facultatif)">
            <Select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            >
              <option value="">— Aucun —</option>
              {customers.map((cu) => (
                <option key={cu.id} value={cu.id}>
                  {cu.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
