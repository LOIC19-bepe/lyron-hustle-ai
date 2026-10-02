import { requireBusiness } from "@/server/auth";
import { ok, withErrors } from "@/server/http";
import { paymentVerifySchema } from "@/server/validation";
import { verifyAndProcessPayment } from "@/server/payments/service";

export const POST = withErrors(async (request: Request) => {
  const { user, business } = await requireBusiness();
  const input = paymentVerifySchema.parse(await request.json());
  const result = await verifyAndProcessPayment({
    ...input,
    userId: user.id,
    businessId: business.id,
  });
  return ok(result);
});
