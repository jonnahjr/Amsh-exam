import { randomUUID } from "node:crypto";
import { all, fromBool, one, run, transaction } from "@/lib/db";
import {
  parseFlagMap,
  parseIndexMap,
  parseOrderedIndexMap,
  parseStringArray,
  stringifyJson,
} from "@/lib/json";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/audit";
import {
  buildAnswerReview,
  buildOptionMapping,
  createRng,
  displayOptions,
  gradeAttempt,
  InsufficientQuestionsError,
  selectQuestions,
} from "@/server/exam-engine";
import { hydrateQuestion, previouslySeenQuestionIds, questionPoolForTemplate } from "@/server/questions";
import { findTemplateBySlug, findTemplateById } from "@/server/templates";
import type {
  AttemptQuestionView,
  AttemptStatus,
  ExamAttemptRow,
  ExamTemplate,
  Question,
  QuestionRow,
  ResultRow,
} from "@/types";

/** The full state of an in-progress exam, ready to render. */
export interface AttemptSession {
  attempt: ExamAttemptRow;
  template: ExamTemplate;
  questions: AttemptQuestionView[];
  responses: Record<string, number[]>;
  flags: Record<string, boolean>;
  directionState: "FORWARD" | "BACKWARD";
  remainingSeconds: number;
  expired: boolean;
}

const nowIso = (): string => new Date().toISOString();

export function findAttemptByToken(token: string): ExamAttemptRow | null {
  return one<ExamAttemptRow>('SELECT * FROM "ExamAttempt" WHERE "attemptToken" = ?', [token]) ?? null;
}

/** The caller's unsubmitted attempt for a template, if there is one. */
export function findActiveAttempt(userId: string, templateId: string): ExamAttemptRow | null {
  return (
    one<ExamAttemptRow>(
      `SELECT * FROM "ExamAttempt"
       WHERE "userId" = ? AND "templateId" = ? AND "status" = 'ACTIVE'
       ORDER BY "createdAt" DESC LIMIT 1`,
      [userId, templateId],
    ) ?? null
  );
}

/** Load questions by id, preserving the order of `ids`. */
function loadQuestionsInOrder(ids: string[]): Question[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = all<QuestionRow>(
    `SELECT * FROM "Question" WHERE "id" IN (${placeholders})`,
    ids,
  );
  const byId = new Map(rows.map((row) => [row.id, hydrateQuestion(row)]));
  return ids
    .map((id) => byId.get(id))
    .filter((question): question is Question => question !== undefined);
}

function remainingSecondsFor(attempt: ExamAttemptRow): number {
  if (!attempt.expiresAt) return 0;
  const remaining = Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(0, remaining);
}

function hasExpired(attempt: ExamAttemptRow): boolean {
  if (!attempt.expiresAt) return false;
  return new Date(attempt.expiresAt).getTime() <= Date.now();
}

/** Build the student-facing view: answers stripped, options in display order. */
function toAttemptQuestionViews(
  attempt: ExamAttemptRow,
  questions: Question[],
): AttemptQuestionView[] {
  // Order matters here: this maps display position -> canonical option index.
  const mapping = parseOrderedIndexMap(attempt.optionMapping);
  return questions.map((question, position) => ({
    questionId: question.id,
    position,
    questionText: question.questionText,
    questionType: question.questionType,
    difficulty: question.difficulty,
    options: displayOptions(question, mapping[question.id]),
    marks: question.marks,
  }));
}

// ----------------------------------------------------------------- start ----

export interface StartAttemptParams {
  templateSlug: string;
  userId: string;
  /** Instructors and admins may start unpublished templates. */
  allowUnpublished?: boolean;
  seed?: number;
}

/**
 * Start an exam, or resume the caller's existing active attempt.
 *
 * Resuming matters because the timer must not restart when a student reloads
 * the page or reopens the exam.
 */
