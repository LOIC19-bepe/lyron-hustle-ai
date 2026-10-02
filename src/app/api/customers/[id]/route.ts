import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { customers, sales } from "@/db/schema";
import { requireBusiness } from "@/server/auth";
import { ok, withErrors, ApiError } from "@/server/http";
import { customerSchema } from "@/server/validation";
import { centsFromDb, centsToNumber, serializeSale } from "@/server/money";

type Ctx = { params: Promise<{ id: string }> };

async function findOwnedCustomer(businessId: string, id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
    .limit(1);
  if (!customer) throw new ApiError(404, "Client introuvable.");
  return customer;
}

export const GET = withErrors(async (_request: Request, { params }: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await params;
  const customer = await findOwnedCustomer(business.id, id);

  const history = await db
    .select()
    .from(sales)
    .where(and(eq(sales.customerId, id), eq(sales.businessId, business.id)))
    .orderBy(desc(sales.soldAt));

  // Exact arithmetic in integer cents (money strategy).
  const purchasedCents = history.reduce(
    (sum, s) => sum + centsFromDb(s.total),
    0
  );
  const paidCents = history.reduce(
    (sum, s) => sum + centsFromDb(s.paidAmount),
    0
  );

  return ok({
    customer,
    history: history.map(serializeSale),
    stats: {
      totalPurchased: centsToNumber(purchasedCents),
      totalPaid: centsToNumber(paidCents),
      debt: centsToNumber(purchasedCents - paidCents),
      salesCount: history.length,
    },
  });
});

export const PUT = withErrors(async (request: Request, { params }: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await params;
  await findOwnedCustomer(business.id, id);
  const body = customerSchema.parse(await request.json());

  const [updated] = await db
    .update(customers)
    .set({
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(customers.id, id), eq(customers.businessId, business.id)))
    .returning();

  return ok({ customer: updated });
});

export const DELETE = withErrors(async (_request: Request, { params }: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await params;
  await findOwnedCustomer(business.id, id);

  await db
    .delete(customers)
    .where(and(eq(customers.id, id), eq(customers.businessId, business.id)));

  return ok({ success: true });
});
