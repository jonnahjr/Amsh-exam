import { NextResponse } from "next/server";
import { created, handleError, readJsonBody } from "@/lib/http";
import { parseStringArray } from "@/lib/json";
import { requireUser } from "@/lib/auth";
import { startAttemptSchema } from "@/lib/validation";
import { startAttempt } from "@/server/attempts";
import { clientAddress, recordAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = startAttemptSchema.parse(body);

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