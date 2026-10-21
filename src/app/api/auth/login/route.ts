import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { handleError, ok, readJsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
  type Role,
} from "@/lib/auth";
import { clientAddress, recordAudit } from "@/server/audit";

import { validateM100Code, claimM100Code, ensureApprovedCheckInForM100 } from "@/server/m100";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string | null;
  role: Role;
  m100Code?: string | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);
    const input = loginSchema.parse(body);

    const user = await one<UserRow>(
      'SELECT "id","email","password","name","role","m100Code" FROM "User" WHERE "email" = ?',
      [input.email],
    );

    const hash = user?.password ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
    const valid = await verifyPassword(input.password, hash);

    if (!user || !valid) {
      recordAudit({
        userId: user?.id ?? null,
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: user?.id ?? null,
        details: { email: input.email },
        ipAddress: clientAddress(request.headers),
        userAgent: request.headers.get("user-agent"),
      });
      throw new AppError("Email or password is incorrect.", 401, "INVALID_CREDENTIALS");
    }

    let activeM100 = user.m100Code ?? null;
    let autoApproved = false;

    // If an M100 code was provided on login, validate and link it
    if (input.m100Code && input.m100Code.trim()) {
      const validation = await validateM100Code(input.m100Code, user.id);
      if (!validation.valid) {
        throw new AppError(validation.error ?? "Invalid M100 code.", 400, validation.reason ?? "VALIDATION");
      }
      activeM100 = validation.code!;
      await claimM100Code(activeM100, user.id, user.name ?? undefined);
      user.role = "EMPLOYEE";
      autoApproved = true;
    } else if (activeM100) {
      // Check if user's existing M100 code is still valid and active
      const validation = await validateM100Code(activeM100, user.id);
      if (validation.valid) {
        autoApproved = true;
      }
    }

    // Auto-approve exam sitting for valid M100 employee
    if (autoApproved && activeM100) {
      await ensureApprovedCheckInForM100(user.id, user.name ?? user.email, activeM100);
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    recordAudit({
      userId: user.id,
      action: "LOGIN_SUCCEEDED",
      entity: "User",
      entityId: user.id,
      details: { email: input.email, m100Code: activeM100, autoApproved },
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    const response = ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      m100Code: activeM100,
      autoApproved,
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return handleError(error);
  }
}