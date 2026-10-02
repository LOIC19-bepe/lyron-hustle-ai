import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError } from "@/server/http";
import { processWebhookPayment } from "@/server/payments/service";

function isValidWebhookHash(received: string | null, expected: string) {
  if (!received) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  const webhookSecret = process.env.FLW_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[payments:webhook] FLW_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });
  }
  if (!isValidWebhookHash(request.headers.get("verif-hash"), webhookSecret)) {
    console.warn("[payments:webhook] rejected invalid signature");
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  let payload: {
    event?: string;
    data?: { id?: number | string; tx_ref?: string; status?: string };
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const transaction = payload.data;
  if (payload.event !== "charge.completed") {
    console.info("[payments:webhook] ignored event", { event: payload.event ?? "unknown" });
    return NextResponse.json({ received: true });
  }
  if (!transaction?.id || !transaction.tx_ref) {
    console.warn("[payments:webhook] charge event missing transaction identifiers");
    return NextResponse.json({ error: "Identifiants de transaction manquants." }, { status: 400 });
  }

  console.info("[payments:webhook] charge event received", {
    txRef: transaction.tx_ref,
    transactionId: String(transaction.id),
    notificationStatus: transaction.status ?? "unknown",
  });

  try {
    const result = await processWebhookPayment(
      transaction.tx_ref,
      String(transaction.id)
    );
    console.info("[payments:webhook] event processed", {
      txRef: transaction.tx_ref,
      status: result.status,
      duplicate: "duplicate" in result ? result.duplicate : false,
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      console.warn("[payments:webhook] reference not found", { txRef: transaction.tx_ref });
      return NextResponse.json({ received: true });
    }
    console.error("[payments:webhook] processing failed", {
      txRef: transaction.tx_ref,
      error: error instanceof ApiError ? error.message : "unexpected_error",
    });
    return NextResponse.json({ error: "Échec du traitement du webhook." }, { status: 500 });
  }
}
