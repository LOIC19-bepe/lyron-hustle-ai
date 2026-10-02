import { requireBusiness } from "@/server/auth";
import { ok, withErrors } from "@/server/http";
import {
  getMetrics,
  getDailySeries,
  getCustomerStats,
  getExpensesByCategory,
} from "@/server/finance";
import { resolvePeriod } from "@/server/periods";

export const GET = withErrors(async (request: Request) => {
  const { business } = await requireBusiness();
  const tz = business.timezone;
  const searchParams = new URL(request.url).searchParams;

  // Single period definition for the whole product (src/server/periods.ts),
  // computed in the business timezone.
  const { from, to, label } = resolvePeriod(
    tz,
    searchParams.get("period") ?? "30d",
    searchParams.get("from"),
    searchParams.get("to")
  );
  const period = { from, to };

  const [metrics, series, customerStats, categories] = await Promise.all([
    getMetrics(business.id, period),
    getDailySeries(business.id, from, to, tz),
    getCustomerStats(business.id, period),
    getExpensesByCategory(business.id, period),
  ]);

  return ok({
    label,
    from: from.toISOString(),
    to: to.toISOString(),
    currency: business.currency,
    metrics,
    series,
    topCustomers: customerStats.filter((c) => c.salesCount > 0).slice(0, 10),
    expenseCategories: categories,
  });
});
