import { z } from "zod";
import { isValidTimezone } from "@/server/periods";
import { PLAN_CATALOG, type BillingPlanCode } from "@/lib/billing-plans";

export const SUPPORTED_CURRENCIES = [
  "XAF",
  "XOF",
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "MAD",
  "CAD",
] as const;

/** Upper bound aligned with numeric(14,2). */
const MAX_AMOUNT = 999_999_999_999;
const MAX_QUANTITY = 1_000_000;

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court"),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const businessSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  country: z.string().trim().min(2, "Pays requis").max(56),
  currency: z.enum(SUPPORTED_CURRENCIES),
  timezone: z
    .string()
    .trim()
    .refine(isValidTimezone, "Fuseau horaire invalide")
    .default("Africa/Douala"),
  logoUrl: z
    .string()
    .trim()
    .url("URL invalide")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  phone: z
    .string()
    .trim()
    .max(32)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  email: z
    .string()
    .trim()
    .email("Email invalide")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

/**
 * Sale input. The client expresses the settlement intent; the server is the
 * only authority for total, paidAmount and paymentStatus:
 * - FULL    → paidAmount = total  (default: quick cash sale)
 * - PARTIAL → paidAmount = provided value (required, ≤ total)
 * - UNPAID  → paidAmount = 0
 */
export const saleSchema = z
  .object({
    description: z.string().trim().min(1, "Description requise").max(500),
    quantity: z.coerce
      .number()
      .int()
      .positive("Quantité invalide")
      .max(MAX_QUANTITY, "Quantité trop élevée"),
    unitPrice: z.coerce
      .number()
      .nonnegative("Prix invalide")
      .max(MAX_AMOUNT, "Prix trop élevé"),
    settlement: z.enum(["FULL", "PARTIAL", "UNPAID"]).default("FULL"),
    paidAmount: z.coerce
      .number()
      .nonnegative("Montant payé invalide")
      .max(MAX_AMOUNT, "Montant trop élevé")
      .optional(),
    paymentMethod: z.enum([
      "CASH",
      "MOBILE_MONEY",
      "BANK_TRANSFER",
      "CARD",
      "OTHER",
    ]),
    customerId: z
      .string()
      .uuid()
      .nullable()
      .optional()
      .or(z.literal("").transform(() => null)),
    soldAt: dateOnly.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.settlement === "PARTIAL" && data.paidAmount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidAmount"],
        message: "Montant payé requis pour un paiement partiel",
      });
    }
  });

export const expenseSchema = z.object({
  category: z.string().trim().min(1, "Catégorie requise").max(100),
  amount: z.coerce
    .number()
    .positive("Montant invalide")
    .max(MAX_AMOUNT, "Montant trop élevé"),
  description: z.string().trim().max(500).default(""),
  spentAt: dateOnly.optional(),
});

/** Status is always derived server-side from integer cents. */
export function derivePaymentStatus(totalCents: number, paidCents: number) {
  if (paidCents >= totalCents) return "PAID" as const;
  if (paidCents > 0) return "PARTIAL" as const;
  return "UNPAID" as const;
}

export const chatSchema = z.object({
  message: z.string().trim().min(1, "Message requis").max(1000),
});

export const paymentCreateSchema = z
  .object({
    planId: z.enum(Object.keys(PLAN_CATALOG) as [BillingPlanCode, ...BillingPlanCode[]]),
    interval: z.enum(["monthly", "annual"]).default("monthly"),
    paymentMethod: z.enum(["mtn_mobile_money", "orange_money", "card"]),
    phoneNumber: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === "card") return;
    if (!data.phoneNumber || !/^\+237\d{9}$/.test(data.phoneNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "Saisis un numéro camerounais au format +237XXXXXXXXX.",
      });
    }
  });

export const paymentVerifySchema = z.object({
  txRef: z.string().trim().min(10).max(100),
  transactionId: z.coerce.number().int().positive().transform(String),
});
