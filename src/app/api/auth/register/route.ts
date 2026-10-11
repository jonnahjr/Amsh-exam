import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { one, run } from "@/lib/db";
import { handleError, readJsonBody, created } from "@/lib/http";
import { ConflictError } from "@/lib/errors";
import { registerSchema } from "@/lib/validation";
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
  type Role,
} from "@/lib/auth";
import { clientAddress, recordAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

/** Create a STUDENT account and sign the new user in. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);
    const input = registerSchema.parse(body);

    const existing = one<{ id: string }>('SELECT "id" FROM "User" WHERE "email" = ?', [input.email]);
    if (existing) {
      throw new ConflictError("An account with that email already exists.");
    }

    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const password = await hashPassword(input.password);
    const role: Role = "STUDENT";

    run(
      'INSERT INTO "User" ("id","email","password","name","role","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?)',
      [id, input.email, password, input.name ?? null, role, timestamp, timestamp],
    );

    recordAudit({
      userId: id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: id,
      details: { email: input.email },
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    const token = await createSessionToken({ id, email: input.email, name: input.name ?? null, role });
    const response = created({ id, email: input.email, name: input.name ?? null, role });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return handleError(error);
  }
}
