import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { findAttemptByToken, loadAttemptSession } from "@/server/attempts";
import { findResultIdByAttemptToken } from "@/server/results";
import { ExamRunner } from "@/components/ExamRunner";

export const dynamic = "force-dynamic";

/** Live exam view. There is no site navigation here by design. */
export default async function AttemptPage({ params }: { params: { token: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // A finished attempt should land on its result, not on a dead exam screen.
  const existing = findAttemptByToken(params.token);
  if (existing && existing.userId === user.id && existing.status !== "ACTIVE") {
    const resultId = findResultIdByAttemptToken(params.token);
    if (resultId) redirect(`/results/${resultId}`);
  }

  let session;
  try {
    session = loadAttemptSession(params.token, user.id);
  } catch (error) {
    if (error instanceof AppError) {
      const resultId = findResultIdByAttemptToken(params.token);
      if (resultId) redirect(`/results/${resultId}`);

      return (
        <div className="auth-shell">
          <div className="auth-card">
            <h1>Exam unavailable</h1>
            <div className="alert alert-error">{error.message}</div>
            <Link className="btn btn-primary btn-block" href="/exams">
              Back to exams
            </Link>
          </div>
        </div>
      );
    }
    throw error;
  }

  return (
    <ExamRunner
      token={session.attempt.attemptToken}
      examName={session.template.name}
      negativeMarking={session.template.negativeMarking}
      passThresholdPercent={session.template.passThresholdPercent}
      initialRemainingSeconds={session.remainingSeconds}
      questions={session.questions}
      initialResponses={session.responses}
      initialFlags={session.flags}
    />
  );
}
