import { NextResponse } from "next/server";
import { handleError, ok, readJsonBody } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { saveResponseSchema } from "@/lib/validation";
import { loadAttemptSession, saveResponse } from "@/server/attempts";

export const dynamic = "force-dynamic";

interface Context {
  params: { token: string };
}

/** Load the current state of an in-progress attempt. */
export async function GET(_request: Request, { params }: Context): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const session = loadAttemptSession(params.token, user.id);

    return ok({
      attemptToken: session.attempt.attemptToken,
      status: session.attempt.status,
      startedAt: session.attempt.startedAt,
      expiresAt: session.attempt.expiresAt,
      remainingSeconds: session.remainingSeconds,
      directionState: session.directionState,
      responses: session.responses,
      flags: session.flags,
      template: {
        name: session.template.name,
        slug: session.template.slug,
        durationMinutes: session.template.durationMinutes,
        negativeMarking: session.template.negativeMarking,
        passThresholdPercent: session.template.passThresholdPercent,
      },
      questions: session.questions,
    });
  } catch (error) {
    return handleError(error);
  }
}

/** Persist one answer (or flag) without leaving the exam. */
export async function PATCH(request: Request, { params }: Context): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = saveResponseSchema.parse(body);

    const state = saveResponse({
      token: params.token,
      userId: user.id,
      questionId: input.questionId,
      selectedIndices: input.selectedIndices,
      flagged: input.flagged,
      directionState: input.directionState,
    });

    return ok({
      questionId: input.questionId,
      selectedIndices: state.responses[input.questionId] ?? [],
      flagged: state.flags[input.questionId] ?? false,
    });
  } catch (error) {
    return handleError(error);
  }
}
