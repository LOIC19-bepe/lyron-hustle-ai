import type {
  Metrics,
  SeriesPoint,
  CustomerStat,
  CategoryStat,
} from "@/server/finance";

/**
 * Snapshot of pre-computed business figures. The AI layer can only
 * interpret these numbers — it never computes or invents figures.
 */
export type BusinessSnapshot = {
  businessName: string;
  currency: string;
  today: Metrics;
  last7Days: Metrics;
  previous7Days: Metrics;
  last30Days: Metrics;
  allTime: Metrics;
  dailySeries30: SeriesPoint[];
  topCustomers: CustomerStat[];
  debtors: CustomerStat[];
  expenseCategories: CategoryStat[];
};

export interface AIProvider {
  readonly name: string;
  answer(question: string, snapshot: BusinessSnapshot): Promise<string>;
}
