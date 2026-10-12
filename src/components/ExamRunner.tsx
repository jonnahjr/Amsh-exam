"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, errorMessages } from "@/lib/client";
import { OPTION_LETTERS } from "@/components/review-utils";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { AttemptQuestionView } from "@/types";


interface ExamRunnerProps {
  token: string;
  examName: string;
  negativeMarking: boolean;
  passThresholdPercent: number;
  initialRemainingSeconds: number;
  questions: AttemptQuestionView[];
  initialResponses: Record<string, number[]>;
  initialFlags: Record<string, boolean>;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Question types where more than one option may be chosen. */
function allowsMultiple(questionType: AttemptQuestionView["questionType"]): boolean {
  return questionType === "MULTIPLE_CHOICE" || questionType === "MATCHING";
}

export function ExamRunner({
  token,
  examName,
  negativeMarking,
  passThresholdPercent,
  initialRemainingSeconds,
  questions,
  initialResponses,
  initialFlags,
}: ExamRunnerProps) {
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number[]>>(initialResponses);
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);
  const [remaining, setRemaining] = useState(initialRemainingSeconds);
  const [saveError, setSaveError] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const question = questions[index];
  const answeredCount = useMemo(
    () => questions.filter((entry) => (responses[entry.questionId]?.length ?? 0) > 0).length,
    [questions, responses],
  );
  const flaggedCount = useMemo(
    () => questions.filter((entry) => flags[entry.questionId]).length,
    [questions, flags],
  );

  // ------------------------------------------------------------- submit ----
  const submitExam = useCallback(
    async (reason: "manual" | "timeout") => {
      setSubmitting(true);
      setSubmitError([]);
      try {
        const result = await apiRequest<{ resultId: string }>(
          `/api/attempts/${token}/submit`,
          { method: "POST" },
        );
        router.push(`/results/${result.resultId}`);
      } catch (error) {
        // A failure here is surfaced with a retry button rather than leaving
        // the candidate staring at a frozen timer.
        const messages = errorMessages(error);
        setSubmitError(reason === "timeout" ? ["Time ran out.", ...messages] : messages);
        setSubmitting(false);
      }
    },
    [router, token],
  );

  // Keep the latest submit in a ref so the timer effect never needs to
  // re-subscribe and cannot fire on a stale closure.
  const submitRef = useRef(submitExam);
  useEffect(() => {
    submitRef.current = submitExam;
  }, [submitExam]);

  const autoSubmitted = useRef(false);

