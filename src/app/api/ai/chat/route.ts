import { requireBusiness } from "@/server/auth";
import { ok, withErrors } from "@/server/http";
import { chatSchema } from "@/server/validation";
import { buildSnapshot } from "@/server/ai/snapshot";
import { aiService } from "@/server/ai/aiService";
import { enforceRateLimit } from "@/server/rateLimit";
import { consumeAiCredit, refundAiCredit } from "@/server/billing/service";

export const POST = withErrors(async (request: Request) => {
  const { user, business } = await requireBusiness();
  // 20 questions / minute per authenticated user (protects LLM costs).
  enforceRateLimit(`ai:${user.id}`, 20, 60_000);
  const { message } = chatSchema.parse(await request.json());

  // The backend computes every figure; the AI layer only interprets them.
  const snapshot = await buildSnapshot(business);
  await consumeAiCredit(business);
  try {
    const { reply, provider } = await aiService.answer(message, snapshot);
    return ok({ reply, provider });
  } catch (error) {
    await refundAiCredit(business.id);
    throw error;
  }

});
