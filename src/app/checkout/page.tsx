import { notFound } from "next/navigation";
import { CheckoutPanel } from "@/components/checkout-panel";
import type { BillingInterval, BillingPlanCode } from "@/lib/billing-plans";

const PLAN_CODES: BillingPlanCode[] = ["FREE", "STARTER", "BUSINESS", "PRO"];

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; interval?: string }>;
}) {
  const params = await searchParams;
  const planCode = PLAN_CODES.find((plan) => plan === params.plan) ?? "FREE";
  const interval: BillingInterval = params.interval === "annual" ? "annual" : "monthly";

  if (params.plan && !PLAN_CODES.includes(params.plan as BillingPlanCode)) {
    notFound();
  }

  return <CheckoutPanel planCode={planCode} interval={interval} />;
}
