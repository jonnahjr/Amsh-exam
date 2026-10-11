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

  return (
    <div
      className="review-item"
      style={{
        borderLeft: entry.isCorrect
          ? "4px solid var(--success)"
          : entry.isAnswered
          ? "4px solid var(--danger)"
          : "4px solid var(--text-faint)",
      }}
    >
      <div className="review-head">
        <div>
          <div className="question-number">Question {entry.position + 1}</div>
          <h3 style={{ fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.5, margin: "4px 0 12px" }}>
            {entry.questionText}
          </h3>
        </div>
        <div className="row" style={{ flex: "none", gap: 6 }}>
          <DifficultyBadge difficulty={entry.difficulty} />
          <span
            className={`badge ${
              entry.isCorrect
                ? "badge-published"
                : entry.isAnswered
                ? "badge-fail"
                : "badge-draft"
            }`}
          >
            {status}
          </span>
          <span className="badge">
            {formatMarks(entry.awardedMarks)} / {formatMarks(entry.maxMarks)}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {entry.options.map((option, index) => {
          const isCorrect = entry.correctIndices.includes(index);
          const wasSelected = entry.selectedIndices.includes(index);

          let borderColor = "var(--border)";
          let bg = "var(--surface-alt)";
          let indicatorBadge = null;

          if (isCorrect && wasSelected) {
            borderColor = "var(--success)";
            bg = "rgba(52,211,153,0.12)";
            indicatorBadge = (
              <span className="badge badge-published" style={{ fontSize: "0.75rem" }}>
                ✓ Your Answer (Correct)
              </span>
            );
          } else if (isCorrect && !wasSelected) {
            borderColor = "var(--success)";
            bg = "rgba(52,211,153,0.08)";
            indicatorBadge = (
              <span className="badge badge-published" style={{ fontSize: "0.75rem" }}>
                ✓ Correct Answer
              </span>
            );
          } else if (!isCorrect && wasSelected) {
            borderColor = "var(--danger)";
            bg = "rgba(248,113,113,0.12)";
            indicatorBadge = (
              <span className="badge badge-fail" style={{ fontSize: "0.75rem" }}>
                ✕ Your Choice (Incorrect)
              </span>
            );
          }

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 8,
                border: `1.5px solid ${borderColor}`,
                background: bg,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  background: isCorrect ? "var(--success)" : wasSelected ? "var(--danger)" : "var(--surface)",
                  color: isCorrect || wasSelected ? "#fff" : "var(--text-muted)",
                }}
              >
                {OPTION_LETTERS[index] ?? "?"}
              </span>
              <span style={{ flex: 1, fontSize: "0.92rem", color: "var(--text)" }}>{option}</span>
              {indicatorBadge}
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
