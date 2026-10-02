import {
  getMetrics,
  getDailySeries,
  getCustomerStats,
  getExpensesByCategory,
} from "@/server/finance";
import { resolvePeriod, previousSevenDays } from "@/server/periods";
import type { Business } from "@/db/schema";
import type { BusinessSnapshot } from "@/server/ai/types";

/**
 * Builds the snapshot of backend-computed figures for the AI layer.
 * Periods use the SAME definitions as the dashboard and the reports
 * (src/server/periods.ts), in the business timezone.
 */
export async function buildSnapshot(
  business: Business
): Promise<BusinessSnapshot> {
  const tz = business.timezone;
  const pToday = resolvePeriod(tz, "today");
  const p7 = resolvePeriod(tz, "7d");
  const pPrev7 = previousSevenDays(tz);
  const p30 = resolvePeriod(tz, "30d");

  const [
    today,
    last7Days,
    previous7Days,
    last30Days,
    allTime,
    dailySeries30,
    customerStats,
    expenseCategories,
  ] = await Promise.all([
    getMetrics(business.id, pToday),
    getMetrics(business.id, p7),
    getMetrics(business.id, pPrev7),
    getMetrics(business.id, p30),
    getMetrics(business.id),
    getDailySeries(business.id, p30.from, p30.to, tz),
    getCustomerStats(business.id),
    getExpensesByCategory(business.id),
  ]);

  return {
    businessName: business.name,
    currency: business.currency,
    today,
    last7Days,
    previous7Days,
    last30Days,
    allTime,
    dailySeries30,
    topCustomers: customerStats.slice(0, 5),
    debtors: customerStats
      .filter((c) => c.debt > 0)
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 5),
    expenseCategories: expenseCategories.slice(0, 6),
  };
}
