import { requireBusiness } from "@/server/auth";
import { getBillingOverview } from "@/server/billing/service";
import { ok, withErrors } from "@/server/http";

export const GET = withErrors(async () => {
  const { business } = await requireBusiness();
  return ok(await getBillingOverview(business));
});
