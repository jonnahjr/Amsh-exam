import { randomUUID } from "node:crypto";
import { one, run } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { questionInputSchema, templateInputSchema } from "@/lib/validation";
import { createQuestion } from "@/server/questions";
import { createTemplate } from "@/server/templates";
import {
  loadQuestionsInOrder,
  saveResponse,
  startAttempt,
  submitAttempt,
} from "@/server/attempts";
import type { AnswerReviewEntry, Question, ResultRow } from "@/types";
import { useTemporaryDatabase } from "./helpers/test-db";

/**
 * End-to-end test of the exam lifecycle against a real SQLite database built
 * from the production schema, so the schema, repositories, engine, and
 * grading rules are all exercised together.
 */
const temp = useTemporaryDatabase();

function seedUser(email: string, role: string): string {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  run(
    'INSERT INTO "User" ("id","email","password","name","role","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?)',
    [id, email, "not-a-real-hash", `Test ${role}`, role, timestamp, timestamp],
  );
  return id;
}

function seedQuestion(authorId: string, text: string, correctIndex: number): Question {
  const input = questionInputSchema.parse({
    questionText: text,
    questionType: "SINGLE_CHOICE",
    difficulty: "EASY",
    options: ["Alpha", "Beta", "Gamma", "Delta"],
    correctOptionIndices: [correctIndex],
    marks: 1,
    tags: ["test"],
    status: "PUBLISHED",
  });
  return createQuestion(input, authorId);
}

const authorId = seedUser("instructor@test.local", "INSTRUCTOR");
const questions = [
  seedQuestion(authorId, "Question one?", 0),
  seedQuestion(authorId, "Question two?", 1),
  seedQuestion(authorId, "Question three?", 2),
  seedQuestion(authorId, "Question four?", 3),
  seedQuestion(authorId, "Question five?", 0),
];

const template = createTemplate(
  templateInputSchema.parse({
    name: "Integration Exam",
    slug: "integration-exam",
    totalQuestions: 3,
    durationMinutes: 15,
    marksPerQuestion: 1,
    negativeMarking: false,
    passThresholdPercent: 50,
    randomizeQuestions: true,
    randomizeOptions: true,
  }),
);

// Attempts and results carry foreign keys to User, so every actor in this
// test has to exist for real.
const studentId = seedUser("student@test.local", "STUDENT");

afterAll(() => {
  temp.cleanup();
});

/**
 * Read the stored option mapping straight out of the row, deliberately NOT via
 * the application's parser.
 *
 * The mapping is an ordered permutation (display position -> canonical option
 * index), so the test must verify the value grading will actually use rather
 * than trusting the same helper the implementation uses. Sharing the helper
 * once hid a bug where the mapping was sorted and option shuffling was undone.
 */
function storedMapping(token: string): Record<string, number[]> {
  const row = one<{ optionMapping: string }>(
    'SELECT "optionMapping" FROM "ExamAttempt" WHERE "attemptToken" = ?',
    [token],
  )!;
  return JSON.parse(row.optionMapping) as Record<string, number[]>;
}

function storedQuestionIds(token: string): string[] {
  const row = one<{ selectedQuestionIds: string }>(
    'SELECT "selectedQuestionIds" FROM "ExamAttempt" WHERE "attemptToken" = ?',
    [token],
  )!;
  return JSON.parse(row.selectedQuestionIds) as string[];
}

/** Display index that reveals the correct option for a question. */
function correctDisplayIndex(question: Question, mapping: Record<string, number[]>): number {
  const canonical = question.correctOptionIndices[0];
  return mapping[question.id].indexOf(canonical);
}

/** A display index that is definitely not correct. */
function wrongDisplayIndex(question: Question, mapping: Record<string, number[]>): number {
  const canonical = question.correctOptionIndices[0];
  return mapping[question.id].findIndex((entry) => entry !== canonical);
}

