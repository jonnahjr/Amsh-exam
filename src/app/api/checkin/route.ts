import { NextResponse } from "next/server";
import { all, one, run } from "@/lib/db";
import { handleError, ok, readJsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** POST /api/checkin — employee submits their name, creates a PENDING check-in */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await readJsonBody(request)) as Record<string, unknown> | null;
    const name = (body?.name ?? "").toString().trim();
    if (!name || name.length < 2) {
      throw new AppError("Please enter your full name (at least 2 characters).", 400, "VALIDATION");
    }
    if (name.length > 120) {
      throw new AppError("Name is too long.", 400, "VALIDATION");
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    run(
      `INSERT INTO "CheckIn" ("id","employeeName","status","checkedInAt") VALUES (?,?,?,?)`,
      [id, name, "PENDING", now],
    );

    return ok({ id, employeeName: name, status: "PENDING", checkedInAt: now });
  } catch (error) {
    return handleError(error);
  }
}

/** GET /api/checkin?id=xxx — poll status of a check-in */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new AppError("Missing id.", 400, "VALIDATION");

    const row = one<{
      id: string;
      employeeName: string;
      status: string;
      checkedInAt: string;
      approvedAt: string | null;
    }>(
      `SELECT "id","employeeName","status","checkedInAt","approvedAt" FROM "CheckIn" WHERE "id" = ?`,
      [id],
    );

    if (!row) throw new AppError("Check-in not found.", 404, "NOT_FOUND");

    return ok(row);
  } catch (error) {
    return handleError(error);
  }
}
