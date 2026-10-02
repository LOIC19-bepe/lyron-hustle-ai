import { ApiError } from "@/server/http";

/**
 * Single source of truth for business periods (audit P1).
 * Every period boundary is computed in the BUSINESS timezone, so that
 * "Aujourd'hui" and "7 jours" mean the same thing on the dashboard,
 * in the reports and for the AI snapshot.
 *
 * Definitions (one per product, everywhere):
 * - today : start of current local day → now
 * - 7d    : start of local day (today − 6) → now  (7 calendar days)
 * - 30d   : start of local day (today − 29) → now (30 calendar days)
 * - previous 7d : the 7 calendar days immediately before the 7d window
 * - custom: local start of `from` day → local end of `to` day (inclusive)
 */

export type ResolvedPeriod = { from: Date; to: Date; label: string };

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CUSTOM_DAYS = 366;

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset (ms) of `tz` relative to UTC at the given instant. */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant corresponding to a wall-clock time in `tz`. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  tz: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offset = tzOffsetMs(new Date(utcGuess), tz);
  return new Date(utcGuess - offset);
}

/** Local calendar day key (YYYY-MM-DD) of an instant, in `tz`. */
export function localDayKey(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** UTC instant of local midnight, `dayShift` calendar days from `date`. */
export function startOfLocalDay(date: Date, tz: string, dayShift = 0): Date {
  const [y, m, d] = localDayKey(date, tz).split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + dayShift));
  return zonedTimeToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    0,
    0,
    0,
    0,
    tz
  );
}

/** Interprets a date-only string as noon in the business timezone (stable day). */
export function dateOnlyToUtcNoon(dateStr: string, tz: string): Date {
  if (!DATE_ONLY_RE.test(dateStr)) {
    throw new ApiError(400, "Date invalide (format attendu : AAAA-MM-JJ).");
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  return zonedTimeToUtc(y, m, d, 12, 0, 0, 0, tz);
}

/** Ordered list of local day keys covered by [from, to] in `tz` (DST-safe). */
export function eachLocalDay(from: Date, to: Date, tz: string): string[] {
  const keys: string[] = [];
  const endKey = localDayKey(to, tz);
  let cursor = startOfLocalDay(from, tz);
  let key = localDayKey(cursor, tz);
  let guard = 0;
  while (guard++ <= MAX_CUSTOM_DAYS + 2) {
    keys.push(key);
    if (key === endKey) break;
    cursor = startOfLocalDay(new Date(cursor.getTime() + 26 * 3_600_000), tz);
    key = localDayKey(cursor, tz);
  }
  return keys;
}

export function resolvePeriod(
  tz: string,
  period: string,
  fromStr?: string | null,
  toStr?: string | null
): ResolvedPeriod {
  const now = new Date();

  if (period === "today") {
    return { from: startOfLocalDay(now, tz), to: now, label: "Aujourd'hui" };
  }
  if (period === "7d") {
    return {
      from: startOfLocalDay(now, tz, -6),
      to: now,
      label: "7 derniers jours",
    };
  }
  if (period === "custom") {
    if (!fromStr || !toStr) {
      throw new ApiError(400, "Période personnalisée : dates requises.");
    }
    if (!DATE_ONLY_RE.test(fromStr) || !DATE_ONLY_RE.test(toStr)) {
      throw new ApiError(400, "Dates invalides (format attendu : AAAA-MM-JJ).");
    }
    const [fy, fm, fd] = fromStr.split("-").map(Number);
    const [ty, tm, td] = toStr.split("-").map(Number);
    const from = zonedTimeToUtc(fy, fm, fd, 0, 0, 0, 0, tz);
    const toDayStart = zonedTimeToUtc(ty, tm, td, 0, 0, 0, 0, tz);
    if (from.getTime() > toDayStart.getTime()) {
      throw new ApiError(400, "Période personnalisée invalide.");
    }
    if (
      toDayStart.getTime() - from.getTime() >
      MAX_CUSTOM_DAYS * 24 * 3_600_000
    ) {
      throw new ApiError(
        400,
        `Période trop longue (maximum ${MAX_CUSTOM_DAYS} jours).`
      );
    }
    const to = new Date(startOfLocalDay(toDayStart, tz, 1).getTime() - 1);
    return { from, to, label: "Période personnalisée" };
  }
  // default: 30d
  return {
    from: startOfLocalDay(now, tz, -29),
    to: now,
    label: "30 derniers jours",
  };
}

/** The 7 calendar days immediately before the "7d" window. */
export function previousSevenDays(tz: string): ResolvedPeriod {
  const now = new Date();
  return {
    from: startOfLocalDay(now, tz, -13),
    to: new Date(startOfLocalDay(now, tz, -6).getTime() - 1),
    label: "7 jours précédents",
  };
}