export function startAttempt({
  templateSlug,
  userId,
  allowUnpublished = false,
  seed,
}: StartAttemptParams): ExamAttemptRow {
  const template = findTemplateBySlug(templateSlug);
  if (!template) throw new NotFoundError("That exam template does not exist.");
  if (!template.isPublic && !allowUnpublished) {
    throw new ForbiddenError("That exam template is not published yet.");
  }

  const existing = findActiveAttempt(userId, template.id);

  if (existing) {
    if (!hasExpired(existing)) return existing;

    // The clock ran out while the student was away. Close it out honestly
    // rather than silently granting a fresh timer on the old paper.
    const finished = submitAttempt(existing.attemptToken, userId, { allowExpired: true });
    recordAudit({
      userId,
      action: "ATTEMPT_EXPIRED",
      entity: "ExamAttempt",
      entityId: existing.id,
      details: { resultId: finished.id },
    });
  }

  const pool = questionPoolForTemplate(template);
  const rng = createRng(seed ?? Date.now());

  let selected: Question[];
  try {
    selected = selectQuestions({
      pool,
      template,
      previouslySeenIds: previouslySeenQuestionIds(userId, template.id),
      rng,
    });
  } catch (error) {
    if (error instanceof InsufficientQuestionsError) {
      throw new ConflictError(error.message, {
        requested: error.requested,
        available: error.available,
      });
    }
    throw error;
  }

  const optionMapping = buildOptionMapping(selected, template.randomizeOptions, rng);
  const id = randomUUID();
  const token = randomUUID();
  const startedAt = nowIso();
  const expiresAt = new Date(Date.now() + template.durationMinutes * 60_000).toISOString();

  transaction(() => {
    run(
      `INSERT INTO "ExamAttempt"
        ("id","attemptToken","templateId","userId","selectedQuestionIds","optionMapping","directionState",
         "flags","responses","previouslySeen","startedAt","expiresAt","submittedAt","completedAt","status",
         "startedByUserId","configSnapshot","createdAt","updatedAt")
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        token,
        template.id,
        userId,
        stringifyJson(selected.map((question) => question.id)),
        stringifyJson(optionMapping),
        "FORWARD",
        stringifyJson({}),
        stringifyJson({}),
        stringifyJson(previouslySeenQuestionIds(userId, template.id)),
        startedAt,
        expiresAt,
        null,
        null,
        "ACTIVE",
        userId,
        stringifyJson({
          durationMinutes: template.durationMinutes,
          totalQuestions: template.totalQuestions,
          marksPerQuestion: template.marksPerQuestion,
          negativeMarking: template.negativeMarking,
          passThresholdPercent: template.passThresholdPercent,
          randomizeOptions: template.randomizeOptions,
        }),
        startedAt,
        startedAt,
      ],
    );

    selected.forEach((question, position) => {
      run(
        `INSERT INTO "AttemptQuestion"
           ("id","attemptId","questionId","optionOrder","response","isFlagged","position","createdAt")
         VALUES (?,?,?,?,?,?,?,?)`,
        [randomUUID(), id, question.id, position, null, 0, position, startedAt],
      );
    });
  });

  recordAudit({
    userId,
    action: "ATTEMPT_STARTED",
    entity: "ExamAttempt",
    entityId: id,
    details: { template: template.slug, questions: selected.length },
  });

  return findAttemptByToken(token) as ExamAttemptRow;
}

// ------------------------------------------------------------- load/save ----

/** Load an attempt for its owner, auto-submitting it if the timer has run out. */
export function loadAttemptSession(token: string, userId: string): AttemptSession {
  const attempt = findAttemptByToken(token);
  if (!attempt) throw new NotFoundError("That exam attempt does not exist.");
  if (attempt.userId !== userId) {
    throw new ForbiddenError("That exam attempt belongs to another user.");
  }
  if (attempt.status !== "ACTIVE") {
    throw new ConflictError("This attempt has already been submitted.", {
      status: attempt.status,
      resultReady: true,
    });
  }

  const template = findTemplateById(attempt.templateId);
  if (!template) throw new NotFoundError("The exam template for this attempt no longer exists.");

  if (hasExpired(attempt) && template.autoSubmitOnExpiry) {
    submitAttempt(token, userId, { allowExpired: true });
    throw new ConflictError("Time ran out and the exam was submitted automatically.", {
      status: "SUBMITTED",
      resultReady: true,
    });
  }

  const questions = loadQuestionsInOrder(parseStringArray(attempt.selectedQuestionIds));

  return {
    attempt,
    template,
    questions: toAttemptQuestionViews(attempt, questions),
    responses: parseIndexMap(attempt.responses),
    flags: parseFlagMap(attempt.flags),
    directionState: attempt.directionState,
    remainingSeconds: remainingSecondsFor(attempt),
    expired: hasExpired(attempt),
  };
}

export interface SaveResponseParams {
  token: string;
  userId: string;
  questionId: string;
  selectedIndices: number[];
  flagged?: boolean;
  directionState?: "FORWARD" | "BACKWARD";
}

export function saveResponse({
  token,
  userId,
  questionId,
  selectedIndices,
  flagged,
  directionState,
}: SaveResponseParams): { responses: Record<string, number[]>; flags: Record<string, boolean> } {
  const attempt = findAttemptByToken(token);
  if (!attempt) throw new NotFoundError("That exam attempt does not exist.");
  if (attempt.userId !== userId) {
    throw new ForbiddenError("That exam attempt belongs to another user.");
  }
  if (attempt.status !== "ACTIVE") {
    throw new ConflictError("This attempt has already been submitted.");
  }

  const template = findTemplateById(attempt.templateId);
  if (template && hasExpired(attempt) && template.autoSubmitOnExpiry) {
    submitAttempt(token, userId, { allowExpired: true });
    throw new ConflictError("Time ran out and the exam was submitted automatically.", {
      status: "SUBMITTED",
      resultReady: true,
    });
  }

  const selectedIds = parseStringArray(attempt.selectedQuestionIds);
  if (!selectedIds.includes(questionId)) {
    throw new ConflictError("That question is not part of this attempt.");
  }

  const question = loadQuestionsInOrder([questionId])[0];
  if (!question) throw new NotFoundError("That question no longer exists.");

  const unique = [...new Set(selectedIndices)].sort((a, b) => a - b);
  for (const index of unique) {
    if (index < 0 || index >= question.options.length) {
      throw new ConflictError(
        `Option index ${index} is out of range for this question (${question.options.length} options).`,
      );
    }
  }
  if (question.questionType === "SINGLE_CHOICE" || question.questionType === "TRUE_FALSE") {
    if (unique.length > 1) {
      throw new ConflictError("This question accepts only one answer.");
    }
  }

  const responses = parseIndexMap(attempt.responses);
  if (unique.length === 0) {
    delete responses[questionId];
  } else {
    responses[questionId] = unique;
  }

  const flags = parseFlagMap(attempt.flags);
  if (flagged !== undefined) flags[questionId] = flagged;

  const timestamp = nowIso();

  transaction(() => {
    run(
      `UPDATE "ExamAttempt"
       SET "responses" = ?, "flags" = ?, "directionState" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      [
        stringifyJson(responses),
        stringifyJson(flags),
        directionState ?? attempt.directionState,
        timestamp,
        attempt.id,
      ],
    );
    run(
      'UPDATE "AttemptQuestion" SET "response" = ?, "isFlagged" = ? WHERE "attemptId" = ? AND "questionId" = ?',
      [
        unique.length ? stringifyJson(unique) : null,
        fromBool(flags[questionId] ?? false),
        attempt.id,
        questionId,
      ],
    );
  });

  return { responses, flags };
}

