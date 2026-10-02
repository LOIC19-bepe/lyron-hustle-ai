"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/components/app-provider";
import {
  Card,
  Button,
  Field,
  Input,
  Select,
  ErrorBanner,
} from "@/components/ui";

const CURRENCIES = ["XAF", "XOF", "USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR", "MAD", "CAD"];

const TIMEZONES = [
  "Africa/Douala",
  "Africa/Dakar",
  "Africa/Abidjan",
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Casablanca",
  "Africa/Johannesburg",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Toronto",
  "America/Los_Angeles",
];

export default function SettingsPage() {
  const { user, business, refresh, logout } = useApp();
  const [form, setForm] = useState({
    name: business.name,
    country: business.country,
    currency: business.currency,
    timezone: business.timezone,
    logoUrl: business.logoUrl ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.put("/api/business", {
        ...form,
        logoUrl: form.logoUrl || null,
      });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connecté en tant que <strong>{user.email}</strong>
        </p>
      </header>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Mon entreprise
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          {saved && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Modifications enregistrées ✅
            </div>
          )}
          <Field label="Nom de l'entreprise">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pays (code)">
              <Input
                required
                maxLength={2}
                value={form.country}
                onChange={(e) =>
                  setForm({ ...form, country: e.target.value.toUpperCase() })
                }
              />
            </Field>
            <Field label="Devise">
              <Select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Fuseau horaire"
            hint="Périodes, rapports et journées sont calculés dans ce fuseau."
          >
            <Select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Logo (URL, facultatif)">
            <Input
              type="url"
              placeholder="https://…"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            />
          </Field>
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </Card>

      <div id="subscription">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Mon abonnement — plan actuel :{" "}
          <span className="text-blue-600">{business.plan}</span>
        </h2>
        <p className="mt-3 text-xs text-slate-400">
          Consulte ton solde de crédits et les échéances depuis le dashboard.
        </p>
        <Link href="/pricing" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Comparer les forfaits
        </Link>
      </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Session</h2>
        <Button variant="danger" onClick={() => void logout()}>
          Se déconnecter
        </Button>
      </Card>
    </div>
  );
}
