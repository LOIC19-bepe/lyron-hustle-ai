import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { sales, expenses, customers } from "@/db/schema";
import { centsFromDb, centsToNumber } from "@/server/money";
import { eachLocalDay } from "@/server/periods";

export type Period = { from?: Date; to?: Date };

export type Metrics = {
  revenue: number;
  expensesTotal: number;
  profit: number;
  unpaid: number;
  salesCount: number;
  customersCount: number;
};

export type SeriesPoint = {
  date: string; // local day key (YYYY-MM-DD) in the business timezone
  revenue: number;
  expenses: number;
  profit: number;
};

export type CustomerStat = {
  customerId: string;
  name: string;
  totalPurchased: number;
  totalPaid: number;
  debt: number;
  salesCount: number;
};

export type CategoryStat = { category: string; amount: number };

function saleFilters(businessId: string, period?: Period): SQL | undefined {
  const parts: SQL[] = [eq(sales.businessId, businessId)];
  if (period?.from) parts.push(gte(sales.soldAt, period.from));
  if (period?.to) parts.push(lte(sales.soldAt, period.to));
  return and(...parts);
}

function expenseFilters(businessId: string, period?: Period): SQL | undefined {
  const parts: SQL[] = [eq(expenses.businessId, businessId)];
  if (period?.from) parts.push(gte(expenses.spentAt, period.from));
  if (period?.to) parts.push(lte(expenses.spentAt, period.to));
  return and(...parts);
}

/**
 * All critical financial figures are computed here, in the backend.
 * Aggregations run in SQL over exact numeric(14,2); results are parsed as
 * integer cents and only converted to numbers at the API boundary.
 */
export async function getMetrics(
  businessId: string,
  period?: Period
): Promise<Metrics> {
  const [saleRow] = await db
    .select({
      revenue: sql<string>`coalesce(sum(${sales.total}), 0)`,
      unpaid: sql<string>`coalesce(sum(${sales.total} - ${sales.paidAmount}), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(sales)
    .where(saleFilters(businessId, period));

  const [expenseRow] = await db
    .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .where(expenseFilters(businessId, period));

  const [customerRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(customers)
    .where(eq(customers.businessId, businessId));

  const revenueCents = centsFromDb(saleRow?.revenue ?? "0");
  const expenseCents = centsFromDb(expenseRow?.total ?? "0");
  const unpaidCents = centsFromDb(saleRow?.unpaid ?? "0");

  return {
    revenue: centsToNumber(revenueCents),
    expensesTotal: centsToNumber(expenseCents),
    profit: centsToNumber(revenueCents - expenseCents),
    unpaid: centsToNumber(unpaidCents),
    salesCount: Number(saleRow?.count ?? 0),
    customersCount: Number(customerRow?.count ?? 0),
  };
}

/** Daily series grouped by LOCAL calendar day in the business timezone. */
export async function getDailySeries(
  businessId: string,
  from: Date,
  to: Date,
  tz: string
): Promise<SeriesPoint[]> {
  const saleRows = await db
    .select({
      day: sql<string>`to_char(${sales.soldAt} at time zone ${tz}::text, 'YYYY-MM-DD')`,
      total: sql<string>`coalesce(sum(${sales.total}), 0)`,
    })
    .from(sales)
    .where(saleFilters(businessId, { from, to }))
    .groupBy(sql`1`);

  const expenseRows = await db
    .select({
      day: sql<string>`to_char(${expenses.spentAt} at time zone ${tz}::text, 'YYYY-MM-DD')`,
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(expenseFilters(businessId, { from, to }))
    .groupBy(sql`1`);

  const revenueByDay = new Map(
    saleRows.map((r) => [r.day, centsFromDb(r.total)])
  );
  const expenseByDay = new Map(
    expenseRows.map((r) => [r.day, centsFromDb(r.total)])
  );

  return eachLocalDay(from, to, tz).map((key) => {
    const revenueCents = revenueByDay.get(key) ?? 0;
    const spentCents = expenseByDay.get(key) ?? 0;
    return {
      date: key,
      revenue: centsToNumber(revenueCents),
      expenses: centsToNumber(spentCents),
      profit: centsToNumber(revenueCents - spentCents),
    };
  });
}

export async function getCustomerStats(
  businessId: string,
  period?: Period
): Promise<CustomerStat[]> {
  const rows = await db
    .select({
      customerId: customers.id,
      name: customers.name,
      totalPurchased: sql<string>`coalesce(sum(${sales.total}), 0)`,
      totalPaid: sql<string>`coalesce(sum(${sales.paidAmount}), 0)`,
      salesCount: sql<string>`count(${sales.id})`,
    })
    .from(customers)
    .leftJoin(
      sales,
      and(eq(sales.customerId, customers.id), saleFilters(businessId, period))
    )
    .where(eq(customers.businessId, businessId))
    .groupBy(customers.id, customers.name);

  return rows
    .map((r) => {
      const purchasedCents = centsFromDb(r.totalPurchased);
      const paidCents = centsFromDb(r.totalPaid);
      return {
        customerId: r.customerId,
        name: r.name,
        totalPurchased: centsToNumber(purchasedCents),
        totalPaid: centsToNumber(paidCents),
        debt: centsToNumber(purchasedCents - paidCents),
        salesCount: Number(r.salesCount),
      };
    })
    .sort((a, b) => b.totalPurchased - a.totalPurchased);
}

export async function getExpensesByCategory(
  businessId: string,
  period?: Period
): Promise<CategoryStat[]> {
  const rows = await db
    .select({
      category: expenses.category,
      amount: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(expenseFilters(businessId, period))
    .groupBy(expenses.category);

  return rows
    .map((r) => ({
      category: r.category,
      amount: centsToNumber(centsFromDb(r.amount)),
    }))
    .sort((a, b) => b.amount - a.amount);
}
