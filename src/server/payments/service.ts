import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  businesses,
  creditBalances,
  creditTransactions,
  payments,
  subscriptions,
  type Business,
  type User,
} from "@/db/schema";
import { PLAN_CATALOG, getPlanPrice, type BillingInterval, type BillingPlanCode } from "@/lib/billing-plans";
import { ApiError } from "@/server/http";
import {
  assertFlutterwaveConfigured,
  createFlutterwaveStandardLink,
  verifyFlutterwaveTransaction,
  type FlutterwaveTransaction,
} from "@/server/payments/flutterwave";

export type PaymentMethod = "mtn_mobile_money" | "orange_money" | "card";

function getEndDate(startDate: Date, interval: BillingInterval) {
  const endDate = new Date(startDate);
  const day = endDate.getUTCDate();
  endDate.setUTCDate(1);
  endDate.setUTCMonth(endDate.getUTCMonth() + (interval === "annual" ? 12 : 1));
  const lastDay = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0)
  ).getUTCDate();
  endDate.setUTCDate(Math.min(day, lastDay));
  return endDate;
}

function getMonthlyRenewal(from: Date) {
  return getEndDate(from, "monthly");
}

function getAppUrl(requestUrl: string) {
  const configured = process.env.APP_URL?.trim();
  const appUrl = configured || new URL(requestUrl).origin;
  try {
    const url = new URL(appUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error("APP_URL must use HTTPS outside localhost");
    }
    return url;
  } catch {
    throw new ApiError(503, "APP_URL n’est pas une URL publique valide.");
  }
}

export async function createPlanPayment(input: {
  user: User;
  business: Business;
  planId: BillingPlanCode;
  interval: BillingInterval;
  paymentMethod: PaymentMethod;
  phoneNumber?: string;
  requestUrl: string;
}) {
  const { user, business, planId, interval, paymentMethod, phoneNumber } = input;
  if (planId === "FREE") {
    throw new ApiError(400, "Le plan FREE ne nécessite aucun paiement.");
  }

  const amount = getPlanPrice(planId, interval);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new ApiError(400, "Le montant de ce plan est invalide.");
  }
  assertFlutterwaveConfigured();
  const appUrl = getAppUrl(input.requestUrl);

  const txRef = `LYRON_${randomUUID()}`;
  const now = new Date();
  const [payment] = await db
    .insert(payments)
    .values({
      businessId: business.id,
      userId: user.id,
      txRef,
      planId,
      interval,
      amount: String(amount),
      currency: "XAF",
      paymentMethod,
      provider: "flutterwave",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: payments.id });

  const redirectUrl = new URL("/api/payments/callback", appUrl).toString();
  const plan = PLAN_CATALOG[planId];
  const payload = {
    tx_ref: txRef,
    amount,
    currency: "XAF" as const,
    redirect_url: redirectUrl,
    customer: {
      email: user.email,
      name: user.name,
      ...(phoneNumber ? { phone_number: phoneNumber } : {}),
    },
    customizations: {
      title: "LYRON HUSTLE AI",
      description: `Abonnement ${plan.name} ${interval === "annual" ? "annuel" : "mensuel"}`,
    },
    meta: {
      userId: user.id,
      businessId: business.id,
      planId,
      interval,
      paymentMethod,
    },
    payment_options: paymentMethod === "card" ? "card" as const : "mobilemoneyfranco" as const,
  };

  try {
    const link = await createFlutterwaveStandardLink(payload);
    console.info("[payments:create] hosted checkout created", {
      txRef,
      planId,
      interval,
      paymentMethod,
    });
    return { link, txRef, paymentId: payment.id };
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 503)) {
      await db
        .update(payments)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
    }
    console.error("[payments:create] unable to create hosted checkout", {
      txRef,
      planId,
      paymentMethod,
      error: error instanceof ApiError ? error.message : "unexpected_error",
    });
    throw error;
  }
}

