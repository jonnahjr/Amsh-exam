/**
 * Browser-side API helper.
 *
 * Unwraps the `{ data }` envelope and turns `{ error }` responses into thrown
 * errors, so components can use a plain try/catch.
 *
 * Must stay free of Node-only imports: this module is bundled for the client.
 */

export interface ApiErrorShape {
  message: string;
  code: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  url: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const payload = await readBody(response);

  if (!response.ok) {
    const error = (payload as { error?: ApiErrorShape } | null)?.error;
    throw new ApiError(
      error?.message ?? `Request failed with status ${response.status}.`,
      error?.code ?? "REQUEST_FAILED",
      response.status,
      error?.details,
    );
  }

  return (payload as { data: T } | null)?.data as T;
}

/** Flatten API validation details into a list of messages for display. */
export function errorMessages(error: unknown): string[] {
  if (error instanceof ApiError) {
    if (error.details && typeof error.details === "object" && !Array.isArray(error.details)) {
      const messages = Object.entries(error.details as Record<string, string[]>).map(
        ([field, issues]) => `${field === "_" ? "Form" : field}: ${issues.join(", ")}`,
      );
      if (messages.length > 0) return messages;
    }
    return [error.message];
  }
  if (error instanceof Error) return [error.message];
  return ["Something went wrong."];
}
