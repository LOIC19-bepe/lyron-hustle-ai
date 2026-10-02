import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { ok, withErrors } from "@/server/http";

export const GET = withErrors(async () => {
  const user = await requireUser();
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, user.id))
    .limit(1);

  return ok({
    user: { id: user.id, name: user.name, email: user.email },
    business: business ?? null,
  });
});
