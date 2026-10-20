jest.mock("@/lib/db", () => require("./helpers/sqlite-db"));

import { randomUUID } from "node:crypto";
import { one, run } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { questionInputSchema, templateInputSchema } from "@/lib/validation";
import { createQuestion } from "@/server/questions";
import { createTemplate } from "@/server/templates";
import {
  loadAttemptSession,
  loadQuestionsInOrder,
  saveResponse,
  startAttempt,
  submitAttempt,
} from "@/server/attempts";
import type { AnswerReviewEntry, ExamTemplate, Question, ResultRow } from "@/types";
import { closeTestDatabase } from "./helpers/sqlite-db";

/**
 * End-to-end test of the exam lifecycle against a real SQLite database built
 * from the production schema, so the schema, repositories, engine, and
 * grading rules are all exercised together. `@/lib/db` is replaced with an
 * async SQLite adapter for the duration of this file.
 */

let authorId = "";
let studentId = "";
let questions: Question[] = [];
let template: ExamTemplate;

async function seedUser(email: string, role: string): Promise<string> {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  await run(
    'INSERT INTO "User" ("id","email","password","name","role","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?)',
    [id, email, "not-a-real-hash", `Test ${role}`, role, timestamp, timestamp],
  );
  return id;
}

async function seedQuestion(authorIdValue: string, text: string, correctIndex: number): Promise<Question> {
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
  return createQuestion(input, authorIdValue);
}

