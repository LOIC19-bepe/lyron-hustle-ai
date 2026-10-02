import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, setSessionCookie } from "@/server/auth";
import { ok, withErrors, ApiError } from "@/server/http";
import { loginSchema } from "@/server/validation";
import { enforceRateLimit, clientIp } from "@/server/rateLimit";

export const POST = withErrors(async (request: Request) => {
  // 10 attempts / 15 min per IP — blocks brute force, not legitimate users.
  enforceRateLimit(`login:${clientIp(request)}`, 10, 15 * 60_000);
  const body = loginSchema.parse(await request.json());

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new ApiError(401, "Email ou mot de passe incorrect.");
  }

  await setSessionCookie(user.id);
  return ok({ user: { id: user.id, name: user.name, email: user.email } });
});
