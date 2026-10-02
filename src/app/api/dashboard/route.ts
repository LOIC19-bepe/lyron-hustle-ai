import { requireBusiness } from "@/server/auth";
import { ok, withErrors } from "@/server/http";
import { getMetrics, getDailySeries } from "@/server/finance";
import { resolvePeriod } from "@/server/periods";

export const GET = withErrors(async () => {
  const { user, business } = await requireBusiness();
  const tz = business.timezone;

  // Same "30 derniers jours" definition as reports and AI snapshot.
  const p30 = resolvePeriod(tz, "30d");

  const [metrics30, allTime, series] = await Promise.all([
    getMetrics(business.id, p30),
    getMetrics(business.id),
    getDailySeries(business.id, p30.from, p30.to, tz),
  ]);

  return ok({
    userName: user.name,
    businessName: business.name,
    currency: business.currency,
    metrics30,
    allTime,
    series,
  });
});
