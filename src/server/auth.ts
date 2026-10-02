import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, businesses, type User, type Business } from "@/db/schema";
import { ApiError } from "@/server/http";

/**
 * JWT_SECRET is mandatory — there is NO default and NO hardcoded fallback.
 * The secret is resolved lazily (first use at runtime, then cached) so that
 * `next build` does not require runtime secrets, which is standard practice
 * for build pipelines. If the variable is missing at runtime, every JWT
 * operation fails with a clear error. The value itself is never logged.
 */
let cachedJwtSecret: string | null = null;

function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Define it in your environment (.env). " +
        "Generate one with: openssl rand -hex 32 (or PowerShell: " +
        "-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) }))"
    );
  }
  cachedJwtSecret = secret;
  return secret;
}

const COOKIE_NAME = "abc_token";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type TokenPayload = { sub: string };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies TokenPayload, getJwtSecret(), {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getAuthUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  // Resolved OUTSIDE the try/catch: a missing JWT_SECRET must fail loudly,
  // never be silently swallowed as "not authenticated".
  const secret = getJwtSecret();
  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

/** Throws 401 if not authenticated. */
export async function requireUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) throw new ApiError(401, "Non authentifié.");
  return user;
}

/** Throws 401/404. Guarantees data isolation: only the caller's business. */
export async function requireBusiness(): Promise<{
  user: User;
  business: Business;
}> {
  const user = await requireUser();
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, user.id))
    .limit(1);
  if (!business) throw new ApiError(404, "Aucune entreprise configurée.");
  return { user, business };
}
