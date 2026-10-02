const ZERO_DECIMAL = new Set(["XAF", "XOF"]);

/** Input step matching the currency's smallest unit (XAF/XOF: whole units). */
export function currencyStep(currency: string): string {
  return ZERO_DECIMAL.has(currency) ? "1" : "0.01";
}

/** Formats an amount with the business currency — never hardcoded. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString("fr-FR")} ${currency}`;
  }
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function toDateInputValue(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement",
  CARD: "Carte",
  OTHER: "Autre",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Payé",
  PARTIAL: "Partiel",
  UNPAID: "Impayé",
};