beforeAll(async () => {
  authorId = await seedUser("instructor@test.local", "INSTRUCTOR");
  studentId = await seedUser("student@test.local", "STUDENT");

  questions = [];
  questions.push(await seedQuestion(authorId, "Question one?", 0));
  questions.push(await seedQuestion(authorId, "Question two?", 1));
  questions.push(await seedQuestion(authorId, "Question three?", 2));
  questions.push(await seedQuestion(authorId, "Question four?", 3));
  questions.push(await seedQuestion(authorId, "Question five?", 0));

  template = await createTemplate(
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
});

afterAll(() => {
  closeTestDatabase();
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
async function storedMapping(token: string): Promise<Record<string, number[]>> {
  const row = await one<{ optionMapping: string }>(
    'SELECT "optionMapping" FROM "ExamAttempt" WHERE "attemptToken" = ?',
    [token],
  );
  if (!row) throw new Error(`No attempt ${token}`);
  return JSON.parse(row.optionMapping) as Record<string, number[]>;
}

async function storedQuestionIds(token: string): Promise<string[]> {
  const row = await one<{ selectedQuestionIds: string }>(
    'SELECT "selectedQuestionIds" FROM "ExamAttempt" WHERE "attemptToken" = ?',
    [token],
  );
  if (!row) throw new Error(`No attempt ${token}`);
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

  it("starts an attempt with the requested number of questions", async () => {
    const attempt = await startAttempt({
      templateSlug: "integration-exam",
      userId: studentId,
      seed: 1234,
    });

    token = attempt.attemptToken;

    expect(attempt.status).toBe("ACTIVE");
    expect(attempt.startedAt).toBeTruthy();
    expect(attempt.expiresAt).toBeTruthy();
    expect(await storedQuestionIds(attempt.attemptToken)).toHaveLength(3);
  });

  it("gives every question a complete, well-formed option mapping", async () => {
    const mapping = await storedMapping(token);

    for (const id of await storedQuestionIds(token)) {
      // Every display position resolves to a distinct canonical option.
      expect([...mapping[id]].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
      expect(mapping[id]).toHaveLength(4);
    }
  });

  it("actually shuffles options rather than storing the authored order", async () => {
    const mapping = await storedMapping(token);
    const ids = await storedQuestionIds(token);
    const shuffled = ids.filter((id) => mapping[id].some((value, index) => value !== index));
    expect(shuffled.length).toBeGreaterThan(0);
  });

  it("resumes the same question set instead of restarting", async () => {
    const before = await storedQuestionIds(token);
    const again = await startAttempt({ templateSlug: "integration-exam", userId: studentId });
    expect(again.attemptToken).toBe(token);
    expect(await storedQuestionIds(again.attemptToken)).toEqual(before);
  });

  it("never exposes correct answers or explanations before submission", async () => {
    const session = await loadAttemptSession(token, studentId);

    expect(session.questions).toHaveLength(3);
    for (const question of session.questions) {
      expect(question).not.toHaveProperty("correctOptionIndices");
      expect(question).not.toHaveProperty("explanation");
      expect(question.options).toHaveLength(4);
    }
    expect(JSON.stringify(session)).not.toMatch(/correctOptionIndices|explanation/);
  });

  it("refuses to save an answer outside this attempt", async () => {
    await expect(
      saveResponse({
        token,
        userId: studentId,
        questionId: randomUUID(),
        selectedIndices: [0],
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("refuses an option index that does not exist", async () => {
    await expect(
      saveResponse({
        token,
        userId: studentId,
        questionId: questions[0].id,
        selectedIndices: [99],
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("refuses to let another user save an answer", async () => {
    await expect(
      saveResponse({
        token,
        userId: randomUUID(),
        questionId: questions[0].id,
        selectedIndices: [0],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("refuses to let another user read the attempt", async () => {
    await expect(loadAttemptSession(token, randomUUID())).rejects.toThrow(ForbiddenError);
  });

  it("saves answers and flags", async () => {
    const mapping = await storedMapping(token);
    const selected = await loadQuestionsInOrder(await storedQuestionIds(token));

    // Answer the first question correctly and the second one incorrectly.
    const first = selected[0];
    const second = selected[1];

    const state = await saveResponse({
      token,
      userId: studentId,
      questionId: first.id,
      selectedIndices: [correctDisplayIndex(first, mapping)],
      flagged: false,
    });
    expect(state.responses[first.id]).toHaveLength(1);

    await saveResponse({
      token,
      userId: studentId,
      questionId: second.id,
      selectedIndices: [wrongDisplayIndex(second, mapping)],
      flagged: true,
    });

    const afterFlag = await one<{ flags: string }>(
      'SELECT "flags" FROM "ExamAttempt" WHERE "attemptToken" = ?',
      [token],
    );
    expect(parseJson<Record<string, boolean>>(afterFlag!.flags, {})[second.id]).toBe(true);
  });

  it("grades the submission against the shuffled option order", async () => {
    const mapping = await storedMapping(token);
    const selected = await loadQuestionsInOrder(await storedQuestionIds(token));

    // Confirm the test really did answer the first one correctly, using the
    // stored mapping: the display index chosen must resolve to the canonical
    // correct option.
    const attemptRow = await one<{ responses: string }>(
      'SELECT "responses" FROM "ExamAttempt" WHERE "attemptToken" = ?',
      [token],
    );
    const responses = parseJson<Record<string, number[]>>(attemptRow!.responses, {});
    const answeredDisplay = responses[selected[0].id][0];
    expect(mapping[selected[0].id][answeredDisplay]).toBe(selected[0].correctOptionIndices[0]);

    const result = await submitAttempt(token, studentId);

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

  it("stores a review entry per question in display space", async () => {
    const result = await one<ResultRow>('SELECT * FROM "Result" WHERE "userId" = ?', [studentId]);
    const review = parseJson<AnswerReviewEntry[]>(result!.answerReview, []);

    const submitted = await one<{ attemptToken: string }>(
      'SELECT "attemptToken" FROM "ExamAttempt" WHERE "userId" = ? AND "status" = \'SUBMITTED\' ORDER BY "submittedAt" DESC LIMIT 1',
      [studentId],
    );
    const selected = await loadQuestionsInOrder(await storedQuestionIds(submitted!.attemptToken));

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

  it("closes the attempt", async () => {
    const status = await one<{ status: string }>(
      'SELECT "status" FROM "ExamAttempt" WHERE "attemptToken" = ?',
      [token],
    );
    expect(status?.status).toBe("SUBMITTED");
  });

  it("is idempotent: submitting again returns the same result", async () => {
    const first = await one<ResultRow>('SELECT * FROM "Result" WHERE "userId" = ?', [studentId]);
    const second = await submitAttempt(token, studentId);
    expect(second.id).toBe(first!.id);

    const count = await one<{ n: number }>('SELECT COUNT(*) AS "n" FROM "Result"');
    expect(count!.n).toBe(1);
  });

  it("refuses to save an answer after submission", async () => {
    await expect(
      saveResponse({ token, userId: studentId, questionId: questions[0].id, selectedIndices: [0] }),
    ).rejects.toThrow(ConflictError);
  });

  it("starts a fresh attempt once the previous one is submitted", async () => {
    const attempt = await startAttempt({
      templateSlug: "integration-exam",
      userId: studentId,
      seed: 99,
    });
    expect(attempt.attemptToken).not.toBe(token);
    expect(attempt.status).toBe("ACTIVE");
  });
});

describe("negative marking", () => {
  it("deducts marks for wrong answers and records it in the review", async () => {
    const strictTemplate = await createTemplate(
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

    const learnerId = await seedUser("learner@test.local", "STUDENT");
    const attempt = await startAttempt({
      templateSlug: "strict-exam",
      userId: learnerId,
      seed: 4242,
    });

    const mapping = await storedMapping(attempt.attemptToken);
    const selected = await loadQuestionsInOrder(await storedQuestionIds(attempt.attemptToken));

    // One right, one wrong.
    await saveResponse({
      token: attempt.attemptToken,
      userId: learnerId,
      questionId: selected[0].id,
      selectedIndices: [mapping[selected[0].id].indexOf(selected[0].correctOptionIndices[0])],
    });
    await saveResponse({
      token: attempt.attemptToken,
      userId: learnerId,
      questionId: selected[1].id,
      selectedIndices: [wrongDisplayIndex(selected[1], mapping)],
    });

    const result = await submitAttempt(attempt.attemptToken, learnerId);

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
  it("a fully correct submission scores 100% when every option is shuffled", async () => {
    await createTemplate(
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

    const learnerId = await seedUser("shuffle-learner@test.local", "STUDENT");
    const attempt = await startAttempt({ templateSlug: "shuffle-exam", userId: learnerId, seed: 20260101 });

    const mapping = await storedMapping(attempt.attemptToken);
    const selected = await loadQuestionsInOrder(await storedQuestionIds(attempt.attemptToken));
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

      await saveResponse({
        token: attempt.attemptToken,
        userId: learnerId,
        questionId: question.id,
        selectedIndices: display,
      });
    }

    const result = await submitAttempt(attempt.attemptToken, learnerId);

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

  it("a fully wrong submission scores 0% when every option is shuffled", async () => {
    const learnerId = await seedUser("shuffle-wrong@test.local", "STUDENT");
    const attempt = await startAttempt({ templateSlug: "shuffle-exam", userId: learnerId, seed: 55 });

    const mapping = await storedMapping(attempt.attemptToken);
    const selected = await loadQuestionsInOrder(await storedQuestionIds(attempt.attemptToken));

    for (const question of selected) {
      const wrong = mapping[question.id].findIndex(
        (canonical) => !question.correctOptionIndices.includes(canonical),
      );
      await saveResponse({
        token: attempt.attemptToken,
        userId: learnerId,
        questionId: question.id,
        selectedIndices: [wrong],
      });
    }

    const result = await submitAttempt(attempt.attemptToken, learnerId);
    expect(result.correctAnswers).toBe(0);
    expect(result.incorrectAnswers).toBe(5);
    expect(result.percentage).toBe(0);
    expect(result.passStatus).toBe("FAIL");
  });
});

describe("randomized 100-question paper", () => {
  it("selects exactly 100 distinct questions and keeps each set stable per attempt", async () => {
    // A 130-question bank is enough to prove the 100-of-N selection rule.
    for (let index = 0; index < 130; index += 1) {
      await seedQuestion(authorId, `Randomization pool question ${index}?`, index % 4);
    }

    await createTemplate(
      templateInputSchema.parse({
        name: "Randomized 100",
        slug: "randomized-100",
        totalQuestions: 100,
        durationMinutes: 120,
        marksPerQuestion: 1,
        negativeMarking: false,
        passThresholdPercent: 50,
        randomizeQuestions: true,
        randomizeOptions: true,
      }),
    );

    const firstLearner = await seedUser("random-one@test.local", "STUDENT");
    const secondLearner = await seedUser("random-two@test.local", "STUDENT");

    const first = await startAttempt({
      templateSlug: "randomized-100",
      userId: firstLearner,
      seed: 111,
    });
    const second = await startAttempt({
      templateSlug: "randomized-100",
      userId: secondLearner,
      seed: 222,
    });

    const firstIds = await storedQuestionIds(first.attemptToken);
    const secondIds = await storedQuestionIds(second.attemptToken);

    expect(firstIds).toHaveLength(100);
    expect(new Set(firstIds).size).toBe(100);
    expect(secondIds).toHaveLength(100);
    expect(new Set(secondIds).size).toBe(100);
    expect(firstIds).not.toEqual(secondIds);

    // A refresh / second request must return the same set, not a new one.
    const resumed = await startAttempt({
      templateSlug: "randomized-100",
      userId: firstLearner,
      seed: 999,
    });
    expect(resumed.attemptToken).toBe(first.attemptToken);
    expect(await storedQuestionIds(resumed.attemptToken)).toEqual(firstIds);

    // The attempt stores the owner, attempt id, start time, status, and set.
    const row = await one<{
      id: string;
      userId: string;
      startedAt: string;
      status: string;
      selectedQuestionIds: string;
    }>('SELECT "id","userId","startedAt","status","selectedQuestionIds" FROM "ExamAttempt" WHERE "attemptToken" = ?', [
      first.attemptToken,
    ]);
    expect(row?.userId).toBe(firstLearner);
    expect(row?.startedAt).toBeTruthy();
    expect(row?.status).toBe("ACTIVE");
    expect(JSON.parse(row!.selectedQuestionIds)).toHaveLength(100);
  });
});

describe("guards", () => {
  it("refuses a template asking for more questions than the bank holds", async () => {
    await createTemplate(
      templateInputSchema.parse({
        name: "Impossible Exam",
        slug: "impossible-exam",
        totalQuestions: 500,
        durationMinutes: 10,
      }),
    );

    await expect(
      startAttempt({ templateSlug: "impossible-exam", userId: studentId }),
    ).rejects.toThrow(ConflictError);
  });

  it("refuses an unknown template", async () => {
    await expect(startAttempt({ templateSlug: "does-not-exist", userId: studentId })).rejects.toThrow();
  });

  it("refuses an unpublished template for a student", async () => {
    await createTemplate(
      templateInputSchema.parse({
        name: "Hidden Exam",
        slug: "hidden-exam",
        totalQuestions: 1,
        durationMinutes: 5,
        isPublic: false,
      }),
    );

    await expect(
      startAttempt({ templateSlug: "hidden-exam", userId: studentId }),
    ).rejects.toThrow(ForbiddenError);

    // Staff can still start it.
    await expect(
      startAttempt({
        templateSlug: "hidden-exam",
        userId: studentId,
        allowUnpublished: true,
      }),
    ).resolves.toBeDefined();
  });
});
