import { NextResponse } from "next/server";
import { one, run } from "@/lib/db";
import { handleError, ok, readJsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const admin = await requireRole("ADMINISTRATOR", "INSTRUCTOR");
    const body = (await readJsonBody(request)) as Record<string, unknown> | null;
    const id = (body?.id ?? "").toString().trim();
    const action = (body?.action ?? "approve").toString();

    if (!id) throw new AppError("Missing check-in id.", 400, "VALIDATION");
    if (!["approve", "reject"].includes(action)) throw new AppError("Action must be 'approve' or 'reject'.", 400, "VALIDATION");

    const row = await one<{ id: string; status: string }>(`SELECT "id","status" FROM "CheckIn" WHERE "id" = ?`, [id]);
    if (!row) throw new AppError("Check-in not found.", 404, "NOT_FOUND");
    if (row.status !== "PENDING") throw new AppError(`This check-in is already ${row.status}.`, 409, "CONFLICT");

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const now = new Date().toISOString();
    await run(`UPDATE "CheckIn" SET "status" = ?, "approvedAt" = ?, "approvedBy" = ? WHERE "id" = ?`, [newStatus, now, admin.name ?? admin.email, id]);
    return ok({ id, status: newStatus });
  } catch (error) {
    return handleError(error);
  }
}