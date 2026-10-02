import { requireBusiness } from "@/server/auth";
import { ok, withErrors } from "@/server/http";
import { paymentCreateSchema } from "@/server/validation";
import { createPlanPayment } from "@/server/payments/service";
import { enforceRateLimit } from "@/server/rateLimit";

export const POST = withErrors(async (request: Request) => {
  const { user, business } = await requireBusiness();
  enforceRateLimit(`payment-create:${user.id}`, 5, 10 * 60_000);
  const input = paymentCreateSchema.parse(await request.json());
  const checkout = await createPlanPayment({
    user,
    business,
    ...input,
    requestUrl: request.url,
  });

  return ok({ link: checkout.link, txRef: checkout.txRef });
});
