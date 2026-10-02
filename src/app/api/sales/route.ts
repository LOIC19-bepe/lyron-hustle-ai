import { and, eq, desc } from "drizzle-orm";
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

export const GET = withErrors(async () => {
  const { business } = await requireBusiness();

  const rows = await db
    .select({
      sale: sales,
      customerName: customers.name,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.businessId, business.id))
    .orderBy(desc(sales.soldAt));

  return ok({
    sales: rows.map((r) => ({
      ...serializeSale(r.sale),
      customerName: r.customerName,
    })),
  });
});

export const POST = withErrors(async (request: Request) => {
  const { business } = await requireBusiness();
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

  // Server is the only authority: total, paidAmount and status are
  // computed here, in integer cents (never trusted from the client).
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

  const [sale] = await db
    .insert(sales)
    .values({
      businessId: business.id,
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
        : new Date(),
    })
    .returning();

  return ok({ sale: serializeSale(sale) }, 201);
});
