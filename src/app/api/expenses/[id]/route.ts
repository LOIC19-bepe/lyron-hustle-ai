import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { requireBusiness } from "@/server/auth";
import { ok, withErrors, ApiError } from "@/server/http";
import { expenseSchema } from "@/server/validation";
import { toCents, centsToDb, serializeExpense } from "@/server/money";
import { dateOnlyToUtcNoon } from "@/server/periods";

type Ctx = { params: Promise<{ id: string }> };

async function findOwnedExpense(businessId: string, id: string) {
  const [expense] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.businessId, businessId)))
    .limit(1);
  if (!expense) throw new ApiError(404, "Dépense introuvable.");
  return expense;
}

export const PUT = withErrors(async (request: Request, { params }: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await params;
  await findOwnedExpense(business.id, id);
  const body = expenseSchema.parse(await request.json());

  const [updated] = await db
    .update(expenses)
    .set({
      category: body.category,
      amount: centsToDb(toCents(body.amount, business.currency)),
      description: body.description,
      spentAt: body.spentAt
        ? dateOnlyToUtcNoon(body.spentAt, business.timezone)
        : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(expenses.id, id), eq(expenses.businessId, business.id)))
    .returning();

  return ok({ expense: serializeExpense(updated) });
});

export const DELETE = withErrors(async (_request: Request, { params }: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await params;
  await findOwnedExpense(business.id, id);

  await db
    .delete(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.businessId, business.id)));

  return ok({ success: true });
});
