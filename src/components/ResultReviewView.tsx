"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OPTION_LETTERS } from "@/components/review-utils";
import type { AnswerReviewEntry, ExamTemplateRow, ResultRow } from "@/types";

interface ResultReviewViewProps {
  result: ResultRow;
  template: ExamTemplateRow;
  review: AnswerReviewEntry[];
  submittedAtFormatted: string;
  durationFormatted: string;
  /** When set, the viewer is returned to check-in this many seconds after landing. */
  autoReturnSeconds?: number;
  /** Overrides the Retake destination (e.g. students must re-check-in first). */
  retakeHref?: string;
  /** Hides the Retake action entirely (e.g. on the result of a fresh submission). */
  retakeHidden?: boolean;
}

type FilterType = "all" | "incorrect" | "correct" | "unanswered";

export function ResultReviewView({
  result,
  template,
  review,
  submittedAtFormatted,
  durationFormatted,
  autoReturnSeconds,
  retakeHref,
  retakeHidden = false,
}: ResultReviewViewProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [showMatrix, setShowMatrix] = useState(true);
  const [returnIn, setReturnIn] = useState(autoReturnSeconds ?? 0);

  // Auto-return to check-in: count down once on landing, then redirect.
  useEffect(() => {
    if (!autoReturnSeconds) return;
    const interval = window.setInterval(() => {
      setReturnIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [autoReturnSeconds]);

  useEffect(() => {
    if (!autoReturnSeconds || returnIn > 0) return;
    window.location.href = "/checkin";
  }, [autoReturnSeconds, returnIn]);

  // Apply white theme class to body while on this page
  useEffect(() => {
    document.body.classList.add("white-bg-mode");
    return () => {
      document.body.classList.remove("white-bg-mode");
    };
  }, []);

  const passed = result.passStatus === "PASS";
  const passThreshold = template.passThresholdPercent ?? 70;

  // Filtered review questions
  const filteredReview = useMemo(() => {
    return review.filter((entry) => {
      if (filter === "incorrect" && (entry.isCorrect || !entry.isAnswered)) return false;
      if (filter === "correct" && !entry.isCorrect) return false;
      if (filter === "unanswered" && entry.isAnswered) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesText = entry.questionText.toLowerCase().includes(q);
        const matchesOption = entry.options.some((opt) => opt.toLowerCase().includes(q));
        const matchesNum = String(entry.position + 1) === q.replace("#", "").trim();
        if (!matchesText && !matchesOption && !matchesNum) return false;
      }

      return true;
    });
  }, [review, filter, search]);

  const scrollToQuestion = (position: number) => {
    const el = document.getElementById(`review-question-${position}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-pulse");
      setTimeout(() => el.classList.remove("highlight-pulse"), 1500);
    }
  };

  return (
    <div className="results-white-theme">
      {/* Top breadcrumb & Actions */}
      <div className="res-topbar">
        <Link href="/results" className="res-back-link">
          <span style={{ fontSize: "1.1rem" }}>←</span>
          <span>All results</span>
        </Link>

        <div className="res-top-actions">
          <button
            type="button"
            className="res-btn-secondary"
            onClick={() => window.print()}
            title="Print or save as PDF"
          >
            <span>🖨</span> Print / PDF
          </button>
          {/* No retake offer on the result of a fresh submission: the candidate
              must go back to check-in and be re-approved by the desk. */}
          {!retakeHidden && (
            <Link href={retakeHref ?? `/exams/${template.slug}`} className="res-btn-primary">
              Retake Exam →
            </Link>
          )}
        </div>
      </div>

      {/* Auto-return banner: send candidates back to check-in 60s after submitting */}
      {autoReturnSeconds !== undefined && (
        <div className="res-return-banner" role="status">
          <strong>
            {returnIn > 0
              ? `Back to check-in in ${returnIn}s`
              : "Returning to check-in…"}
          </strong>
          {returnIn > 0 && (
            <button type="button" className="res-btn-ghost-sm" onClick={() => setReturnIn(0)}>
              Return now →
            </button>
          )}
        </div>
      )}

      {/* Main Header */}
      <div className="res-header">
        <div>
          <h1 className="res-title">{template.name}</h1>
          <p className="res-subtitle">
            Submitted {submittedAtFormatted} · Completed in {durationFormatted} · Passing threshold:{" "}
            <strong>{passThreshold}%</strong>
          </p>
        </div>

        <div className="res-badge-outcome">
          {passed ? (
            <span className="res-pill res-pill-pass">
              <span className="res-pill-dot" /> Passed
            </span>
          ) : (
            <span className="res-pill res-pill-fail">
              <span className="res-pill-dot" /> Not passed
            </span>
          )}
        </div>
      </div>

      {/* Scorecard Hero */}
      <div className="res-scorecard">
        <div className="res-score-main">
          <span className="res-score-label">Your Score</span>
          <div className={`res-score-value ${passed ? "res-text-pass" : "res-text-fail"}`}>
            {result.percentage}%
          </div>
          <div className="res-score-marks">
            <strong>{result.earnedMarks}</strong> of <strong>{result.maxMarks}</strong> marks earned
          </div>

          {/* Minimal Progress Bar */}
          <div className="res-progress-wrap" title={`Score: ${result.percentage}% (Pass mark: ${passThreshold}%)`}>
            <div
              className={`res-progress-bar ${passed ? "res-bar-pass" : "res-bar-fail"}`}
              style={{ width: `${Math.min(100, Math.max(0, result.percentage))}%` }}
            />
            {/* Pass mark indicator notch */}
            <div
              className="res-pass-marker"
              style={{ left: `${passThreshold}%` }}
              title={`Pass Mark: ${passThreshold}%`}
            >
              <span className="res-pass-marker-label">Pass {passThreshold}%</span>
            </div>
          </div>
        </div>

        {/* 4 Stats Metric Tiles */}
        <div className="res-stats-grid">
          <div className="res-stat-card res-stat-correct">
            <div className="res-stat-num">{result.correctAnswers}</div>
            <div className="res-stat-text">Correct</div>
          </div>

          <div className="res-stat-card res-stat-incorrect">
            <div className="res-stat-num">{result.incorrectAnswers}</div>
            <div className="res-stat-text">Incorrect</div>
          </div>

          <div className="res-stat-card res-stat-unanswered">
            <div className="res-stat-num">{result.unansweredQuestions}</div>
            <div className="res-stat-text">Unanswered</div>
          </div>

          <div className="res-stat-card res-stat-total">
            <div className="res-stat-num">{result.totalQuestions}</div>
            <div className="res-stat-text">Questions</div>
          </div>
        </div>
      </div>

      {/* Question Matrix Drawer / Navigator */}
      <div className="res-matrix-card">
        <div className="res-matrix-header">
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>
              Question Matrix
            </span>
            <span className="res-matrix-count">
              {review.length} Questions
            </span>
          </div>

          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            {/* Legend */}
            <div className="res-legend">
              <span className="res-legend-item">
                <span className="res-legend-dot res-dot-correct" /> Correct ({result.correctAnswers})
              </span>
              <span className="res-legend-item">
                <span className="res-legend-dot res-dot-incorrect" /> Incorrect ({result.incorrectAnswers})
              </span>
              {result.unansweredQuestions > 0 && (
                <span className="res-legend-item">
                  <span className="res-legend-dot res-dot-unanswered" /> Unanswered ({result.unansweredQuestions})
                </span>
              )}
            </div>

            <button
              type="button"
              className="res-btn-ghost-sm"
              onClick={() => setShowMatrix((v) => !v)}
            >
              {showMatrix ? "Hide Matrix ▲" : "Show Matrix ▼"}
            </button>
          </div>
        </div>

        {showMatrix && (
          <div className="res-matrix-grid">
            {review.map((item) => {
              const statusClass = !item.isAnswered
                ? "res-mat-unanswered"
                : item.isCorrect
                ? "res-mat-correct"
                : "res-mat-incorrect";

              return (
                <button
                  key={item.position}
                  type="button"
                  className={`res-mat-btn ${statusClass}`}
                  onClick={() => scrollToQuestion(item.position)}
                  title={`Question ${item.position + 1}: ${
                    !item.isAnswered ? "Unanswered" : item.isCorrect ? "Correct" : "Incorrect"
                  }`}
                >
                  {item.position + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Toolbar with Filters & Search */}
      <div className="res-review-toolbar">
        <div className="res-filter-tabs">
          <button
            type="button"
            className={`res-tab ${filter === "all" ? "res-tab-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Questions ({review.length})
          </button>
          <button
            type="button"
            className={`res-tab ${filter === "incorrect" ? "res-tab-active" : ""}`}
            onClick={() => setFilter("incorrect")}
          >
            <span className="res-legend-dot res-dot-incorrect" />
            Incorrect ({result.incorrectAnswers})
          </button>
          <button
            type="button"
            className={`res-tab ${filter === "correct" ? "res-tab-active" : ""}`}
            onClick={() => setFilter("correct")}
          >
            <span className="res-legend-dot res-dot-correct" />
            Correct ({result.correctAnswers})
          </button>
          {result.unansweredQuestions > 0 && (
            <button
              type="button"
              className={`res-tab ${filter === "unanswered" ? "res-tab-active" : ""}`}
              onClick={() => setFilter("unanswered")}
            >
              <span className="res-legend-dot res-dot-unanswered" />
              Unanswered ({result.unansweredQuestions})
            </button>
          )}
        </div>

        <div className="res-search-wrap">
          <input
            type="text"
            className="res-search-input"
            placeholder="Search questions or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="res-search-clear"
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Answer Review Section */}
      <div className="res-section-header">
        <h2 className="res-section-title">Answer Review</h2>
        <span className="res-section-meta">
          Showing {filteredReview.length} of {review.length} questions
        </span>
      </div>

      {filteredReview.length === 0 ? (
        <div className="res-empty">
          <p>No questions match your current filter or search criteria.</p>
          <button
            type="button"
            className="res-btn-secondary"
            style={{ marginTop: 12 }}
            onClick={() => {
              setFilter("all");
              setSearch("");
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="res-questions-stack">
          {filteredReview.map((entry) => {
            const isCorrect = entry.isCorrect;
            const isAnswered = entry.isAnswered;
            const status = !isAnswered ? "Unanswered" : isCorrect ? "Correct" : "Incorrect";

            return (
              <div
                key={entry.position}
                id={`review-question-${entry.position}`}
                className={`res-qcard ${
                  isCorrect
                    ? "res-qcard-correct"
                    : isAnswered
                    ? "res-qcard-incorrect"
                    : "res-qcard-unanswered"
                }`}
              >
                {/* Header row of card */}
                <div className="res-qcard-head">
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <span className="res-qcard-num">
                      Question {entry.position + 1} of {review.length}
                    </span>
                    <span className={`res-badge-diff res-diff-${entry.difficulty.toLowerCase()}`}>
                      {entry.difficulty}
                    </span>
                  </div>

                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <span
                      className={`res-badge-verdict ${
                        isCorrect
                          ? "res-verdict-correct"
                          : isAnswered
                          ? "res-verdict-incorrect"
                          : "res-verdict-unanswered"
                      }`}
                    >
                      {isCorrect ? "✓ Correct" : isAnswered ? "✕ Incorrect" : "— Unanswered"}
                    </span>
                    <span className="res-badge-marks">
                      {entry.awardedMarks} / {entry.maxMarks} mark
                    </span>
                  </div>
                </div>

                {/* Question title */}
                <h3 className="res-qcard-text">{entry.questionText}</h3>

                {/* Options list */}
                <div className="res-options-list">
                  {entry.options.map((option, idx) => {
                    const isOptionCorrect = entry.correctIndices.includes(idx);
                    const wasSelected = entry.selectedIndices.includes(idx);

                    let rowClass = "res-opt-neutral";
                    let badge = null;

                    if (isOptionCorrect && wasSelected) {
                      rowClass = "res-opt-correct-user";
                      badge = (
                        <span className="res-opt-badge res-opt-badge-success">
                          ✓ Your Answer (Correct)
                        </span>
                      );
                    } else if (isOptionCorrect && !wasSelected) {
                      rowClass = "res-opt-correct-target";
                      badge = (
                        <span className="res-opt-badge res-opt-badge-success">
                          ✓ Correct Answer
                        </span>
                      );
                    } else if (!isOptionCorrect && wasSelected) {
                      rowClass = "res-opt-incorrect-user";
                      badge = (
                        <span className="res-opt-badge res-opt-badge-danger">
                          ✕ Your Choice (Incorrect)
                        </span>
                      );
                    }

                    return (
                      <div key={idx} className={`res-opt-row ${rowClass}`}>
                        <div
                          className={`res-opt-letter ${
                            isOptionCorrect
                              ? "res-let-correct"
                              : wasSelected
                              ? "res-let-incorrect"
                              : "res-let-neutral"
                          }`}
                        >
                          {OPTION_LETTERS[idx] ?? "?"}
                        </div>
                        <div className="res-opt-text">{option}</div>
                        {badge && <div className="res-opt-badge-wrap">{badge}</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {entry.explanation && (
                  <div className="res-explanation-box">
                    <span className="res-explanation-icon">💡</span>
                    <div>
                      <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>Explanation: </strong>
                      <span style={{ color: "#334155", fontSize: "0.88rem", lineHeight: 1.5 }}>
                        {entry.explanation}
                      </span>
                    </div>
                  </div>
                )}

                {/* Unanswered note */}
                {!entry.isAnswered && (
                  <p className="res-hint">
                    You did not answer this question. Unanswered questions do not lose marks.
                  </p>
                )}

                {/* Negative marking note */}
                {entry.isAnswered && !entry.isCorrect && entry.awardedMarks < 0 && (
                  <p className="res-hint res-hint-warn">
                    Negative marking penalty applied: {entry.awardedMarks} marks.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
