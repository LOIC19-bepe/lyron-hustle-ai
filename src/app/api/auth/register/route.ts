import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSessionCookie } from "@/server/auth";
import { ok, withErrors, ApiError } from "@/server/http";
import { registerSchema } from "@/server/validation";
import { enforceRateLimit, clientIp } from "@/server/rateLimit";

export const POST = withErrors(async (request: Request) => {
  // 5 account creations / hour per IP.
  enforceRateLimit(`register:${clientIp(request)}`, 5, 60 * 60_000);
  const body = registerSchema.parse(await request.json());

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);
  if (existing) throw new ApiError(409, "Un compte existe déjà avec cet email.");

  const [user] = await db
    .insert(users)
    .values({
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
    })
    .returning();

  await setSessionCookie(user.id);
  return ok({ user: { id: user.id, name: user.name, email: user.email } }, 201);
});