// ---------------------------------------------------------------- submit ----

export interface SubmitOptions {
  allowExpired?: boolean;
}

/**
 * Grade and close an attempt.
 *
 * Idempotent: submitting twice returns the existing result instead of marking
 * the same paper again.
 */
export function submitAttempt(
  token: string,
  userId: string,
  options: SubmitOptions = {},
): ResultRow {
  const attempt = findAttemptByToken(token);
  if (!attempt) throw new NotFoundError("That exam attempt does not exist.");
  if (attempt.userId !== userId) {
    throw new ForbiddenError("That exam attempt belongs to another user.");
  }

  if (attempt.status === "SUBMITTED" || attempt.status === "EXPIRED") {
    const existing = one<ResultRow>('SELECT * FROM "Result" WHERE "attemptId" = ?', [attempt.id]);
    if (existing) return existing;
    throw new ConflictError("This attempt has already been submitted.");
  }

  const template = findTemplateById(attempt.templateId);
  if (!template) throw new NotFoundError("The exam template for this attempt no longer exists.");

  const expired = hasExpired(attempt);
  if (expired && !options.allowExpired && template.autoSubmitOnExpiry === false) {
    throw new ConflictError("Time ran out for this attempt.");
  }

  const questions = loadQuestionsInOrder(parseStringArray(attempt.selectedQuestionIds));
  if (questions.length === 0) {
    throw new ConflictError("This attempt has no questions to grade.");
  }

  // Must preserve order, or a shuffled attempt would be marked against the
  // authored option order and every answer would look wrong.
  const optionMapping = parseOrderedIndexMap(attempt.optionMapping);
  const responses = parseIndexMap(attempt.responses);

  const summary = gradeAttempt({
    questions,
    optionMapping,
    responses,
    negativeMarking: template.negativeMarking,
    passThresholdPercent: template.passThresholdPercent,
  });

  const review = buildAnswerReview(summary, optionMapping, responses);
  const submittedAt = nowIso();
  const durationSeconds = attempt.startedAt
    ? Math.max(0, Math.round((Date.parse(submittedAt) - Date.parse(attempt.startedAt)) / 1000))
    : null;

  const status: AttemptStatus = expired ? "EXPIRED" : "SUBMITTED";
  const resultId = randomUUID();

  transaction(() => {
    run(
      `INSERT INTO "Result"
        ("id","attemptId","userId","totalQuestions","correctAnswers","incorrectAnswers","unansweredQuestions",
         "earnedMarks","maxMarks","percentage","durationSeconds","status","passStatus","answerReview",
         "submittedAt","createdAt","updatedAt")
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        resultId,
        attempt.id,
        userId,
        summary.totalQuestions,
        summary.correctAnswers,
        summary.incorrectAnswers,
        summary.unansweredQuestions,
        summary.earnedMarks,
        summary.maxMarks,
        summary.percentage,
        durationSeconds,
        "COMPLETED",
        summary.passStatus,
        stringifyJson(review),
        submittedAt,
        submittedAt,
        submittedAt,
      ],
    );

    run(
      `UPDATE "ExamAttempt"
       SET "status" = ?, "submittedAt" = ?, "completedAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      [status, submittedAt, submittedAt, submittedAt, attempt.id],
    );
  });

  recordAudit({
    userId,
    action: expired ? "ATTEMPT_AUTO_SUBMITTED" : "ATTEMPT_SUBMITTED",
    entity: "ExamAttempt",
    entityId: attempt.id,
    details: {
      resultId,
      percentage: summary.percentage,
      correct: summary.correctAnswers,
      total: summary.totalQuestions,
    },
  });

  const result = one<ResultRow>('SELECT * FROM "Result" WHERE "id" = ?', [resultId]);
  if (!result) throw new ConflictError("The attempt was graded but the result could not be read.");
  return result;
}

export { loadQuestionsInOrder, toAttemptQuestionViews };
