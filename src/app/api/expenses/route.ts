import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { requireBusiness } from "@/server/auth";
import { ok, withErrors } from "@/server/http";
import { expenseSchema } from "@/server/validation";
import { toCents, centsToDb, serializeExpense } from "@/server/money";
import { dateOnlyToUtcNoon } from "@/server/periods";

export const GET = withErrors(async () => {
  const { business } = await requireBusiness();
  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.businessId, business.id))
    .orderBy(desc(expenses.spentAt));
  return ok({ expenses: rows.map(serializeExpense) });
});

export const POST = withErrors(async (request: Request) => {
  const { business } = await requireBusiness();
  const body = expenseSchema.parse(await request.json());

  const [expense] = await db
    .insert(expenses)
    .values({
      businessId: business.id,
      category: body.category,
      amount: centsToDb(toCents(body.amount, business.currency)),
      description: body.description,
      spentAt: body.spentAt
        ? dateOnlyToUtcNoon(body.spentAt, business.timezone)
        : new Date(),
    })
    .returning();

  return ok({ expense: serializeExpense(expense) }, 201);
});
