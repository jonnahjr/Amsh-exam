import { NextResponse } from "next/server";
import { created, handleError, readJsonBody } from "@/lib/http";
import { parseStringArray } from "@/lib/json";
import { requireUser } from "@/lib/auth";
import { startAttemptSchema } from "@/lib/validation";
import { startAttempt } from "@/server/attempts";
import { clientAddress, recordAudit } from "@/server/audit";
import { one } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = startAttemptSchema.parse(body);

    // Candidates (EMPLOYEE / STUDENT) must have an active APPROVED check-in to start an exam
    if (user.role === "EMPLOYEE" || user.role === "STUDENT") {
      const activeCheckin = await one<{ id: string }>(
        `SELECT "id" FROM "CheckIn"
         WHERE ("id" = ? OR LOWER("employeeName") = LOWER(?))
           AND "status" = 'APPROVED'
         ORDER BY "checkedInAt" DESC
         LIMIT 1`,
        [user.id, user.name ?? ""],
      );
      if (!activeCheckin) {
        throw new ForbiddenError(
          "Your check-in session has ended or been completed. Please check in at the desk to receive authorization for an exam.",
        );
      }
    }

    const attempt = await startAttempt({
      templateSlug: input.templateSlug,
      userId: user.id,
      allowUnpublished: user.role !== "STUDENT" && user.role !== "EMPLOYEE",
    });

    recordAudit({
      userId: user.id, action: "ATTEMPT_REQUESTED",
      entity: "ExamAttempt", entityId: attempt.id,
      details: { templateSlug: input.templateSlug },
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    return created({
      attemptToken: attempt.attemptToken,
      attemptId: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      questionCount: parseStringArray(attempt.selectedQuestionIds).length,
    });
  } catch (error) {
    return handleError(error);
  }
}