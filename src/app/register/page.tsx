"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AuthCard } from "@/components/auth-card";
import { Button, Field, Input, ErrorBanner } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/register", form);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription.");
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Créer ton compte"
      subtitle="Gratuit. Sans carte bancaire."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Nom complet">
          <Input
            required
            placeholder="Ex : Aïcha Ngono"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            placeholder="toi@exemple.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum">
          <Input
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Création…" : "Commencer gratuitement"}
        </Button>
      </form>
    </AuthCard>
  );
}
