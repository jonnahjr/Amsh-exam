"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ParsedQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndices: number[];
  explanation?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

const SAMPLE_TEXT = `1. What is the primary purpose of an operating system?
A) Manage computer hardware and software resources*
B) Compile high-level programming languages
C) Design web pages and applications
D) Protect physical hardware from theft
Explanation: The OS acts as an intermediary between user applications and system hardware.

2. Which of the following are examples of relational databases?
A. PostgreSQL (correct)
B. MongoDB
C. MySQL (correct)
D. Redis
Answer: A, C

3. True or False: In JavaScript, typeof null returns 'object'.
A) True*
B) False
Answer: A
Explanation: This is a historical bug in JavaScript that was kept for backward compatibility.

4. What is the standard HTTP port for secure web traffic?
A) 80
B) 21
C) 443*
D) 8080
Answer: C`;

function parseBulkText(raw: string): ParsedQuestion[] {
  if (!raw.trim()) return [];

  // Split into potential question chunks (by double newline or question number markers)
  const lines = raw.split(/\r?\n/);
  const questions: ParsedQuestion[] = [];

  let currentText = "";
  let currentOptions: string[] = [];
  let currentCorrect: number[] = [];
  let currentExplanation = "";
  let isParsingQuestion = false;

  function finalizeQuestion() {
    const trimmed = currentText.trim();
    if (trimmed && currentOptions.length >= 2) {
      questions.push({
        id: `q-${questions.length + 1}-${Date.now()}`,
        questionText: trimmed,
        options: [...currentOptions],
        correctOptionIndices: [...currentCorrect],
        explanation: currentExplanation.trim() || undefined,
        difficulty: "MEDIUM",
      });
    }
    currentText = "";
    currentOptions = [];
    currentCorrect = [];
    currentExplanation = "";
    isParsingQuestion = false;
  }

  const optionRegex = /^([A-Ha-h0-9]+)[\.\)\-\:]\s*(.+)$/;
  const answerLineRegex = /^(?:answer|ans|correct(?:\s*answer)?)\s*[:\-\=]\s*(.+)$/i;
  const explanationRegex = /^(?:explanation|explain|note)\s*[:\-\=]\s*(.+)$/i;
  const questionNumberRegex = /^(?:(?:Q|Question)\s*[:\.]?\s*\d+|\d+[\.\)\:])\s*(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line is an Answer declaration (e.g. Answer: A, B or Answer: 1)
    const ansMatch = line.match(answerLineRegex);
    if (ansMatch) {
      const ansPart = ansMatch[1].trim();
      // Match letters like A, B, C or numbers
      const letters = ansPart.match(/[A-Ha-h]|\d+/g) || [];
      for (const item of letters) {
        let idx = -1;
        if (/^[A-Ha-h]$/i.test(item)) {
          idx = item.toUpperCase().charCodeAt(0) - 65;
        } else if (/^\d+$/.test(item)) {
          idx = parseInt(item, 10) - 1;
        }
        if (idx >= 0 && idx < currentOptions.length && !currentCorrect.includes(idx)) {
          currentCorrect.push(idx);
        }
      }
      continue;
    }

    // Check if line is an Explanation
    const expMatch = line.match(explanationRegex);
    if (expMatch) {
      currentExplanation = expMatch[1];
      continue;
    }

    // Check if line is an Option (e.g. A) Option text or A. Option text)
    const optMatch = line.match(optionRegex);
    if (optMatch && (isParsingQuestion || currentText.length > 0)) {
      let optText = optMatch[2].trim();
      let isCorrect = false;

      // Check for inline answer marks: * at start or end, (correct), [correct]
      if (optText.endsWith("*") || optText.startsWith("*")) {
        isCorrect = true;
        optText = optText.replace(/^\*+|\*+$/g, "").trim();
      }
      if (/\((?:correct|answer)\)/i.test(optText)) {
        isCorrect = true;
        optText = optText.replace(/\((?:correct|answer)\)/gi, "").trim();
      }
      if (/\[(?:correct|answer)\]/i.test(optText)) {
        isCorrect = true;
        optText = optText.replace(/\[(?:correct|answer)\]/gi, "").trim();
      }

      const optIndex = currentOptions.length;
      currentOptions.push(optText);
      if (isCorrect && !currentCorrect.includes(optIndex)) {
        currentCorrect.push(optIndex);
      }
      continue;
    }

    // Check if line starts a new question number (e.g. 1. or Q1:)
    const qNumMatch = line.match(questionNumberRegex);
    if (qNumMatch) {
      if (currentText && currentOptions.length >= 2) {
        finalizeQuestion();
      }
      isParsingQuestion = true;
      currentText = qNumMatch[1] || line;
      continue;
    }

    // If options already started and we see text that isn't an option or answer, maybe it's a new question
    if (currentOptions.length >= 2 && !ansMatch && !expMatch && !optMatch) {
      finalizeQuestion();
      isParsingQuestion = true;
      currentText = line;
      continue;
    }

    // Append to current question text
    if (!isParsingQuestion && currentOptions.length === 0) {
      isParsingQuestion = true;
      currentText = line;
    } else if (isParsingQuestion && currentOptions.length === 0) {
      currentText += (currentText ? " " : "") + line;
    }
  }

  // Finalize last question
  finalizeQuestion();

  return questions;
}

