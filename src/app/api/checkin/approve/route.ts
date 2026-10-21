import { NextResponse } from "next/server";
import { one, run } from "@/lib/db";
import { handleError, ok, readJsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { pauseM100CheckIn, resumeM100CheckIn, terminateM100CheckIn } from "@/server/m100";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const admin = await requireRole("ADMINISTRATOR", "INSTRUCTOR");
    const body = (await readJsonBody(request)) as Record<string, unknown> | null;
    const id = (body?.id ?? "").toString().trim();
    const action = (body?.action ?? "approve").toString();

    if (!id) throw new AppError("Missing check-in id.", 400, "VALIDATION");
    if (!["approve", "reject", "terminate", "pause", "resume"].includes(action)) {
      throw new AppError(
        "Action must be 'approve', 'reject', 'terminate', 'pause', or 'resume'.",
        400,
        "VALIDATION",
      );
    }

    const actor = admin.name ?? admin.email;

    // Terminating an M100 auto-approved session revokes access immediately.
    if (action === "terminate") {
      return ok(await terminateM100CheckIn(id, actor));
    }

    // Pausing freezes the candidate's name, device address, and account until
    // an administrator resumes them.
    if (action === "pause") {
      return ok(await pauseM100CheckIn(id, actor));
    }

    if (action === "resume") {
      return ok(await resumeM100CheckIn(id, actor));
    }

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