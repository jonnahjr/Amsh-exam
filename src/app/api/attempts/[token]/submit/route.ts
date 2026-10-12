import { NextResponse } from "next/server";
import { handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { submitAttempt } from "@/server/attempts";

export const dynamic = "force-dynamic";

interface Context { params: { token: string }; }

export async function POST(_request: Request, { params }: Context): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const result = await submitAttempt(params.token, user.id);
    return ok({
      resultId: result.id,
      totalQuestions: result.totalQuestions,
      correctAnswers: result.correctAnswers,
      incorrectAnswers: result.incorrectAnswers,
      unansweredQuestions: result.unansweredQuestions,
      earnedMarks: result.earnedMarks,
      maxMarks: result.maxMarks,
      percentage: result.percentage,
      passStatus: result.passStatus,
      durationSeconds: result.durationSeconds,
    });
  } catch (error) {
    return handleError(error);
  }
}