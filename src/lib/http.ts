import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

/** Wrap a success payload in the consistent response envelope. */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function fail(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
  details?: unknown,
): NextResponse {
  return NextResponse.json({ error: { message, code, details } }, { status });
}

function zodDetails(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

/**
 * Convert any thrown value into a JSON error response.
 *
 * Unknown errors are logged server-side and reported generically so internal
 * details never leak to the client.
 */
export function handleError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return fail("The submitted data is not valid.", 422, "VALIDATION_ERROR", zodDetails(error));
  }
  if (error instanceof AppError) {
    return fail(error.message, error.status, error.code, error.details);
  }
  console.error("Unhandled API error:", error);
  return fail("Something went wrong on the server.", 500, "INTERNAL_ERROR");
}

/** Parse a JSON body, treating malformed input as a 400 rather than a crash. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("Request body must be valid JSON.", 400, "INVALID_JSON");
  }
}
