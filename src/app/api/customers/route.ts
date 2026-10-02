import { and, eq, ilike, desc } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireBusiness } from "@/server/auth";
import { ok, withErrors } from "@/server/http";
import { customerSchema } from "@/server/validation";
import { getCustomerStats } from "@/server/finance";

export const GET = withErrors(async (request: Request) => {
  const { business } = await requireBusiness();
  const q = new URL(request.url).searchParams.get("q")?.trim();

  const where = q
    ? and(eq(customers.businessId, business.id), ilike(customers.name, `%${q}%`))
    : eq(customers.businessId, business.id);

  const [rows, stats] = await Promise.all([
    db.select().from(customers).where(where).orderBy(desc(customers.createdAt)),
    getCustomerStats(business.id),
  ]);

  const statsById = new Map(stats.map((s) => [s.customerId, s]));
  const items = rows.map((c) => ({
    ...c,
    totalPurchased: statsById.get(c.id)?.totalPurchased ?? 0,
    totalPaid: statsById.get(c.id)?.totalPaid ?? 0,
    debt: statsById.get(c.id)?.debt ?? 0,
    salesCount: statsById.get(c.id)?.salesCount ?? 0,
  }));

  return ok({ customers: items });
});

export const POST = withErrors(async (request: Request) => {
  const { business } = await requireBusiness();
  const body = customerSchema.parse(await request.json());

  const [customer] = await db
    .insert(customers)
    .values({
      businessId: business.id,
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
    })
    .returning();

  return ok({ customer }, 201);
});
