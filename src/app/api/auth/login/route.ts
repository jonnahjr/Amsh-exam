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

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string | null;
  role: Role;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonBody(request);
    const input = loginSchema.parse(body);

    const user = await one<UserRow>(
      'SELECT "id","email","password","name","role" FROM "User" WHERE "email" = ?',
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
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    const response = ok({ id: user.id, email: user.email, name: user.name, role: user.role });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return handleError(error);
  }
}