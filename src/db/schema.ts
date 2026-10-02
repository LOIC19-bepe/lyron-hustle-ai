import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "MOBILE_MONEY",
  "BANK_TRANSFER",
  "CARD",
  "OTHER",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PAID",
  "PARTIAL",
  "UNPAID",
]);

export const planEnum = pgEnum("plan", ["FREE", "PRO", "BUSINESS"]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "FREE",
  "STARTER",
  "BUSINESS",
  "PRO",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "pending",
  "cancelled",
  "expired",
]);

export const billingIntervalEnum = pgEnum("billing_interval", [
  "monthly",
  "annual",
]);

export const billingPaymentStatusEnum = pgEnum("billing_payment_status", [
  "pending",
  "successful",
  "paid",
  "failed",
  "cancelled",
  "refunded",
]);

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "monthly_grant",
  "payment_grant",
  "usage",
  "refund",
  "adjustment",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  country: text("country").notNull().default("CM"),
  currency: text("currency").notNull().default("XAF"),
  /** IANA timezone of the business; all period boundaries use it. */
  timezone: text("timezone").notNull().default("Africa/Douala"),
  logoUrl: text("logo_url"),
  plan: planEnum("plan").notNull().default("FREE"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("customers_business_idx").on(t.businessId)]
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    // Money columns are mapped as exact decimal STRINGS (never JS floats).
    // All arithmetic happens in integer cents — see src/server/money.ts.
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("CASH"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("PAID"),
    soldAt: timestamp("sold_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("sales_business_idx").on(t.businessId),
    index("sales_customer_idx").on(t.customerId),
    index("sales_sold_at_idx").on(t.soldAt),
  ]
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    description: text("description").notNull().default(""),
    spentAt: timestamp("spent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("expenses_business_idx").on(t.businessId),
    index("expenses_spent_at_idx").on(t.spentAt),
  ]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id").unique(),
    plan: subscriptionPlanEnum("plan").notNull().default("FREE"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    interval: billingIntervalEnum("interval").notNull().default("monthly"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("XAF"),
    provider: text("provider").notNull().default("manual"),
    providerSubscriptionId: text("provider_subscription_id").unique(),
    startDate: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("renewal_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("subscriptions_business_created_idx").on(t.businessId, t.createdAt)]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    txRef: text("tx_ref").notNull().unique(),
    flutterwaveTransactionId: text("provider_transaction_id").unique(),
    planId: subscriptionPlanEnum("plan_id").notNull(),
    interval: billingIntervalEnum("interval").notNull().default("monthly"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("XAF"),
    paymentMethod: text("method").notNull().default("not_configured"),
    provider: text("provider").notNull().default("not_configured"),
    providerReference: text("provider_reference"),
    status: billingPaymentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("payments_business_created_idx").on(t.businessId, t.createdAt),
    index("payments_user_created_idx").on(t.userId, t.createdAt),
  ]
);

export const creditBalances = pgTable(
  "credit_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    plan: subscriptionPlanEnum("plan").notNull().default("FREE"),
    balance: integer("balance").notNull().default(100),
    monthlyAllowance: integer("monthly_allowance").notNull().default(100),
    periodStartedAt: timestamp("period_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    renewalAt: timestamp("renewal_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("credit_balances_business_uidx").on(t.businessId)]
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    balanceId: uuid("balance_id")
      .notNull()
      .references(() => creditBalances.id, { onDelete: "cascade" }),
    type: creditTransactionTypeEnum("type").notNull(),
    paymentId: uuid("payment_id"),
    delta: integer("delta").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("credit_transactions_business_created_idx").on(t.businessId, t.createdAt),
    uniqueIndex("credit_transactions_payment_uidx")
      .on(t.paymentId)
      .where(sql`${t.paymentId} is not null`),
  ]
);

export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type CreditBalance = typeof creditBalances.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
