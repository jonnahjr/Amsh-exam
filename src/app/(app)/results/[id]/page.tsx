import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assertCanViewResult, findResultDetail } from "@/server/results";
import {
  DifficultyBadge,
  PageHeader,
  PassBadge,
  Stat,
  formatDateTime,
  formatDurationSeconds,
  formatMarks,
} from "@/components/ui";
import { OPTION_LETTERS } from "@/components/review-utils";
import type { AnswerReviewEntry } from "@/types";

export const dynamic = "force-dynamic";

function ReviewCard({ entry }: { entry: AnswerReviewEntry }) {
  const status = !entry.isAnswered ? "Unanswered" : entry.isCorrect ? "Correct" : "Incorrect";
  const statusClass = !entry.isAnswered ? "" : entry.isCorrect ? "score-pass" : "score-fail";

  return (
    <div className="review-item">
      <div className="review-head">
        <div>
          <div className="question-number">Question {entry.position + 1}</div>
          <h3 style={{ fontWeight: 550, fontSize: "1.02rem", margin: 0 }} className="pre-wrap">
            {entry.questionText}
          </h3>
        </div>
        <div className="row" style={{ flex: "none" }}>
          <DifficultyBadge difficulty={entry.difficulty} />
          <span className={`badge ${entry.isCorrect ? "badge-pass" : entry.isAnswered ? "badge-fail" : ""}`}>
            {status}
          </span>
          <span className="badge">
            {formatMarks(entry.awardedMarks)} / {formatMarks(entry.maxMarks)}
          </span>
        </div>
      </div>

      <div>
        {entry.options.map((option, index) => {
          const isCorrect = entry.correctIndices.includes(index);
          const wasSelected = entry.selectedIndices.includes(index);
          const classes = ["review-option"];
          if (isCorrect) classes.push("option-correct");
          else if (wasSelected) classes.push("option-wrong");

          return (
            <div key={index} className={classes.join(" ")}>
              <span className="option-key">{OPTION_LETTERS[index] ?? "?"}</span>
              <span style={{ flex: 1 }}>{option}</span>
              <span className="small faint nowrap">
                {isCorrect && wasSelected && "correct · your answer"}
                {isCorrect && !wasSelected && "correct answer"}
                {!isCorrect && wasSelected && "your answer"}
              </span>
            </div>
          );
        })}
      </div>

      {entry.explanation && (
        <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 0 }}>
          <strong>Explanation:</strong> {entry.explanation}
        </div>
      )}

      {!entry.isAnswered && (
        <p className="field-hint" style={{ marginTop: 10, marginBottom: 0 }}>
          You did not answer this question. Unanswered questions never lose marks.
        </p>
      )}

      {entry.isAnswered && !entry.isCorrect && entry.awardedMarks < 0 && (
        <p className="field-hint" style={{ marginTop: 10, marginBottom: 0 }}>
          Negative marking applied: {formatMarks(entry.awardedMarks)} marks.
        </p>
      )}
    </div>
  );
}

export default async function ResultDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const detail = findResultDetail(params.id);
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

  const { result, review } = detail;
  const passed = result.passStatus === "PASS";

  return (
    <div className="stack">
      <div>
        <Link href="/results" className="small">
          ← All results
        </Link>
      </div>

      <PageHeader
        title={detail.template.name}
        description={`Submitted ${formatDateTime(result.submittedAt)} · completed in ${formatDurationSeconds(
          result.durationSeconds,
        )}`}
        actions={<PassBadge passStatus={result.passStatus} />}
      />

      <div className="result-hero">
        <div className="muted small">Your score</div>
        <div className={`result-score ${passed ? "score-pass" : "score-fail"}`}>
          {result.percentage}%
        </div>
        <div className="muted">
          {formatMarks(result.earnedMarks)} of {formatMarks(result.maxMarks)} marks
        </div>
      </div>

      <div className="grid">
        <Stat label="Correct" value={result.correctAnswers} />
        <Stat label="Incorrect" value={result.incorrectAnswers} />
        <Stat label="Unanswered" value={result.unansweredQuestions} />
        <Stat label="Questions" value={result.totalQuestions} />
      </div>

      {review.length === 0 ? (
        <div className="empty">
          <h3>No answer review stored</h3>
          <p className="muted">This result was recorded without a per-question breakdown.</p>
        </div>
      ) : (
        <section>
          <h2>Answer review</h2>
          <div className="stack">
            {review.map((entry) => (
              <ReviewCard key={`${entry.questionId}-${entry.position}`} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
