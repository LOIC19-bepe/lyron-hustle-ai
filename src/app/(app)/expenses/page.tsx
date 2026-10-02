"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  formatMoney,
  formatDate,
  toDateInputValue,
  currencyStep,
} from "@/lib/format";
import type { Expense } from "@/lib/types";
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
} from "@/components/ui";

const CATEGORIES = [
  "Stock / Marchandises",
  "Loyer",
  "Transport",
  "Électricité & Eau",
  "Internet & Téléphone",
  "Salaires",
  "Marketing",
  "Équipement",
  "Autre",
];

type ExpenseForm = {
  category: string;
  amount: string;
  description: string;
  spentAt: string;
};

const emptyForm = (): ExpenseForm => ({
  category: CATEGORIES[0],
  amount: "",
  description: "",
  spentAt: toDateInputValue(new Date()),
});

export default function ExpensesPage() {
  return (
    <Suspense fallback={<Spinner label="Chargement des dépenses…" />}>
      <ExpensesContent />
    </Suspense>
  );
}

function ExpensesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { business } = useApp();
  const c = business.currency;
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ expenses: Expense[] }>("/api/expenses");
      setExpenses(data.expenses);
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
    router.replace("/expenses", { scroll: false });
    return () => clearTimeout(timer);
  }, [newFlag, openCreate, router]);

  function openEdit(expense: Expense) {
    setEditing(expense);
    setForm({
      category: expense.category,
      amount: String(expense.amount),
      description: expense.description,
      spentAt: toDateInputValue(expense.spentAt),
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    // Date is sent as a plain YYYY-MM-DD string; the server anchors it in
    // the business timezone (no UTC midnight day-shift).
    const payload = {
      category: form.category,
      amount: Number(form.amount),
      description: form.description,
      spentAt: form.spentAt || undefined,
    };
    try {
      if (editing) {
        await api.put(`/api/expenses/${editing.id}`, payload);
      } else {
        await api.post("/api/expenses", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense: Expense) {
    if (!confirm(`Supprimer cette dépense (${expense.category}) ?`)) return;
    try {
      await api.delete(`/api/expenses/${expense.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression.");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dépenses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Garde un œil sur où part ton argent.
          </p>
        </div>
        <Button onClick={openCreate}>+ Dépense</Button>
      </header>

      {error && <ErrorBanner message={error} />}

      {!expenses ? (
        <Spinner label="Chargement des dépenses…" />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon="💸"
          title="Aucune dépense enregistrée"
          description="Ajoute tes dépenses pour calculer ton vrai bénéfice."
          action={<Button onClick={openCreate}>Ajouter une dépense</Button>}
        />
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Card key={expense.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {expense.category}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(expense.spentAt)}
                    {expense.description ? ` · ${expense.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-red-600">
                    −{formatMoney(expense.amount, c)}
                  </p>
                  <button
                    onClick={() => openEdit(expense)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                    aria-label="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => void handleDelete(expense)}
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
        title={editing ? "Modifier la dépense" : "Nouvelle dépense"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Catégorie">
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Montant (${c})`}>
              <Input
                type="number"
                min={0}
                step={currencyStep(c)}
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.spentAt}
                onChange={(e) => setForm({ ...form, spentAt: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Description (facultatif)">
            <Input
              placeholder="Ex : Achat de stock chez le fournisseur"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
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
