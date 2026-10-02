export const AI_CREDITS_PER_MESSAGE = 1;

export const PLAN_CATALOG = {
  FREE: {
    name: "FREE",
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyCredits: 100,
    features: [
      "Suivi des ventes et des dépenses",
      "Gestion des clients et des dettes",
      "Dashboard et rapports",
      "100 crédits IA par mois",
    ],
  },
  STARTER: {
    name: "STARTER",
    monthlyPrice: 5_000,
    annualPrice: 60_000,
    monthlyCredits: 1_000,
    features: [
      "Tout le nécessaire pour piloter ton activité",
      "Assistant IA pour analyser tes chiffres",
      "1 000 crédits IA par mois",
    ],
  },
  BUSINESS: {
    name: "BUSINESS",
    monthlyPrice: 10_000,
    annualPrice: 120_000,
    monthlyCredits: 3_000,
    features: [
      "Suivi des ventes, dépenses et clients",
      "Rapports et analyses de performance",
      "3 000 crédits IA par mois",
    ],
  },
  PRO: {
    name: "PRO",
    monthlyPrice: 25_000,
    annualPrice: 300_000,
    monthlyCredits: 10_000,
    features: [
      "Tous les outils de pilotage disponibles",
      "Assistant IA pour un usage intensif",
      "10 000 crédits IA par mois",
    ],
  },
} as const;

export type BillingPlanCode = keyof typeof PLAN_CATALOG;
export type BillingInterval = "monthly" | "annual";

export function getPlanPrice(plan: BillingPlanCode, interval: BillingInterval) {
  const config = PLAN_CATALOG[plan];
  return interval === "annual" ? config.annualPrice : config.monthlyPrice;
}
