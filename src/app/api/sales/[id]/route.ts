import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sales, customers } from "@/db/schema";
import { requireBusiness } from "@/server/auth";
import { ok, withErrors, ApiError } from "@/server/http";
import { saleSchema, derivePaymentStatus } from "@/server/validation";
import {
  toCents,
  centsToDb,
  serializeSale,
  MAX_CENTS,
} from "@/server/money";
import { dateOnlyToUtcNoon } from "@/server/periods";

type Ctx = { params: Promise<{ id: string }> };

async function findOwnedSale(businessId: string, id: string) {
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, id), eq(sales.businessId, businessId)))
    .limit(1);
  if (!sale) throw new ApiError(404, "Vente introuvable.");
  return sale;
}

export const GET = withErrors(async (_request: Request, { params }: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await params;
  const sale = await findOwnedSale(business.id, id);
  return ok({ sale: serializeSale(sale) });
});

export const PUT = withErrors(async (request: Request, { params }: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await params;
  await findOwnedSale(business.id, id);
  const body = saleSchema.parse(await request.json());

  if (body.customerId) {
    const [owned] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, body.customerId),
          eq(customers.businessId, business.id)
        )
      )
      .limit(1);
    if (!owned) throw new ApiError(400, "Client invalide.");
  }

  const unitCents = toCents(body.unitPrice, business.currency);
  const totalCents = body.quantity * unitCents;
  if (totalCents > MAX_CENTS) throw new ApiError(400, "Total trop élevé.");

  const paidCents =
    body.settlement === "FULL"
      ? totalCents
      : body.settlement === "UNPAID"
        ? 0
        : toCents(body.paidAmount ?? 0, business.currency);
  if (paidCents > totalCents) {
    throw new ApiError(400, "Le montant payé ne peut pas dépasser le total.");
  }

  const [updated] = await db
    .update(sales)
    .set({
      customerId: body.customerId ?? null,
      description: body.description,
      quantity: body.quantity,
      unitPrice: centsToDb(unitCents),
      total: centsToDb(totalCents),
      paidAmount: centsToDb(paidCents),
      paymentMethod: body.paymentMethod,
      paymentStatus: derivePaymentStatus(totalCents, paidCents),
      soldAt: body.soldAt
        ? dateOnlyToUtcNoon(body.soldAt, business.timezone)
        : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(sales.id, id), eq(sales.businessId, business.id)))
    .returning();

  return ok({ sale: serializeSale(updated) });
});

export const DELETE = withErrors(async (_request: Request, { params }: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await params;
  await findOwnedSale(business.id, id);

  await db
    .delete(sales)
    .where(and(eq(sales.id, id), eq(sales.businessId, business.id)));

  return ok({ success: true });
});
