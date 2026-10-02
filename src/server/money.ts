import { ApiError } from "@/server/http";
import type { Sale, Expense } from "@/db/schema";

/**
 * Money strategy (audit P1):
 * - PostgreSQL stores exact `numeric(14,2)` values (unchanged, no migration —
 *   scale 2 is a storage CAPACITY; 0-decimal currencies simply never use it).
 * - Drizzle maps them as strings (no float round-trip).
 * - ALL server-side arithmetic happens in integer minor units ("cents").
 * - Numbers are only produced at the API boundary, for display.
 * - Each currency has its own exponent: XAF/XOF = 0 decimals, EUR/USD/GBP/
 *   NGN/GHS/KES = 2. Inputs with more precision than the business currency
 *   allows are rejected (e.g. 150.50 XAF → 400).
 */

/** Minor-unit exponent per supported currency (ISO 4217). */
const CURRENCY_DECIMALS: Record<string, number> = {
  XAF: 0,
  XOF: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  NGN: 2,
  GHS: 2,
  KES: 2,
  ZAR: 2,
  MAD: 2,
  CAD: 2,
};

export function currencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency] ?? 2;
}

/** Max value representable by numeric(14,2), in cents. */
export const MAX_CENTS = 99_999_999_999_999;

/**
 * Converts a user-supplied decimal amount to integer cents (validated).
 * When `currency` is provided, rejects precision the currency doesn't allow.
 */
export function toCents(value: number, currency?: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError(400, "Montant invalide.");
  }
  if (currency !== undefined) {
    // Precision check BEFORE any rounding (19.999 EUR must be rejected,
    // not silently rounded to 20.00). Tolerance scales with magnitude to
    // absorb IEEE-754 noise on legitimate inputs like 19.99.
    const decimals = currencyDecimals(currency);
    const scaled = value * 10 ** decimals;
    const tolerance = Math.max(1e-6, Math.abs(scaled) * Number.EPSILON * 8);
    if (Math.abs(scaled - Math.round(scaled)) > tolerance) {
      throw new ApiError(
        400,
        decimals === 0
          ? `La devise ${currency} n'accepte pas de décimales.`
          : `La devise ${currency} accepte au maximum ${decimals} décimales.`
      );
    }
  }
  const cents = Math.round(value * 100);
  if (cents > MAX_CENTS) {
    throw new ApiError(400, "Montant trop élevé.");
  }
  return cents;
}

/** Parses a PostgreSQL numeric string (e.g. "12345.67") into exact cents. */
export function centsFromDb(value: string | null | undefined): number {
  if (value == null) return 0;
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  const [intPart, fracPart = ""] = raw.split(".");
  const frac = (fracPart + "00").slice(0, 2);
  const cents = Number(intPart) * 100 + Number(frac);
  return negative ? -cents : cents;
}

/** Serializes integer cents to an exact decimal string for numeric(14,2). */
export function centsToDb(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Display conversion at the API boundary only. */
export function centsToNumber(cents: number): number {
  return cents / 100;
}

/** API serializer: Sale row (DB strings) → JSON numbers for the frontend. */
export function serializeSale(sale: Sale) {
  return {
    ...sale,
    unitPrice: centsToNumber(centsFromDb(sale.unitPrice)),
    total: centsToNumber(centsFromDb(sale.total)),
    paidAmount: centsToNumber(centsFromDb(sale.paidAmount)),
  };
}

/** API serializer: Expense row (DB string) → JSON number for the frontend. */
export function serializeExpense(expense: Expense) {
  return {
    ...expense,
    amount: centsToNumber(centsFromDb(expense.amount)),
  };
}