export default function BulkExamPage() {
  const router = useRouter();
  const [examName, setExamName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passThresholdPercent, setPassThresholdPercent] = useState(70);
  const [rawText, setRawText] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ slug: string; name: string; count: number } | null>(null);

  function handleParse(textToParse: string) {
    const parsed = parseBulkText(textToParse);
    setQuestions(parsed);
    setError("");
  }

  function handleTextChange(val: string) {
    setRawText(val);
    handleParse(val);
  }

  function loadSample() {
    setExamName("AMSH General Knowledge & Technical Exam");
    setDescription("Evaluation test assessing general technical competencies and best practices.");
    setDurationMinutes(30);
    setPassThresholdPercent(75);
    setRawText(SAMPLE_TEXT);
    handleParse(SAMPLE_TEXT);
  }

  function toggleCorrect(qIndex: number, optIndex: number) {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = { ...copy[qIndex] };
      const current = q.correctOptionIndices;
      if (current.includes(optIndex)) {
        q.correctOptionIndices = current.filter((idx) => idx !== optIndex);
      } else {
        q.correctOptionIndices = [...current, optIndex];
      }
      copy[qIndex] = q;
      return copy;
    });
  }

  const readyQuestionsCount = useMemo(() => {
    return questions.filter((q) => q.correctOptionIndices.length > 0 && q.options.length >= 2).length;
  }, [questions]);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (!examName.trim()) {
      setError("Please specify an Exam Title.");
      return;
    }

    if (questions.length === 0) {
      setError("Please paste questions in the box below.");
      return;
    }

    const missingAnswers = questions.findIndex((q) => q.correctOptionIndices.length === 0);
    if (missingAnswers !== -1) {
      setError(`Question ${missingAnswers + 1} does not have a correct answer selected. Click on an option in the preview to mark it correct.`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/exams/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examName: examName.trim(),
          description: description.trim(),
          durationMinutes: Number(durationMinutes),
          passThresholdPercent: Number(passThresholdPercent),
          questions: questions.map((q) => ({
            questionText: q.questionText,
            options: q.options,
            correctOptionIndices: q.correctOptionIndices,
            explanation: q.explanation,
            difficulty: q.difficulty,
            marks: 1,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Failed to create exam.");
        return;
      }

      setSuccess({
        slug: data.data.exam.slug,
        name: data.data.exam.name,
        count: data.data.exam.totalQuestions,
      });

      // Clear input on success
      setRawText("");
      setQuestions([]);
    } catch {
      setError("Network error while creating exam. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 60 }}>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge badge-accent">Admin Feature</span>
            <span className="small muted">Bulk Creation</span>
          </div>
          <h1 style={{ marginTop: 6 }}>Bulk Add Exam & Questions</h1>
          <p>
            Copy and paste entire exams with questions and answers directly into the box. Questions will be parsed and created in one click.
          </p>
        </div>
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadSample}>
            ⚡ Load Sample Exam
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 8px", color: "var(--success)" }}>✓ Exam Created Successfully!</h3>
          <p style={{ margin: 0 }}>
            <strong>{success.name}</strong> was created with <strong>{success.count} questions</strong>.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <Link href={`/exams/${success.slug}`} className="btn btn-primary btn-sm">
              View Exam Details →
            </Link>
            <Link href="/exams" className="btn btn-sm">
              Browse All Exams
            </Link>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handlePublish} className="stack">
        {/* Step 1: Exam Settings */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>1. Exam Details</h3>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="exam-name">Exam Title *</label>
              <input
                id="exam-name"
                type="text"
                required
                placeholder="e.g. Employee Security & Compliance Exam"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="exam-desc">Description (optional)</label>
              <input
                id="exam-desc"
                type="text"
                placeholder="e.g. Annual employee assessment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="duration">Duration (Minutes)</label>
              <input
                id="duration"
                type="number"
                min={1}
                max={360}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="pass">Passing Score (%)</label>
              <input
                id="pass"
                type="number"
                min={0}
                max={100}
                value={passThresholdPercent}
                onChange={(e) => setPassThresholdPercent(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Step 2: Copy-Paste Box */}
        <div className="card">
          <div className="row-between" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>2. Copy & Paste Questions & Answers</h3>
            <span className="small muted">
              Supports: <code>1. Question</code>, <code>A) Option*</code>, <code>Answer: B</code>, etc.
            </span>
          </div>

          <p className="small muted" style={{ marginTop: 0, marginBottom: 14 }}>
            Mark correct answers using an asterisk (e.g. <code>B) Paris*</code>), or with an <code>Answer: B</code> line below the options.
          </p>

          <div className="field">
            <textarea
              rows={14}
              className="mono"
              placeholder={`1. What is the capital of France?
A) London
B) Paris*
C) Berlin
D) Rome
Answer: B
Explanation: Paris is the capital and largest city of France.`}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              style={{ fontSize: "0.9rem", lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* Step 3: Live Preview */}
        {questions.length > 0 && (
          <div className="card">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>3. Live Preview & Verification</h3>
                <p className="small muted" style={{ margin: "4px 0 0" }}>
                  Review parsed questions. You can click any option to mark or unmark it as correct.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span className="badge badge-accent">
                  {questions.length} Question{questions.length === 1 ? "" : "s"} Detected
                </span>
                {readyQuestionsCount === questions.length ? (
                  <span className="badge badge-success">All Validated ✓</span>
                ) : (
                  <span className="badge badge-warning">
                    {questions.length - readyQuestionsCount} Missing Answer
                  </span>
                )}
              </div>
            </div>

            <div className="stack" style={{ gap: 16 }}>
              {questions.map((q, qIndex) => {
                const hasCorrect = q.correctOptionIndices.length > 0;
                return (
                  <div
                    key={q.id}
                    style={{
                      background: "var(--surface-alt)",
                      border: `1px solid ${hasCorrect ? "var(--border)" : "var(--danger-border)"}`,
                      borderRadius: 12,
                      padding: 18,
                    }}
                  >
                    <div className="row-between" style={{ marginBottom: 10 }}>
                      <strong style={{ fontSize: "1rem", color: "var(--text)" }}>
                        {qIndex + 1}. {q.questionText}
                      </strong>
                      <span className="badge" style={{ fontSize: "0.75rem" }}>
                        {q.correctOptionIndices.length > 1 ? "Multiple Choice" : "Single Choice"}
                      </span>
                    </div>

                    <div className="stack" style={{ gap: 6, margin: "12px 0" }}>
                      {q.options.map((opt, optIndex) => {
                        const letter = String.fromCharCode(65 + optIndex);
                        const isCorrect = q.correctOptionIndices.includes(optIndex);
                        return (
                          <div
                            key={optIndex}
                            onClick={() => toggleCorrect(qIndex, optIndex)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "8px 12px",
                              borderRadius: 8,
                              cursor: "pointer",
                              background: isCorrect ? "var(--success-soft)" : "var(--surface)",
                              border: `1px solid ${isCorrect ? "var(--success-border)" : "var(--border)"}`,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                color: isCorrect ? "var(--success)" : "var(--text-muted)",
                                width: 20,
                              }}
                            >
                              {letter}.
                            </span>
                            <span style={{ flex: 1, color: isCorrect ? "var(--text)" : "inherit" }}>
                              {opt}
                            </span>
                            {isCorrect && (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "var(--success)",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                }}
                              >
                                Correct Answer ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="small muted" style={{ marginTop: 8, fontStyle: "italic" }}>
                        💡 <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}

                    {!hasCorrect && (
                      <div style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 8 }}>
                        ⚠️ No correct answer selected. Click on the correct option above to select it.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || questions.length === 0}
            style={{ height: 46, padding: "0 28px", fontSize: "1rem" }}
          >
            {busy ? "Publishing Exam…" : `Publish Exam (${questions.length} Questions) →`}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setRawText("");
              setQuestions([]);
              setError("");
            }}
            disabled={busy}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
