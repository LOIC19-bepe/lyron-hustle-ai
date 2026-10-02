import { ApiError } from "@/server/http";

const API_ROOT = "https://api.flutterwave.com/v3";

type FlutterwaveResponse<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export type FlutterwaveTransaction = {
  id: number | string;
  tx_ref: string;
  amount: number | string;
  currency: string;
  status: string;
  customer?: { email?: string };
  meta?: unknown;
};

function getSecretKey() {
  const secretKey = process.env.FLW_SECRET_KEY;
  const mode = process.env.FLW_MODE ?? "test";

  if (mode !== "test") {
    throw new ApiError(503, "Cette intégration Flutterwave est limitée au mode TEST.");
  }
  if (!secretKey) {
    throw new ApiError(503, "Le paiement Flutterwave n’est pas configuré.");
  }
  if (!secretKey.startsWith("FLWSECK_TEST-")) {
    throw new ApiError(503, "Une clé Flutterwave TEST est requise en mode test.");
  }

  return secretKey;
}

export function assertFlutterwaveConfigured() {
  getSecretKey();
}

async function flutterwaveRequest<T>(path: string, init: RequestInit) {
  const secretKey = getSecretKey();
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(502, "Flutterwave est momentanément inaccessible.");
  }

  const result = (await response.json().catch(() => null)) as
    | FlutterwaveResponse<T>
    | null;
  if (!response.ok || result?.status !== "success" || result.data == null) {
    console.error("[payments:flutterwave] request rejected", {
      path,
      httpStatus: response.status,
      providerStatus: result?.status ?? "invalid_response",
    });
    throw new ApiError(502, "Flutterwave n’a pas pu traiter la demande.");
  }
  return result.data;
}

export async function createFlutterwaveStandardLink(payload: {
  tx_ref: string;
  amount: number;
  currency: "XAF";
  redirect_url: string;
  customer: {
    email: string;
    name: string;
    phone_number?: string;
  };
  customizations: {
    title: string;
    description: string;
  };
  meta: Record<string, string>;
  payment_options: "card" | "mobilemoneyfranco";
}) {
  const data = await flutterwaveRequest<{ link?: string }>("/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!data.link || !data.link.startsWith("https://checkout.flutterwave.com/")) {
    throw new ApiError(502, "Flutterwave n’a pas retourné de lien de paiement valide.");
  }
  return data.link;
}

export async function verifyFlutterwaveTransaction(transactionId: string) {
  return flutterwaveRequest<FlutterwaveTransaction>(
    `/transactions/${encodeURIComponent(transactionId)}/verify`,
    { method: "GET" }
  );
}