  // -------------------------------------------------------------- timer ----
  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining((current) => (current <= 0 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remaining > 0 || autoSubmitted.current) return;
    autoSubmitted.current = true;
    void submitRef.current("timeout");
  }, [remaining]);

  // Warn before closing the tab mid-exam.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (submitting) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [submitting]);

  // -------------------------------------------------------------- saving ---
  const persist = useCallback(
    async (questionId: string, selectedIndices: number[], flagged?: boolean) => {
      try {
        await apiRequest(`/api/attempts/${token}`, {
          method: "PATCH",
          body: { questionId, selectedIndices, flagged },
        });
        setSaveError([]);
      } catch (error) {
        setSaveError(errorMessages(error));
      }
    },
    [token],
  );

  function chooseOption(optionIndex: number) {
    if (!question) return;
    const qid = question.questionId;
    const current = responses[qid] ?? [];
    const isMulti = allowsMultiple(question.questionType);

    let next: number[];
    if (isMulti) {
      next = current.includes(optionIndex)
        ? current.filter((entry) => entry !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b);
    } else {
      next = [optionIndex];
    }

    // Update optimistically; the server is the source of truth on reload.
    setResponses((prev) => {
      const copy = { ...prev };
      if (next.length === 0) delete copy[qid];
      else copy[qid] = next;
      return copy;
    });

    void persist(qid, next);

    // In professional mock exam mode: automatically advance to the next question on single-choice!
    if (!isMulti && index < questions.length - 1) {
      setTimeout(() => {
        setIndex((curr) => Math.min(questions.length - 1, curr + 1));
      }, 240);
    }
  }

  function toggleFlag() {
    if (!question) return;
    const qid = question.questionId;
    const next = !flags[qid];
    setFlags((prev) => ({ ...prev, [qid]: next }));
    void persist(qid, responses[qid] ?? [], next);
  }

  if (!question) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>No questions</h1>
          <div className="alert alert-error">
            This attempt has no questions attached to it. Please contact your instructor.
          </div>
          <Link className="btn btn-primary btn-block" href="/exams">
            Back to exams
          </Link>
        </div>
      </div>
    );
  }

  const selected = responses[question.questionId] ?? [];
  const timerClass =
    remaining <= 30 ? "timer timer-critical" : remaining <= 120 ? "timer timer-warning" : "timer";
  const notAutoGradable = question.options.length === 0;

  return (
    <>
      <ConfirmModal
        open={confirmModal.open}
        title="Submit Exam"
        message={confirmModal.message}
        confirmLabel="Submit"
        cancelLabel="Go Back"
        onConfirm={() => {
          setConfirmModal({ open: false, message: "" });
          void submitExam("manual");
        }}
        onCancel={() => setConfirmModal({ open: false, message: "" })}
      />
      <div className="exam-topbar">
        <div className="exam-title">
          {examName}
          <small>{answeredCount} of {questions.length} answered</small>
        </div>

        <div className="spacer" />

        <div className={timerClass} title="Time remaining">
          {formatClock(remaining)}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (submitting) return;
            const unanswered = questions.length - answeredCount;
            const message =
              unanswered > 0
                ? `You still have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway?`
                : "Submit your exam for marking?";
            setConfirmModal({ open: true, message });
          }}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Submit exam"}
        </button>
      </div>

      <div className="exam-layout">
        <div>
          {saveError.length > 0 && (
            <div className="alert alert-error">
              <strong>Could not save your last answer.</strong>
              <ul>
                {saveError.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {submitError.length > 0 && (
            <div className="alert alert-error">
              <strong>{remaining <= 0 ? "Time is up." : "Submission failed."}</strong>
              <ul>
                {submitError.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => void submitExam("manual")}
              >
                Try submitting again
              </button>
            </div>
          )}

          <div className="question-panel">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <div className="question-number" style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
                Question {index + 1} of {questions.length}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className={`badge badge-${question.difficulty.toLowerCase()}`}>
                  {question.difficulty}
                </span>
                <span className="badge" style={{ fontWeight: 600 }}>
                  {question.marks} mark{question.marks === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  className={flags[question.questionId] ? "btn btn-sm btn-danger" : "btn btn-sm"}
                  onClick={toggleFlag}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  {flags[question.questionId] ? "⚑ Flagged" : "⚐ Flag for review"}
                </button>
              </div>
            </div>

            <div className="question-text" style={{ fontSize: "1.08rem", fontWeight: 500, lineHeight: 1.65, marginBottom: 26 }}>
              {question.questionText}
            </div>

            {allowsMultiple(question.questionType) && (
              <p className="field-hint" style={{ marginBottom: 14 }}>
                Select every correct answer. Partial answers score no marks.
              </p>
            )}

            {notAutoGradable ? (
              <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                This question type ({question.questionType}) is not auto-gradable and will be
                recorded as unanswered.
              </div>
            ) : (
              <div>
                {question.options.map((option, optionIndex) => {
                  const isSelected = selected.includes(optionIndex);
                  return (
                    <label
                      key={optionIndex}
                      className={`option${isSelected ? " option-selected" : ""}`}
                    >
                      <input
                        type={allowsMultiple(question.questionType) ? "checkbox" : "radio"}
                        name={`question-${question.questionId}`}
                        checked={isSelected}
                        onChange={() => chooseOption(optionIndex)}
                      />
                      <span className="option-key">{OPTION_LETTERS[optionIndex] ?? "?"}</span>
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="row-between" style={{ marginTop: 26, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
                disabled={index === 0}
              >
                ← Previous
              </button>

              {selected.length > 0 && !notAutoGradable && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => chooseOption(selected[0])}>
                  Clear answer
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIndex((current) => Math.min(questions.length - 1, current + 1))}
                disabled={index === questions.length - 1}
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        <aside className="palette">
          <div className="row-between" style={{ alignItems: "center" }}>
            <strong style={{ fontSize: "0.95rem", fontWeight: 700, letterSpacing: "-0.01em" }}>Question Matrix</strong>
            <span className="badge badge-accent" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              {answeredCount} / {questions.length}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14, marginBottom: 14 }}>
            <div style={{ background: "var(--surface-alt)", padding: "10px 12px", borderRadius: 8, textAlign: "center", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--success)" }}>{answeredCount}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Answered</div>
            </div>
            <div style={{ background: "var(--surface-alt)", padding: "10px 12px", borderRadius: 8, textAlign: "center", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-muted)" }}>{questions.length - answeredCount}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Remaining</div>
            </div>
          </div>

          <div className="palette-grid">
            {questions.map((entry, entryIndex) => {
              const isAnswered = (responses[entry.questionId]?.length ?? 0) > 0;
              const isCurrent = entryIndex === index;
              const isFlagged = flags[entry.questionId];

              const classes = ["palette-btn"];
              if (isAnswered) classes.push("palette-answered");
              if (isCurrent) classes.push("palette-current");
              if (isFlagged) classes.push("palette-flagged");

              return (
                <button
                  key={entry.questionId}
                  type="button"
                  className={classes.join(" ")}
                  onClick={() => setIndex(entryIndex)}
                  title={`Question ${entryIndex + 1}: ${isAnswered ? "Answered" : "Unanswered"}`}
                >
                  {entryIndex + 1}
                </button>
              );
            })}
          </div>

          <div className="legend" style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 16 }}>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: "var(--accent)", borderColor: "var(--accent)" }} />
              Answered (Shaded)
            </span>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: "#ffffff", borderColor: "var(--border)" }} />
              Unanswered (Not shaded)
            </span>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: "#ffffff", borderColor: "#000000", borderWidth: 2 }} />
              Current Question
            </span>
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: "var(--warning)", borderColor: "var(--warning)" }} />
              Flagged ({flaggedCount})
            </span>
          </div>

          <div className="field-hint" style={{ marginTop: 14, textAlign: "center", fontSize: "0.76rem" }}>
            Pass mark: <strong>{passThresholdPercent}%</strong> · Autosaved
          </div>
        </aside>
      </div>
    </>
  );
}
