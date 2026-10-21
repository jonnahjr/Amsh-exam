import { NextResponse } from "next/server";
import { all, one, run } from "@/lib/db";
import { handleError, ok, readJsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

import { validateM100Code, claimM100Code } from "@/server/m100";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await readJsonBody(request)) as Record<string, unknown> | null;
    const name = (body?.name ?? "").toString().trim();
    const rawM100Code = (body?.m100Code ?? "").toString().trim();

    if (!name || name.length < 2) throw new AppError("Please enter your full name (at least 2 characters).", 400, "VALIDATION");
    if (name.length > 120) throw new AppError("Name is too long.", 400, "VALIDATION");

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // If an M100 code is provided, validate and automatically authorize the employee immediately
    if (rawM100Code) {
      const validation = await validateM100Code(rawM100Code);
      if (!validation.valid) {
        throw new AppError(validation.error ?? "Invalid M100 code.", 400, validation.reason ?? "VALIDATION");
      }

      const email = `emp_${id.replace(/-/g, "").slice(0, 12)}@amsh.internal`;
      await run(
        `INSERT INTO "User" ("id", "email", "password", "name", "role", "m100Code", "createdAt", "updatedAt")
         VALUES (?, ?, 'NOPASSWORD', ?, 'EMPLOYEE', ?, ?, ?)`,
        [id, email, name, validation.code!, now, now],
      );

      await claimM100Code(validation.code!, id, name);

      await run(
        `INSERT INTO "CheckIn" ("id", "employeeName", "status", "checkedInAt", "approvedAt", "approvedBy", "m100Code", "notes")
         VALUES (?, ?, 'APPROVED', ?, ?, 'Auto-Approved (M100 Code)', ?, 'Automatic authorization via valid M100 code')`,
        [id, name, now, now, validation.code!],
      );

      const token = await createSessionToken({ id, email, name, role: "EMPLOYEE" });
      const response = NextResponse.json({
        id,
        employeeName: name,
        status: "APPROVED",
        checkedInAt: now,
        approvedAt: now,
        approvedBy: "Auto-Approved (M100 Code)",
        m100Code: validation.code!,
        autoApproved: true,
        redirectUrl: "/exams",
      });
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
      return response;
    }

    // Standard manual approval queue (when no M100 code is provided)
    await run(`INSERT INTO "CheckIn" ("id","employeeName","status","checkedInAt") VALUES (?,?,?,?)`, [id, name, "PENDING", now]);
    return NextResponse.json({ id, employeeName: name, status: "PENDING", checkedInAt: now });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new AppError("Missing id.", 400, "VALIDATION");

    const row = await one<{ id: string; employeeName: string; status: string; checkedInAt: string; approvedAt: string | null }>(
      `SELECT "id","employeeName","status","checkedInAt","approvedAt" FROM "CheckIn" WHERE "id" = ?`,
      [id],
    );
    if (!row) throw new AppError("Check-in not found.", 404, "NOT_FOUND");

    if (row.status === "APPROVED") {
      const email = `emp_${row.id.replace(/-/g, "").slice(0, 12)}@amsh.internal`;
      let user = await one<{ id: string; email: string; name: string | null; role: "STUDENT" | "EMPLOYEE" }>(
        `SELECT "id", "email", "name", "role" FROM "User" WHERE "email" = ?`,
        [email],
      );
      if (!user) {
        const userId = row.id;
        const now = new Date().toISOString();
        await run(
          `INSERT INTO "User" ("id", "email", "password", "name", "role", "createdAt", "updatedAt") VALUES (?, ?, 'NOPASSWORD', ?, 'EMPLOYEE', ?, ?)`,
          [userId, email, row.employeeName, now, now],
        );
        user = { id: userId, email, name: row.employeeName, role: "EMPLOYEE" };
      }
      const token = await createSessionToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      const response = NextResponse.json({ ...row, redirectUrl: "/exams" });
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
      return response;
    }
    return NextResponse.json(row);
  } catch (error) {
    return handleError(error);
  }
}