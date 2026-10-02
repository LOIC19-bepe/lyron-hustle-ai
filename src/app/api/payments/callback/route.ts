import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const txRef = incoming.searchParams.get("tx_ref");
  const transactionId = incoming.searchParams.get("transaction_id");
  const providerStatus = incoming.searchParams.get("status");
  const resultUrl = new URL(
    "/checkout/result",
    process.env.APP_URL?.trim() || incoming.origin
  );

  if (txRef) resultUrl.searchParams.set("tx_ref", txRef);
  if (transactionId) resultUrl.searchParams.set("transaction_id", transactionId);

  console.info("[payments:callback] returned from hosted checkout", {
    txRef: txRef ?? "missing",
    transactionId: transactionId ?? "missing",
    providerStatus: providerStatus ?? "missing",
  });

  return NextResponse.redirect(resultUrl, 303);
}
