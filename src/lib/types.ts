export type AuthUser = { id: string; name: string; email: string };

export type Business = {
  id: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  plan: "FREE" | "PRO" | "BUSINESS";
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  totalPurchased?: number;
  totalPaid?: number;
  debt?: number;
  salesCount?: number;
};

export type Sale = {
  id: string;
  customerId: string | null;
  customerName?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paidAmount: number;
  paymentMethod: "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CARD" | "OTHER";
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  soldAt: string;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string;
  spentAt: string;
};

export type Metrics = {
  revenue: number;
  expensesTotal: number;
  profit: number;
  unpaid: number;
  salesCount: number;
  customersCount: number;
};

export type SeriesPoint = {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export type BillingPlanCode = "FREE" | "STARTER" | "BUSINESS" | "PRO";

export type BillingOverview = {
  subscription: {
    plan: BillingPlanCode;
    status: "active" | "pending" | "cancelled" | "expired";
    interval: "monthly" | "annual";
    amount: string;
    currency: string;
    startedAt: string;
    renewalAt: string | null;
  };
  credits: {
    balance: number;
    monthlyAllowance: number;
    usedThisPeriod: number;
    renewalAt: string;
  };
  recentTransactions: {
    id: string;
    type: "monthly_grant" | "usage" | "refund" | "adjustment";
    delta: number;
    description: string;
    createdAt: string;
  }[];
  recentPayments: {
    id: string;
    amount: string;
    currency: string;
    method: string;
    status: "pending" | "paid" | "failed" | "refunded";
    createdAt: string;
  }[];
};