describe("attempt lifecycle", () => {
  let token = "";

  it("starts an attempt with the requested number of questions", () => {
    const attempt = startAttempt({
      templateSlug: "integration-exam",
      userId: studentId,
      seed: 1234,
    });

    token = attempt.attemptToken;

    expect(attempt.status).toBe("ACTIVE");
    expect(attempt.startedAt).toBeTruthy();
    expect(attempt.expiresAt).toBeTruthy();
    expect(storedQuestionIds(attempt.attemptToken)).toHaveLength(3);
  });

  it("gives every question a complete, well-formed option mapping", () => {
    const mapping = storedMapping(token);

    for (const id of storedQuestionIds(token)) {
      // Every display position resolves to a distinct canonical option.
      expect([...mapping[id]].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
      expect(mapping[id]).toHaveLength(4);
    }
  });

  it("actually shuffles options rather than storing the authored order", () => {
    const mapping = storedMapping(token);
    const ids = storedQuestionIds(token);
    const shuffled = ids.filter((id) => mapping[id].some((value, index) => value !== index));
    expect(shuffled.length).toBeGreaterThan(0);
  });

  it("resumes instead of restarting when started twice", () => {
    const again = startAttempt({ templateSlug: "integration-exam", userId: studentId });
    expect(again.attemptToken).toBe(token);
  });

  it("refuses to save an answer outside this attempt", () => {
    expect(() =>
      saveResponse({
        token,
        userId: studentId,
        questionId: randomUUID(),
        selectedIndices: [0],
      }),
    ).toThrow(ConflictError);
  });

  it("refuses an option index that does not exist", () => {
    expect(() =>
      saveResponse({
        token,
        userId: studentId,
        questionId: questions[0].id,
        selectedIndices: [99],
      }),
    ).toThrow(ConflictError);
  });

  it("refuses to let another user save an answer", () => {
    expect(() =>
      saveResponse({
        token,
        userId: randomUUID(),
        questionId: questions[0].id,
        selectedIndices: [0],
      }),
    ).toThrow(ForbiddenError);
  });

  it("saves answers and flags", () => {
    const mapping = storedMapping(token);
    const selected = loadQuestionsInOrder(storedQuestionIds(token));

    // Answer the first question correctly and the second one incorrectly.
    const first = selected[0];
    const second = selected[1];

    const state = saveResponse({
      token,
      userId: studentId,
      questionId: first.id,
      selectedIndices: [correctDisplayIndex(first, mapping)],
      flagged: false,
    });
    expect(state.responses[first.id]).toHaveLength(1);

    saveResponse({
      token,
      userId: studentId,
      questionId: second.id,
      selectedIndices: [wrongDisplayIndex(second, mapping)],
      flagged: true,
    });

    const afterFlag = one<{ flags: string }>(
      'SELECT "flags" FROM "ExamAttempt" WHERE "attemptToken" = ?',
      [token],
    )!;
    expect(parseJson<Record<string, boolean>>(afterFlag.flags, {})[second.id]).toBe(true);
  });

  it("grades the submission against the shuffled option order", () => {
    const mapping = storedMapping(token);
    const selected = loadQuestionsInOrder(storedQuestionIds(token));

    // Confirm the test really did answer the first one correctly, using the
    // stored mapping: the display index chosen must resolve to the canonical
    // correct option.
    const responses = parseJson<Record<string, number[]>>(
      one<{ responses: string }>('SELECT "responses" FROM "ExamAttempt" WHERE "attemptToken" = ?', [
        token,
      ])!.responses,
      {},
    );
    const answeredDisplay = responses[selected[0].id][0];
    expect(mapping[selected[0].id][answeredDisplay]).toBe(selected[0].correctOptionIndices[0]);

    const result = submitAttempt(token, studentId);

    expect(result.totalQuestions).toBe(3);
    expect(result.correctAnswers).toBe(1);
    expect(result.incorrectAnswers).toBe(1);
    expect(result.unansweredQuestions).toBe(1);
    expect(result.maxMarks).toBe(3);
    expect(result.earnedMarks).toBe(1);
    expect(result.percentage).toBeCloseTo(33.33, 1);
    expect(result.passStatus).toBe("FAIL");
    expect(result.status).toBe("COMPLETED");
    expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it("stores a review entry per question in display space", () => {
    const result = one<ResultRow>('SELECT * FROM "Result" WHERE "userId" = ?', [studentId])!;
    const review = parseJson<AnswerReviewEntry[]>(result.answerReview, []);

    // Questions are drawn at random, so derive the expected answer text from
    // the questions actually selected rather than assuming a fixed order.
    const submitted = one<{ attemptToken: string }>(
      'SELECT "attemptToken" FROM "ExamAttempt" WHERE "userId" = ? AND "status" = \'SUBMITTED\' ORDER BY "submittedAt" DESC LIMIT 1',
      [studentId],
    )!;
    const selected = loadQuestionsInOrder(storedQuestionIds(submitted.attemptToken));

    expect(review).toHaveLength(3);

    // The review is in presentation order, matching selectedQuestionIds.
    expect(review.map((entry) => entry.questionId)).toEqual(selected.map((entry) => entry.id));

    expect(review[0].isCorrect).toBe(true);
    expect(review[0].selectedIndices).toEqual(review[0].correctIndices);
    // The option highlighted as correct must be the authored correct option.
    expect(review[0].options[review[0].correctIndices[0]]).toBe(
      selected[0].options[selected[0].correctOptionIndices[0]],
    );

    expect(review[1].isCorrect).toBe(false);
    expect(review[1].isAnswered).toBe(true);
    expect(review[1].correctIndices).not.toEqual(review[1].selectedIndices);
    // ...and the option highlighted as correct is still the right text.
    expect(review[1].options[review[1].correctIndices[0]]).toBe(
      selected[1].options[selected[1].correctOptionIndices[0]],
    );

    expect(review[2].isAnswered).toBe(false);
    expect(review[2].awardedMarks).toBe(0);
  });

  it("closes the attempt", () => {
    const status = one<{ status: string }>(
      'SELECT "status" FROM "ExamAttempt" WHERE "attemptToken" = ?',
      [token],
    );
    expect(status?.status).toBe("SUBMITTED");
  });

  it("is idempotent: submitting again returns the same result", () => {
    const first = one<ResultRow>('SELECT * FROM "Result" WHERE "userId" = ?', [studentId])!;
    const second = submitAttempt(token, studentId);
    expect(second.id).toBe(first.id);

    const count = one<{ n: number }>('SELECT COUNT(*) AS "n" FROM "Result"')!;
    expect(count.n).toBe(1);
  });

  it("refuses to save an answer after submission", () => {
    expect(() =>
      saveResponse({ token, userId: studentId, questionId: questions[0].id, selectedIndices: [0] }),
    ).toThrow(ConflictError);
  });

  it("starts a fresh attempt once the previous one is submitted", () => {
    const attempt = startAttempt({
      templateSlug: "integration-exam",
      userId: studentId,
      seed: 99,
    });
    expect(attempt.attemptToken).not.toBe(token);
    expect(attempt.status).toBe("ACTIVE");
  });
});

describe("negative marking", () => {
  it("deducts marks for wrong answers and records it in the review", () => {
    const strictTemplate = createTemplate(
      templateInputSchema.parse({
        name: "Strict Exam",
        slug: "strict-exam",
        totalQuestions: 2,
        durationMinutes: 10,
        negativeMarking: true,
        passThresholdPercent: 50,
        randomizeOptions: true,
      }),
    );
    expect(strictTemplate.negativeMarking).toBe(true);

    const learnerId = seedUser("learner@test.local", "STUDENT");
    const attempt = startAttempt({
      templateSlug: "strict-exam",
      userId: learnerId,
      seed: 4242,
    });

    const mapping = storedMapping(attempt.attemptToken);
    const selected = loadQuestionsInOrder(storedQuestionIds(attempt.attemptToken));

    // One right, one wrong.
    saveResponse({
      token: attempt.attemptToken,
      userId: learnerId,
      questionId: selected[0].id,
      selectedIndices: [mapping[selected[0].id].indexOf(selected[0].correctOptionIndices[0])],
    });
    saveResponse({
      token: attempt.attemptToken,
      userId: learnerId,
      questionId: selected[1].id,
      selectedIndices: [wrongDisplayIndex(selected[1], mapping)],
    });

    const result = submitAttempt(attempt.attemptToken, learnerId);

    expect(result.correctAnswers).toBe(1);
    expect(result.incorrectAnswers).toBe(1);
    // 1 mark earned, 25% of 1 mark deducted.
    expect(result.earnedMarks).toBeCloseTo(0.75, 2);
    expect(result.maxMarks).toBe(2);
    expect(result.percentage).toBeCloseTo(37.5, 2);

    const review = parseJson<AnswerReviewEntry[]>(result.answerReview, []);
    expect(review[1].awardedMarks).toBeLessThan(0);
  });
});

describe("shuffled options are preserved end to end", () => {
  it("a fully correct submission scores 100% when every option is shuffled", () => {
    createTemplate(
      templateInputSchema.parse({
        name: "Shuffle Exam",
        slug: "shuffle-exam",
        totalQuestions: 5,
        durationMinutes: 15,
        negativeMarking: false,
        passThresholdPercent: 50,
        randomizeOptions: true,
      }),
    );

    const learnerId = seedUser("shuffle-learner@test.local", "STUDENT");
    const attempt = startAttempt({ templateSlug: "shuffle-exam", userId: learnerId, seed: 20260101 });

    const mapping = storedMapping(attempt.attemptToken);
    const selected = loadQuestionsInOrder(storedQuestionIds(attempt.attemptToken));
    expect(selected).toHaveLength(5);

    // The mapping must be a real permutation that differs from the authored
    // order; otherwise this test proves nothing about shuffling.
    const nonIdentity = selected.filter((q) =>
      mapping[q.id].some((value, index) => value !== index),
    );
    expect(nonIdentity.length).toBeGreaterThan(0);

    for (const question of selected) {
      const display = question.correctOptionIndices
        .map((canonical) => mapping[question.id].indexOf(canonical))
        .sort((a, b) => a - b);
      expect(display.every((index) => index >= 0)).toBe(true);

      saveResponse({
        token: attempt.attemptToken,
        userId: learnerId,
        questionId: question.id,
        selectedIndices: display,
      });
    }

    const result = submitAttempt(attempt.attemptToken, learnerId);

    expect(result.correctAnswers).toBe(5);
    expect(result.incorrectAnswers).toBe(0);
    expect(result.unansweredQuestions).toBe(0);
    expect(result.percentage).toBe(100);
    expect(result.passStatus).toBe("PASS");

    const review = parseJson<AnswerReviewEntry[]>(result.answerReview, []);
    for (const entry of review) {
      expect(entry.isCorrect).toBe(true);
      // The option highlighted as correct must be the text the author marked.
      const question = selected.find((q) => q.id === entry.questionId)!;
      expect(entry.options[entry.correctIndices[0]]).toBe(
        question.options[question.correctOptionIndices[0]],
      );
      expect(entry.selectedIndices).toEqual(entry.correctIndices);
    }
  });

  it("a fully wrong submission scores 0% when every option is shuffled", () => {
    const learnerId = seedUser("shuffle-wrong@test.local", "STUDENT");
    const attempt = startAttempt({ templateSlug: "shuffle-exam", userId: learnerId, seed: 55 });

    const mapping = storedMapping(attempt.attemptToken);
    const selected = loadQuestionsInOrder(storedQuestionIds(attempt.attemptToken));

    for (const question of selected) {
      const wrong = mapping[question.id].findIndex(
        (canonical) => !question.correctOptionIndices.includes(canonical),
      );
      saveResponse({
        token: attempt.attemptToken,
        userId: learnerId,
        questionId: question.id,
        selectedIndices: [wrong],
      });
    }

    const result = submitAttempt(attempt.attemptToken, learnerId);
    expect(result.correctAnswers).toBe(0);
    expect(result.incorrectAnswers).toBe(5);
    expect(result.percentage).toBe(0);
    expect(result.passStatus).toBe("FAIL");
  });
});

describe("guards", () => {
  it("refuses a template asking for more questions than the bank holds", () => {
    createTemplate(
      templateInputSchema.parse({
        name: "Impossible Exam",
        slug: "impossible-exam",
        totalQuestions: 50,
        durationMinutes: 10,
      }),
    );

    expect(() =>
      startAttempt({ templateSlug: "impossible-exam", userId: studentId }),
    ).toThrow(ConflictError);
  });

  it("refuses an unknown template", () => {
    expect(() => startAttempt({ templateSlug: "does-not-exist", userId: studentId })).toThrow();
  });

  it("refuses an unpublished template for a student", () => {
    createTemplate(
      templateInputSchema.parse({
        name: "Hidden Exam",
        slug: "hidden-exam",
        totalQuestions: 1,
        durationMinutes: 5,
        isPublic: false,
      }),
    );

    expect(() => startAttempt({ templateSlug: "hidden-exam", userId: studentId })).toThrow(
      ForbiddenError,
    );

    // Staff can still start it.
    expect(() =>
      startAttempt({
        templateSlug: "hidden-exam",
        userId: studentId,
        allowUnpublished: true,
      }),
    ).not.toThrow();
  });
});
