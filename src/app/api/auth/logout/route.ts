import { clearSessionCookie } from "@/server/auth";
import { ok, withErrors } from "@/server/http";

export const POST = withErrors(async () => {
  await clearSessionCookie();
  return ok({ success: true });
});
