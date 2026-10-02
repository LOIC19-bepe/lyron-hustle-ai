import { and, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  creditBalances,
  creditTransactions,
  payments,
  subscriptions,
  type Business,
} from "@/db/schema";
import { ApiError } from "@/server/http";
import {
  AI_CREDITS_PER_MESSAGE,
  PLAN_CATALOG,
  type BillingPlanCode,
} from "@/lib/billing-plans";

function legacyPlanCode(plan: Business["plan"]): BillingPlanCode {
  return plan === "BUSINESS" || plan === "PRO" ? plan : "FREE";
}

async function getLatestSubscription(businessId: string) {
  const now = new Date();
  await db
    .update(subscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(subscriptions.businessId, businessId),
        eq(subscriptions.status, "active"),
        isNotNull(subscriptions.endDate),
        lte(subscriptions.endDate, now)
      )
    );

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.businessId, businessId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return subscription;
}

async function getCurrentPlan(business: Business): Promise<BillingPlanCode> {
  const subscription = await getLatestSubscription(business.id);
  return subscription?.status === "active"
    ? subscription.plan
    : legacyPlanCode(business.plan);
}

function addOneMonth(from: Date): Date {
  const next = new Date(from);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
  ).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

async function getOrCreateBalance(
  businessId: string,
  plan: BillingPlanCode
) {
  const initialBalance = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.businessId, businessId))
      .limit(1);
    if (existing) return existing;

    const now = new Date();
    const allowance = PLAN_CATALOG[plan].monthlyCredits;
    const [created] = await tx
      .insert(creditBalances)
      .values({
        businessId,
        plan,
        balance: allowance,
        monthlyAllowance: allowance,
        periodStartedAt: now,
        renewalAt: addOneMonth(now),
      })
      .onConflictDoNothing({ target: creditBalances.businessId })
      .returning();

    if (created) {
      await tx.insert(creditTransactions).values({
        businessId,
        balanceId: created.id,
        type: "monthly_grant",
        delta: allowance,
        description: `Crédits mensuels du plan ${plan}`,
      });
      return created;
    }

    const [concurrentBalance] = await tx
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.businessId, businessId))
      .limit(1);
    if (!concurrentBalance) throw new Error("Credit balance initialization failed");
    return concurrentBalance;
  });

  const now = new Date();
  if (initialBalance.renewalAt > now && initialBalance.plan === plan) {
    return initialBalance;
  }

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.businessId, businessId))
      .for("update")
      .limit(1);
    if (!current) throw new Error("Credit balance not found");

    const renewalDue = current.renewalAt <= now;
    if (!renewalDue && current.plan === plan) return current;

    const allowance = PLAN_CATALOG[plan].monthlyCredits;
    const nextBalance = renewalDue
      ? allowance
      : Math.min(current.balance, allowance);
    const renewalAt = renewalDue ? addOneMonth(now) : current.renewalAt;
    const [updated] = await tx
      .update(creditBalances)
      .set({
        plan,
        monthlyAllowance: allowance,
        balance: nextBalance,
        periodStartedAt: renewalDue ? now : current.periodStartedAt,
        renewalAt,
        updatedAt: now,
      })
      .where(eq(creditBalances.id, current.id))
      .returning();

    if (renewalDue) {
      if (current.balance > 0) {
        await tx.insert(creditTransactions).values({
          businessId,
          balanceId: current.id,
          type: "adjustment",
          delta: -current.balance,
          description: "Expiration du solde précédent",
        });
      }
      await tx.insert(creditTransactions).values({
        businessId,
        balanceId: current.id,
        type: "monthly_grant",
        delta: allowance,
        description: `Renouvellement des crédits du plan ${plan}`,
      });
    } else if (nextBalance < current.balance) {
      await tx.insert(creditTransactions).values({
        businessId,
        balanceId: current.id,
        type: "adjustment",
        delta: nextBalance - current.balance,
        description: `Ajustement du solde au plan ${plan}`,
      });
    }

    return updated;
  });
}

export async function consumeAiCredit(business: Business): Promise<number> {
  const plan = await getCurrentPlan(business);
  const balance = await getOrCreateBalance(business.id, plan);

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(creditBalances)
      .set({
        balance: sql`${creditBalances.balance} - ${AI_CREDITS_PER_MESSAGE}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(creditBalances.id, balance.id),
          gte(creditBalances.balance, AI_CREDITS_PER_MESSAGE)
        )
      )
      .returning();

    if (!updated) {
      throw new ApiError(
        402,
        "Tes crédits IA sont épuisés. Ils seront renouvelés à la prochaine échéance."
      );
    }

    await tx.insert(creditTransactions).values({
      businessId: business.id,
      balanceId: balance.id,
      type: "usage",
      delta: -AI_CREDITS_PER_MESSAGE,
      description: "Question à l’assistant IA",
    });

    return updated.balance;
  });
}

export async function refundAiCredit(businessId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.businessId, businessId))
      .for("update")
      .limit(1);
    if (!current) return;

    const restored = Math.min(
      AI_CREDITS_PER_MESSAGE,
      current.monthlyAllowance - current.balance
    );
    if (restored <= 0) return;

    await tx
      .update(creditBalances)
      .set({ balance: current.balance + restored, updatedAt: new Date() })
      .where(eq(creditBalances.id, current.id));
    await tx.insert(creditTransactions).values({
      businessId,
      balanceId: current.id,
      type: "refund",
      delta: restored,
      description: "Remboursement après échec de l’assistant",
    });
  });
}

export async function getBillingOverview(business: Business) {
  const subscription = await getLatestSubscription(business.id);
  const plan = subscription?.status === "active"
    ? subscription.plan
    : legacyPlanCode(business.plan);
  const displayedPlan = subscription?.plan ?? plan;
  const balance = await getOrCreateBalance(business.id, plan);

  const [usage] = await db
    .select({
      used: sql<number>`coalesce(sum(-${creditTransactions.delta}), 0)`,
    })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.businessId, business.id),
        eq(creditTransactions.type, "usage"),
        gte(creditTransactions.createdAt, balance.periodStartedAt)
      )
    );
  const recentTransactions = await db
    .select({
      id: creditTransactions.id,
      type: creditTransactions.type,
      delta: creditTransactions.delta,
      description: creditTransactions.description,
      createdAt: creditTransactions.createdAt,
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.businessId, business.id))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(5);
  const recentPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      currency: payments.currency,
      method: payments.paymentMethod,
      status: payments.status,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(eq(payments.businessId, business.id))
    .orderBy(desc(payments.createdAt))
    .limit(5);

  return {
    subscription: {
      plan: displayedPlan,
      status: subscription?.status ?? "active",
      interval: subscription?.interval ?? "monthly",
      amount: subscription?.amount ?? String(PLAN_CATALOG[displayedPlan].monthlyPrice),
      currency: subscription?.currency ?? "XAF",
      startedAt: subscription?.startDate ?? business.createdAt,
      renewalAt: subscription?.endDate ?? null,
    },
    credits: {
      balance: balance.balance,
      monthlyAllowance: balance.monthlyAllowance,
      usedThisPeriod: Number(usage?.used ?? 0),
      renewalAt: balance.renewalAt,
    },
    recentTransactions,
    recentPayments,
  };
}
