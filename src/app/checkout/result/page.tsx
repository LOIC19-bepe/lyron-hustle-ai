import { CheckoutResult } from "@/components/checkout-result";

export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: Promise<{ tx_ref?: string; transaction_id?: string }>;
}) {
  const params = await searchParams;
  return (
    <CheckoutResult
      txRef={params.tx_ref ?? ""}
      transactionId={params.transaction_id ?? ""}
    />
  );
}
