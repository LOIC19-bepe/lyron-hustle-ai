"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { useApp } from "@/components/app-provider";
import {
  Card,
  Button,
  Field,
  Input,
  Modal,
  Spinner,
  EmptyState,
  ErrorBanner,
  Badge,
} from "@/components/ui";

type CustomerForm = { name: string; phone: string; email: string };
const emptyForm = (): CustomerForm => ({ name: "", phone: "", email: "" });

export default function CustomersPage() {
  return (
    <Suspense fallback={<Spinner label="Chargement des clients…" />}>
      <CustomersContent />
    </Suspense>
  );
}

function CustomersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { business } = useApp();
  const c = business.currency;
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      const data = await api.get<{ customers: Customer[] }>(
        q ? `/api/customers?q=${encodeURIComponent(q)}` : "/api/customers"
      );
      setCustomers(data.customers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(query.trim() || undefined), 300);
    return () => clearTimeout(t);
  }, [query, load]);

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
    router.replace("/customers", { scroll: false });
    return () => clearTimeout(timer);
  }, [newFlag, openCreate, router]);

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
    };
    try {
      if (editing) {
        await api.put(`/api/customers/${editing.id}`, payload);
      } else {
        await api.post("/api/customers", payload);
      }
      setModalOpen(false);
      await load(query.trim() || undefined);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Suis tes clients, leurs achats et leurs dettes.
          </p>
        </div>
        <Button onClick={openCreate}>+ Client</Button>
      </header>

      <Input
        type="search"
        placeholder="🔍 Rechercher un client…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Rechercher un client"
      />

      {error && <ErrorBanner message={error} />}

      {!customers ? (
        <Spinner label="Chargement des clients…" />
      ) : customers.length === 0 ? (
        <EmptyState
          icon="👥"
          title={query ? "Aucun résultat" : "Aucun client enregistré"}
          description={
            query
              ? "Essaie une autre recherche."
              : "Ajoute tes clients pour suivre leurs achats et leurs dettes."
          }
          action={!query ? <Button onClick={openCreate}>Ajouter un client</Button> : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/customers/${customer.id}`}>
              <Card className="h-full p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {customer.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {customer.phone ?? customer.email ?? "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openEdit(customer);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                    aria-label="Modifier"
                  >
                    ✏️
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone="blue">
                    Acheté : {formatMoney(customer.totalPurchased ?? 0, c)}
                  </Badge>
                  {(customer.debt ?? 0) > 0 ? (
                    <Badge tone="red">
                      Doit : {formatMoney(customer.debt ?? 0, c)}
                    </Badge>
                  ) : (
                    <Badge tone="green">À jour</Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        title={editing ? "Modifier le client" : "Nouveau client"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Nom">
            <Input
              required
              placeholder="Ex : Jean Mbarga"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Téléphone (facultatif)">
            <Input
              type="tel"
              placeholder="+237 6XX XX XX XX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email (facultatif)">
            <Input
              type="email"
              placeholder="client@exemple.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
