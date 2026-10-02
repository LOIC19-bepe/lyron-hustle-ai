import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const message = error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(" · ");
    return NextResponse.json(
      { error: `Données invalides — ${message}` },
      { status: 400 }
    );
  }
  console.error("[api]", error);
  return NextResponse.json(
    { error: "Erreur interne du serveur." },
    { status: 500 }
  );
}

/** Wraps a route handler with uniform error handling. */
export function withErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}
