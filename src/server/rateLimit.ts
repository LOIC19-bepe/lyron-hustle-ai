import { ApiError } from "@/server/http";

/**
 * Simple in-memory sliding-window rate limiter (audit P1).
 * Suitable for the single-instance MVP; swap for Redis when scaling out.
 * No external paid service, no secrets.
 */

const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

function prune(now: number, windowMs: number): void {
  if (buckets.size <= MAX_KEYS) return;
  for (const [key, hits] of buckets) {
    if (hits.length === 0 || now - hits[hits.length - 1] > windowMs) {
      buckets.delete(key);
    }
  }
}

/** Throws HTTP 429 when `limit` calls were made within `windowMs` for `key`. */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number
): void {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    throw new ApiError(
      429,
      "Trop de tentatives. Patiente quelques minutes puis réessaie."
    );
  }
  hits.push(now);
  buckets.set(key, hits);
  prune(now, windowMs);
}

/** Best-effort client IP (behind a proxy, first x-forwarded-for entry). */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