function parseMeta(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function assertVerifiedPayment(
  data: FlutterwaveTransaction,
  payment: typeof payments.$inferSelect,
  expectedTransactionId: string
) {
  const providerId = String(data.id);
  const expectedAmount = getPlanPrice(payment.planId, payment.interval);
  const meta = parseMeta(data.meta);

  if (providerId !== expectedTransactionId) {
    throw new ApiError(409, "L’identifiant Flutterwave ne correspond pas.");
  }
  if (data.tx_ref !== payment.txRef) {
    throw new ApiError(409, "La référence Flutterwave ne correspond pas.");
  }
  if (Number(data.amount) !== expectedAmount || Number(payment.amount) !== expectedAmount) {
    throw new ApiError(409, "Le montant Flutterwave ne correspond pas au plan.");
  }
  if (data.currency !== "XAF" || payment.currency !== "XAF") {
    throw new ApiError(409, "La devise Flutterwave ne correspond pas à XAF.");
  }
  if (
    !meta ||
    meta.userId !== payment.userId ||
    meta.businessId !== payment.businessId
  ) {
    throw new ApiError(409, "L’utilisateur Flutterwave ne correspond pas.");
  }
  if (meta.planId !== payment.planId || meta.interval !== payment.interval) {
    throw new ApiError(409, "Le plan Flutterwave ne correspond pas.");
  }

  return providerId;
}

async function applyVerifiedSuccess(
  payment: typeof payments.$inferSelect,
  providerId: string
) {
  const now = new Date();
  const monthlyCredits = PLAN_CATALOG[payment.planId].monthlyCredits;
  const [claimedPayment] = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(payments)
      .set({
        status: "successful",
        flutterwaveTransactionId: providerId,
        paidAt: now,
        updatedAt: now,
      })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
      .returning({ id: payments.id });

    if (!claimed) return [null] as const;

    await tx
      .update(subscriptions)
      .set({ status: "expired", endDate: now, updatedAt: now })
      .where(
        and(
          eq(subscriptions.businessId, payment.businessId),
          eq(subscriptions.status, "active")
        )
      );

    await tx.insert(subscriptions).values({
      businessId: payment.businessId,
      userId: payment.userId,
      paymentId: payment.id,
      plan: payment.planId,
      status: "active",
      interval: payment.interval,
      amount: payment.amount,
      currency: "XAF",
      provider: "flutterwave",
      providerSubscriptionId: null,
      startDate: now,
      endDate: getEndDate(now, payment.interval),
      createdAt: now,
      updatedAt: now,
    });

    const [existingBalance] = await tx
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.businessId, payment.businessId))
      .for("update")
      .limit(1);
    const nextRenewal = getMonthlyRenewal(now);
    let balanceId = existingBalance?.id;

    if (existingBalance) {
      await tx
        .update(creditBalances)
        .set({
          plan: payment.planId,
          balance: monthlyCredits,
          monthlyAllowance: monthlyCredits,
          periodStartedAt: now,
          renewalAt: nextRenewal,
          updatedAt: now,
        })
        .where(eq(creditBalances.id, existingBalance.id));
      if (existingBalance.balance > 0) {
        await tx.insert(creditTransactions).values({
          businessId: payment.businessId,
          balanceId: existingBalance.id,
          type: "adjustment",
          delta: -existingBalance.balance,
          description: "Expiration des crédits avant renouvellement de l’abonnement",
        });
      }
    } else {
      const [createdBalance] = await tx
        .insert(creditBalances)
        .values({
          businessId: payment.businessId,
          plan: payment.planId,
          balance: monthlyCredits,
          monthlyAllowance: monthlyCredits,
          periodStartedAt: now,
          renewalAt: nextRenewal,
          updatedAt: now,
        })
        .returning({ id: creditBalances.id });
      balanceId = createdBalance.id;
    }

    if (!balanceId) throw new Error("Credit balance could not be created");
    await tx.insert(creditTransactions).values({
      businessId: payment.businessId,
      balanceId,
      paymentId: payment.id,
      type: "payment_grant",
      delta: monthlyCredits,
      description: `Crédits inclus dans l’abonnement ${payment.planId}`,
    });

    await tx
      .update(businesses)
      .set({ updatedAt: now })
      .where(eq(businesses.id, payment.businessId));

    return [claimed] as const;
  });

  if (!claimedPayment) {
    const [latest] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, payment.id))
      .limit(1);
    if (
      latest?.status === "successful" &&
      latest.flutterwaveTransactionId === providerId
    ) {
      return { status: "successful" as const, planId: payment.planId, duplicate: true };
    }
    throw new ApiError(409, "Cette transaction a déjà été traitée.");
  }

  console.info("[payments:settlement] subscription activated", {
    txRef: payment.txRef,
    providerTransactionId: providerId,
    userId: payment.userId,
    planId: payment.planId,
    credits: monthlyCredits,
  });
  return { status: "successful" as const, planId: payment.planId, duplicate: false };
}

export async function verifyAndProcessPayment(input: {
  txRef: string;
  transactionId: string;
  userId?: string;
  businessId?: string;
}) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.txRef, input.txRef))
    .limit(1);
  if (
    !payment ||
    (input.userId && payment.userId !== input.userId) ||
    (input.businessId && payment.businessId !== input.businessId)
  ) {
    throw new ApiError(404, "Transaction introuvable.");
  }

  const [owner] = await db
    .select({ userId: businesses.userId })
    .from(businesses)
    .where(eq(businesses.id, payment.businessId))
    .limit(1);
  if (!owner || owner.userId !== payment.userId) {
    throw new ApiError(409, "Le propriétaire de la transaction ne correspond pas.");
  }

  if (payment.status === "successful") {
    if (payment.flutterwaveTransactionId !== input.transactionId) {
      throw new ApiError(409, "Cette transaction a déjà été traitée.");
    }
    return { status: "successful" as const, planId: payment.planId, duplicate: true };
  }
  if (payment.status !== "pending") {
    return { status: payment.status, planId: payment.planId, duplicate: false };
  }

  const verification = await verifyFlutterwaveTransaction(input.transactionId);
  const providerId = assertVerifiedPayment(verification, payment, input.transactionId);
  console.info("[payments:verify] Flutterwave transaction checked", {
    txRef: payment.txRef,
    providerTransactionId: providerId,
    providerStatus: verification.status,
  });

  if (verification.status === "successful") {
    return applyVerifiedSuccess(payment, providerId);
  }

  if (verification.status === "failed" || verification.status === "cancelled") {
    const status = verification.status === "cancelled" ? "cancelled" : "failed";
    await db
      .update(payments)
      .set({ status, flutterwaveTransactionId: providerId, updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
    return { status, planId: payment.planId, duplicate: false };
  }

  return { status: "pending" as const, planId: payment.planId, duplicate: false };
}

export async function processWebhookPayment(txRef: string, transactionId: string) {
  return verifyAndProcessPayment({ txRef, transactionId });
}

export async function findPendingPayment(txRef: string, userId: string) {
  const [payment] = await db
    .select({ id: payments.id, status: payments.status })
    .from(payments)
    .where(and(eq(payments.txRef, txRef), eq(payments.userId, userId)))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment ?? null;
}
