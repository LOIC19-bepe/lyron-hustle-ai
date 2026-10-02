"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AuthCard } from "@/components/auth-card";
import { Button, Field, Input, Select, ErrorBanner } from "@/components/ui";

const COUNTRIES = [
  { code: "CM", name: "Cameroun", currency: "XAF", timezone: "Africa/Douala" },
  { code: "SN", name: "Sénégal", currency: "XOF", timezone: "Africa/Dakar" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF", timezone: "Africa/Abidjan" },
  { code: "NG", name: "Nigéria", currency: "NGN", timezone: "Africa/Lagos" },
  { code: "GH", name: "Ghana", currency: "GHS", timezone: "Africa/Accra" },
  { code: "KE", name: "Kenya", currency: "KES", timezone: "Africa/Nairobi" },
  { code: "MA", name: "Maroc", currency: "MAD", timezone: "Africa/Casablanca" },
  { code: "ZA", name: "Afrique du Sud", currency: "ZAR", timezone: "Africa/Johannesburg" },
  { code: "FR", name: "France", currency: "EUR", timezone: "Europe/Paris" },
  { code: "GB", name: "Royaume-Uni", currency: "GBP", timezone: "Europe/London" },
  { code: "US", name: "États-Unis", currency: "USD", timezone: "America/New_York" },
  { code: "CA", name: "Canada", currency: "CAD", timezone: "America/Toronto" },
];

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

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    country: "CM",
    currency: "XAF",
    timezone: "Africa/Douala",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleCountryChange(code: string) {
    const match = COUNTRIES.find((c) => c.code === code);
    setForm((f) => ({
      ...f,
      country: code,
      currency: match?.currency ?? f.currency,
      timezone: match?.timezone ?? f.timezone,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/business", form);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Configure ton entreprise 🏪"
      subtitle="Une dernière étape avant ton tableau de bord."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Nom de l'entreprise">
          <Input
            required
            placeholder="Ex : Boutique Chez Aïcha"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Pays">
          <Select
            value={form.country}
            onChange={(e) => handleCountryChange(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Devise" hint="Tous tes montants seront affichés dans cette devise.">
          <Select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Fuseau horaire"
          hint="Tes journées, rapports et périodes seront calculés dans ce fuseau."
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Création…" : "Créer mon entreprise"}
        </Button>
      </form>
    </AuthCard>
  );
}
