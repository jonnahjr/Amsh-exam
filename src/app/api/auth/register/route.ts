import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { one, run } from "@/lib/db";
import { handleError, readJsonBody, created } from "@/lib/http";
import { ConflictError, AppError } from "@/lib/errors";
import { registerSchema } from "@/lib/validation";
import { validateM100Code, claimM100Code, ensureApprovedCheckInForM100, findActivePause } from "@/server/m100";
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
  type Role,
} from "@/lib/auth";
import { clientAddress, recordAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);
    const input = registerSchema.parse(body);

    const existing = await one<{ id: string }>('SELECT "id" FROM "User" WHERE "email" = ?', [input.email]);
    if (existing) throw new ConflictError("An account with that email already exists.");

    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const password = await hashPassword(input.password);

    const ipAddress = clientAddress(request.headers);
    const pause = await findActivePause(input.name ?? input.email, ipAddress);
    if (pause) {
      throw new AppError(
        "This candidate or device is paused by an administrator. Please contact the exam desk.",
        403,
        "FORBIDDEN",
      );
    }

    let role: Role = "STUDENT";
    let validatedM100Code: string | null = null;

    if (input.m100Code && input.m100Code.trim()) {
      const validation = await validateM100Code(input.m100Code);
      if (!validation.valid) {
        throw new AppError(validation.error ?? "Invalid M100 code.", 400, validation.reason ?? "VALIDATION");
      }
      role = "EMPLOYEE";
      validatedM100Code = validation.code!;
    }

    await run(
      'INSERT INTO "User" ("id","email","password","name","role","m100Code","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?)',
      [id, input.email, password, input.name ?? null, role, validatedM100Code, timestamp, timestamp],
    );

    if (validatedM100Code) {
      await claimM100Code(validatedM100Code, id, input.name ?? undefined);
      await ensureApprovedCheckInForM100(id, input.name ?? input.email, validatedM100Code, ipAddress);
    }

    recordAudit({
      userId: id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: id,
      details: { email: input.email, m100Code: validatedM100Code, autoApproved: Boolean(validatedM100Code) },
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    const token = await createSessionToken({ id, email: input.email, name: input.name ?? null, role });
    const response = created({
      id,
      email: input.email,
      name: input.name ?? null,
      role,
      m100Code: validatedM100Code,
      autoApproved: Boolean(validatedM100Code),
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return handleError(error);
  }
}