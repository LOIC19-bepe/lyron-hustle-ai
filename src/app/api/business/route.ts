import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { requireUser, requireBusiness } from "@/server/auth";
import { ok, withErrors, ApiError } from "@/server/http";
import { businessSchema } from "@/server/validation";

export const GET = withErrors(async () => {
  const { business } = await requireBusiness();
  return ok({ business });
});

export const POST = withErrors(async (request: Request) => {
  const user = await requireUser();
  const body = businessSchema.parse(await request.json());

  const [existing] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.userId, user.id))
    .limit(1);
  if (existing) throw new ApiError(409, "Tu as déjà une entreprise configurée.");

  const [business] = await db
    .insert(businesses)
    .values({
      userId: user.id,
      name: body.name,
      country: body.country,
      currency: body.currency,
      timezone: body.timezone,
      logoUrl: body.logoUrl ?? null,
    })
    .returning();

  return ok({ business }, 201);
});

export const PUT = withErrors(async (request: Request) => {
  const { business } = await requireBusiness();
  const body = businessSchema.parse(await request.json());

  const [updated] = await db
    .update(businesses)
    .set({
      name: body.name,
      country: body.country,
      currency: body.currency,
      timezone: body.timezone,
      logoUrl: body.logoUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, business.id))
    .returning();

  return ok({ business: updated });
});
