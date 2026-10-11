import {
  buildAnswerReview,
  buildOptionMapping,
  canonicalizeSelection,
  createRng,
  displayOptions,
  gradeAttempt,
  InsufficientQuestionsError,
  selectQuestions,
  shuffle,
  targetCountsByDifficulty,
} from "@/server/exam-engine";
import type { Difficulty, ExamTemplate, Question } from "@/types";

/** Minimal builders so each test states only what it cares about. */
function makeQuestion(overrides: Partial<Question> & { id: string }): Question {
  return {
    questionId: `Q-${overrides.id}`,
    questionText: `Question ${overrides.id}`,
    categoryId: null,
    subjectId: null,
    topicId: null,
    difficulty: "EASY",
    questionType: "SINGLE_CHOICE",
    options: ["A", "B", "C", "D"],
    correctOptionIndices: [0],
    explanation: null,
    marks: 1,
    negativeMarks: null,
    tags: [],
    learningObjectives: null,
    source: null,
    authorId: "author-1",
    status: "PUBLISHED",
    publishedAt: null,
    archivedAt: null,
    importId: null,
    canonicalIndices: [0, 1, 2, 3],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<ExamTemplate> = {}): ExamTemplate {
  return {
    id: "template-1",
    slug: "demo",
    name: "Demo exam",
    categoryId: null,
    subjectId: null,
    topicWeights: {},
    totalQuestions: 4,
    durationMinutes: 30,
    marksPerQuestion: 1,
    negativeMarking: false,
    difficultyDistribution: {},
    randomizeQuestions: true,
    randomizeOptions: true,
    avoidPreviouslySeen: false,
    allowReuse: false,
    autoSubmitOnExpiry: true,
    passThresholdPercent: 50,
    description: null,
    isPublic: true,
    publishedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function poolByDifficulty(counts: Partial<Record<Difficulty, number>>): Question[] {
  const questions: Question[] = [];
  for (const [difficulty, count] of Object.entries(counts) as [Difficulty, number][]) {
    for (let index = 0; index < count; index += 1) {
      questions.push(
        makeQuestion({ id: `${difficulty}-${index}`, difficulty }),
      );
    }
  }
  return questions;
}

describe("createRng / shuffle", () => {
  it("is deterministic for a given seed", () => {
    const first = Array.from({ length: 5 }, () => createRng(42)());
    const second = Array.from({ length: 5 }, () => createRng(42)());
    expect(first).toEqual(second);
  });

  it("produces different sequences for different seeds", () => {
    const a = Array.from({ length: 5 }, () => createRng(1)());
    const b = Array.from({ length: 5 }, () => createRng(2)());
    expect(a).not.toEqual(b);
  });

  it("shuffles without losing or duplicating elements", () => {
    const input = Array.from({ length: 50 }, (_, index) => index);
    const output = shuffle(input, createRng(7));
    expect(output).toHaveLength(input.length);
    expect([...output].sort((x, y) => x - y)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    shuffle(input, createRng(3));
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("targetCountsByDifficulty", () => {
  it("always sums to the requested total", () => {
    for (const total of [1, 3, 7, 10, 23, 100]) {
      const counts = targetCountsByDifficulty(total, {
        EASY: 0.33,
        INTERMEDIATE: 0.5,
        HARD: 0.17,
      });
      const sum = Object.values(counts).reduce((acc, value) => acc + (value ?? 0), 0);
      expect(sum).toBe(total);
    }
  });

  it("respects proportional weights", () => {
    const counts = targetCountsByDifficulty(10, { EASY: 0.5, HARD: 0.5 });
    expect(counts).toEqual({ EASY: 5, HARD: 5 });
  });

  it("skips difficulties with zero or missing weight", () => {
    const counts = targetCountsByDifficulty(6, { EASY: 1, HARD: 0 });
    expect(counts.EASY).toBe(6);
    expect(counts.HARD).toBeUndefined();
  });

  it("falls back to an even split when no distribution is given", () => {
    const counts = targetCountsByDifficulty(8, {});
    const sum = Object.values(counts).reduce((acc, value) => acc + (value ?? 0), 0);
    expect(sum).toBe(8);
    expect(Object.keys(counts).length).toBe(4);
  });

  it("handles a null distribution", () => {
    const counts = targetCountsByDifficulty(4, null);
    const sum = Object.values(counts).reduce((acc, value) => acc + (value ?? 0), 0);
    expect(sum).toBe(4);
  });
});

describe("selectQuestions", () => {
  it("returns exactly the number of questions the template asks for", () => {
    const pool = poolByDifficulty({ EASY: 10, INTERMEDIATE: 10, HARD: 10 });
    const selected = selectQuestions({
      pool,
      template: makeTemplate({ totalQuestions: 7 }),
      rng: createRng(1),
    });
    expect(selected).toHaveLength(7);
    expect(new Set(selected.map((q) => q.id)).size).toBe(7);
  });

  it("honours the difficulty distribution", () => {
    const pool = poolByDifficulty({ EASY: 10, INTERMEDIATE: 10, HARD: 10 });
    const selected = selectQuestions({
      pool,
      template: makeTemplate({
        totalQuestions: 10,
        difficultyDistribution: { EASY: 0.5, INTERMEDIATE: 0.3, HARD: 0.2 },
      }),
      rng: createRng(5),
    });

    const tally: Record<string, number> = {};
    for (const question of selected) {
      tally[question.difficulty] = (tally[question.difficulty] ?? 0) + 1;
    }
    expect(tally).toEqual({ EASY: 5, INTERMEDIATE: 3, HARD: 2 });
  });

  it("backfills from other difficulties when a bucket is short", () => {
    const pool = poolByDifficulty({ EASY: 20, HARD: 1 });
    const selected = selectQuestions({
      pool,
      template: makeTemplate({
        totalQuestions: 5,
        difficultyDistribution: { EASY: 0.5, HARD: 0.5 },
      }),
      rng: createRng(9),
    });
    expect(selected).toHaveLength(5);
    // Only one HARD question exists, so the rest must come from EASY.
    expect(selected.filter((q) => q.difficulty === "HARD")).toHaveLength(1);
    expect(selected.filter((q) => q.difficulty === "EASY")).toHaveLength(4);
  });

  it("throws a descriptive error when the bank is too small", () => {
    const pool = poolByDifficulty({ EASY: 2 });
    expect(() =>
      selectQuestions({
        pool,
        template: makeTemplate({ totalQuestions: 5 }),
        rng: createRng(1),
      }),
    ).toThrow(InsufficientQuestionsError);
  });

  it("excludes previously seen questions when avoidPreviouslySeen is set", () => {
    const pool = poolByDifficulty({ EASY: 10 });
    const seen = pool.slice(0, 8).map((question) => question.id);

    const selected = selectQuestions({
      pool,
      template: makeTemplate({ totalQuestions: 2, avoidPreviouslySeen: true }),
      previouslySeenIds: seen,
      rng: createRng(2),
    });

    for (const question of selected) {
      expect(seen).not.toContain(question.id);
    }
  });

  it("reuses seen questions when allowReuse is also set and the pool is short", () => {
    const pool = poolByDifficulty({ EASY: 3 });
    const seen = pool.map((question) => question.id);

    const selected = selectQuestions({
      pool,
      template: makeTemplate({
        totalQuestions: 3,
        avoidPreviouslySeen: true,
        allowReuse: true,
      }),
      previouslySeenIds: seen,
      rng: createRng(4),
    });

    expect(selected).toHaveLength(3);
  });

  it("refuses rather than silently shortening when reuse is not allowed", () => {
    const pool = poolByDifficulty({ EASY: 3 });
    const seen = pool.map((question) => question.id);

    expect(() =>
      selectQuestions({
        pool,
        template: makeTemplate({
          totalQuestions: 3,
          avoidPreviouslySeen: true,
          allowReuse: false,
        }),
        previouslySeenIds: seen,
        rng: createRng(4),
      }),
    ).toThrow(InsufficientQuestionsError);
  });

  it("is reproducible for the same seed", () => {
    const pool = poolByDifficulty({ EASY: 10, INTERMEDIATE: 10 });
    const template = makeTemplate({ totalQuestions: 6 });

    const first = selectQuestions({ pool, template, rng: createRng(99) });
    const second = selectQuestions({ pool, template, rng: createRng(99) });

    expect(first.map((q) => q.id)).toEqual(second.map((q) => q.id));
  });
});

describe("option mapping", () => {
  it("keeps the authored order when shuffling is disabled", () => {
    const question = makeQuestion({ id: "q1" });
    const mapping = buildOptionMapping([question], false, createRng(1));
    expect(mapping.q1).toEqual([0, 1, 2, 3]);
  });

  it("only permutes the authored indices when shuffling is enabled", () => {
    const question = makeQuestion({ id: "q1" });
    const mapping = buildOptionMapping([question], true, createRng(1));
    expect([...mapping.q1].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it("shows the options in the mapped order", () => {
    const question = makeQuestion({ id: "q1", options: ["A", "B", "C", "D"] });
    expect(displayOptions(question, [3, 2, 1, 0])).toEqual(["D", "C", "B", "A"]);
  });

  it("falls back to the authored order when the mapping is unusable", () => {
    const question = makeQuestion({ id: "q1", options: ["A", "B", "C", "D"] });
    expect(displayOptions(question, [1, 2])).toEqual(["A", "B", "C", "D"]);
    expect(displayOptions(question, undefined)).toEqual(["A", "B", "C", "D"]);
  });

  it("translates display indices back to canonical indices", () => {
    // Display position 0 shows canonical option 3, position 1 shows canonical 0, etc.
    const mapping = [3, 0, 2, 1];
    expect(canonicalizeSelection([0], mapping)).toEqual([3]);
    expect(canonicalizeSelection([0, 1], mapping)).toEqual([0, 3]);
    expect(canonicalizeSelection([], mapping)).toEqual([]);
  });

  it("ignores indices outside the mapping", () => {
    expect(canonicalizeSelection([9], [0, 1, 2, 3])).toEqual([]);
  });
});

describe("gradeAttempt", () => {
  const questions = [
    makeQuestion({ id: "correct", correctOptionIndices: [1], marks: 2 }),
    makeQuestion({ id: "wrong", correctOptionIndices: [0], marks: 2 }),
    makeQuestion({ id: "skipped", correctOptionIndices: [0], marks: 2 }),
  ];

  const identityMapping = {
    correct: [0, 1, 2, 3],
    wrong: [0, 1, 2, 3],
    skipped: [0, 1, 2, 3],
  };

  it("awards full marks for an exact match", () => {
    const summary = gradeAttempt({
      questions,
      optionMapping: identityMapping,
      responses: { correct: [1] },
      negativeMarking: false,
    });

    expect(summary.correctAnswers).toBe(1);
    expect(summary.incorrectAnswers).toBe(0);
    expect(summary.unansweredQuestions).toBe(2);
    expect(summary.earnedMarks).toBe(2);
    expect(summary.maxMarks).toBe(6);
  });

  it("counts a wrong answer as incorrect and never pays marks", () => {
    const summary = gradeAttempt({
      questions,
      optionMapping: identityMapping,
      responses: { correct: [1], wrong: [2] },
      negativeMarking: false,
    });

    expect(summary.correctAnswers).toBe(1);
    expect(summary.incorrectAnswers).toBe(1);
    expect(summary.earnedMarks).toBe(2);
  });

  it("never deducts marks for an unanswered question, even with negative marking", () => {
    const summary = gradeAttempt({
      questions,
      optionMapping: identityMapping,
      responses: { correct: [1], wrong: [2] },
      negativeMarking: true,
    });

    expect(summary.unansweredQuestions).toBe(1);
    // 2 for the correct answer, -0.5 for the wrong one (25% of 2), 0 for skipped.
    expect(summary.earnedMarks).toBe(1.5);
  });

  it("applies the question's own negativeMarks when set", () => {
    const withNegative = [makeQuestion({ id: "q", correctOptionIndices: [0], marks: 4, negativeMarks: 3 })];
    const summary = gradeAttempt({
      questions: withNegative,
      optionMapping: { q: [0, 1, 2, 3] },
      responses: { q: [1] },
      negativeMarking: true,
    });
    expect(summary.earnedMarks).toBe(-3);
  });

  it("does not deduct when negative marking is disabled", () => {
    const summary = gradeAttempt({
      questions: [makeQuestion({ id: "q", correctOptionIndices: [0], marks: 4, negativeMarks: 3 })],
      optionMapping: { q: [0, 1, 2, 3] },
      responses: { q: [1] },
      negativeMarking: false,
    });
    expect(summary.earnedMarks).toBe(0);
  });

  it("marks answers against the shuffled display order", () => {
    // Displayed order is D, C, B, A; the correct canonical answer is index 0 (A),
    // which the student reaches at display position 3.
    const question = makeQuestion({ id: "q", options: ["A", "B", "C", "D"], correctOptionIndices: [0] });
    const mapping = { q: [3, 2, 1, 0] };

    const correct = gradeAttempt({
      questions: [question],
      optionMapping: mapping,
      responses: { q: [3] },
      negativeMarking: false,
    });
    expect(correct.correctAnswers).toBe(1);

    const wrong = gradeAttempt({
      questions: [question],
      optionMapping: mapping,
      responses: { q: [0] },
      negativeMarking: false,
    });
    expect(wrong.correctAnswers).toBe(0);
    expect(wrong.incorrectAnswers).toBe(1);
  });

  it("requires an exact match for multi-select questions", () => {
    const question = makeQuestion({ id: "q", correctOptionIndices: [0, 2], questionType: "MULTIPLE_CHOICE" });
    const mapping = { q: [0, 1, 2, 3] };

    const partial = gradeAttempt({
      questions: [question],
      optionMapping: mapping,
      responses: { q: [0] },
      negativeMarking: false,
    });
    expect(partial.correctAnswers).toBe(0);
    expect(partial.earnedMarks).toBe(0);

    const exact = gradeAttempt({
      questions: [question],
      optionMapping: mapping,
      responses: { q: [0, 2] },
      negativeMarking: false,
    });
    expect(exact.correctAnswers).toBe(1);
  });

  it("computes the percentage and clamps it at zero", () => {
    const question = makeQuestion({ id: "q", correctOptionIndices: [0], marks: 1, negativeMarks: 5 });
    const summary = gradeAttempt({
      questions: [question],
      optionMapping: { q: [0, 1, 2, 3] },
      responses: { q: [1] },
      negativeMarking: true,
    });
    expect(summary.earnedMarks).toBe(-5);
    expect(summary.percentage).toBe(0);
  });

  it("decides pass or fail from the threshold", () => {
    const question = makeQuestion({ id: "q", correctOptionIndices: [0], marks: 1 });
    const base = {
      questions: [question],
      optionMapping: { q: [0, 1, 2, 3] },
      negativeMarking: false,
    };

    expect(
      gradeAttempt({ ...base, responses: { q: [0] }, passThresholdPercent: 50 }).passStatus,
    ).toBe("PASS");
    expect(
      gradeAttempt({ ...base, responses: { q: [1] }, passThresholdPercent: 50 }).passStatus,
    ).toBe("FAIL");
    // Exactly on the threshold counts as a pass.
    expect(
      gradeAttempt({ ...base, responses: { q: [0] }, passThresholdPercent: 100 }).passStatus,
    ).toBe("PASS");
  });

  it("handles an empty question list without dividing by zero", () => {
    const summary = gradeAttempt({
      questions: [],
      optionMapping: {},
      responses: {},
      negativeMarking: true,
    });
    expect(summary.totalQuestions).toBe(0);
    expect(summary.maxMarks).toBe(0);
    expect(summary.percentage).toBe(0);
  });
});

describe("buildAnswerReview", () => {
  it("reports the options in display order and flags correctness", () => {
    const question = makeQuestion({
      id: "q",
      options: ["A", "B", "C", "D"],
      correctOptionIndices: [2],
      explanation: "Because C.",
    });
    const mapping = { q: [3, 2, 1, 0] };

    const summary = gradeAttempt({
      questions: [question],
      optionMapping: mapping,
      responses: { q: [1] },
      negativeMarking: false,
    });

    const review = buildAnswerReview(summary, mapping, { q: [1] });

    expect(review).toHaveLength(1);
    // Display order after mapping is [3, 2, 1, 0] -> D, C, B, A
    expect(review[0].options).toEqual(["D", "C", "B", "A"]);
    // Everything below is in display space, so it lines up with `options`.
    expect(review[0].selectedIndices).toEqual([1]);
    expect(review[0].correctIndices).toEqual([1]);
    expect(review[0].options[1]).toBe("C");
    expect(review[0].isCorrect).toBe(true);
    expect(review[0].explanation).toBe("Because C.");
  });

  it("keeps options, selection, and answer in one index space when shuffled", () => {
    // Correct answer is canonical index 0 ("A"); with this mapping "A" sits at
    // display position 3, so a student answering it correctly selects index 3.
    const question = makeQuestion({
      id: "q",
      options: ["A", "B", "C", "D"],
      correctOptionIndices: [0],
    });
    const mapping = { q: [3, 2, 1, 0] };

    const summary = gradeAttempt({
      questions: [question],
      optionMapping: mapping,
      responses: { q: [3] },
      negativeMarking: false,
    });
    const review = buildAnswerReview(summary, mapping, { q: [3] });

    expect(review[0].isCorrect).toBe(true);
    expect(review[0].selectedIndices).toEqual([3]);
    expect(review[0].correctIndices).toEqual([3]);
    // The highlighted option must really be the correct one.
    expect(review[0].options[review[0].correctIndices[0]]).toBe("A");
  });
});
