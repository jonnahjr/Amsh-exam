import { NextResponse } from "next/server";
import { created, handleError, readJsonBody } from "@/lib/http";
import { parseStringArray } from "@/lib/json";
import { requireUser } from "@/lib/auth";
import { startAttemptSchema } from "@/lib/validation";
import { startAttempt } from "@/server/attempts";
import { clientAddress, recordAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

/**
 * Start an exam, or resume the caller's active attempt for the same template.
 *
 * The response deliberately omits the answer key: it is only released with the
 * result once the attempt is submitted.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = startAttemptSchema.parse(body);

    const attempt = startAttempt({
      templateSlug: input.templateSlug,
      userId: user.id,
      allowUnpublished: user.role !== "STUDENT",
    });

    recordAudit({
      userId: user.id,
      action: "ATTEMPT_REQUESTED",
      entity: "ExamAttempt",
      entityId: attempt.id,
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
