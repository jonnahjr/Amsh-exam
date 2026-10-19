import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assertCanViewResult, findResultDetail } from "@/server/results";
import { formatDateTime, formatDurationSeconds } from "@/components/ui";
import { ResultReviewView } from "@/components/ResultReviewView";

export const dynamic = "force-dynamic";

export default async function ResultDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { return?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const detail = await findResultDetail(params.id);
  if (!detail) notFound();

  try {
    assertCanViewResult(detail, user);
  } catch (error) {
    if (error instanceof AppError && error.status === 403) {
      return (
        <div className="auth-shell">
          <div className="auth-card">
            <h1>Not available</h1>
            <div className="alert alert-error">{error.message}</div>
            <Link className="btn btn-primary btn-block" href="/results">
              Back to results
            </Link>
          </div>
        </div>
      );
    }
    throw error;
  }

  const { result, template, review } = detail;

  return (
    <ResultReviewView
      result={result}
      template={template}
      review={review}
      submittedAtFormatted={formatDateTime(result.submittedAt)}
      durationFormatted={formatDurationSeconds(result.durationSeconds)}
      // Fresh submissions ask the result view to send the candidate back to
      // check-in after one minute.
      autoReturnSeconds={searchParams.return ? 60 : undefined}
      // Students must pass the check-in desk again before retaking an exam.
      retakeHref={user.role === "STUDENT" ? "/checkin" : undefined}
      // A fresh submission cannot be retaken from here at all.
      retakeHidden={Boolean(searchParams.return)}
    />
  );
}
