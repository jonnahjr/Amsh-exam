import type { AnswerReviewEntry, Difficulty, ExamTemplate, Question } from "@/types";
import { DIFFICULTIES } from "@/types";

/**
 * The exam engine.
 *
 * Everything here is pure: no database, no request context, no clock. That
 * makes the marking logic directly testable and keeps the rules in one place.
 */

export type Rng = () => number;

/** Deterministic RNG so a seeded attempt is reproducible in tests. */
export function createRng(seed: number = Date.now()): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates. Returns a new array; the input is not mutated. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Thrown when a template asks for more questions than the bank can supply. */
export class InsufficientQuestionsError extends Error {
  constructor(
    readonly requested: number,
    readonly available: number,
    readonly scope: string,
  ) {
    super(
      `This exam needs ${requested} questions but only ${available} are available for ${scope}.`,
    );
    this.name = "InsufficientQuestionsError";
  }
}

// ------------------------------------------------------------- selection ----

/**
 * Split `total` across difficulties according to `distribution`.
 *
 * Uses largest-remainder rounding so the parts always sum to exactly `total`.
 * A zero-weight difficulty is skipped; if `distribution` is empty or sums to
 * zero the counts fall back to an even split.
 */
export function targetCountsByDifficulty(
  total: number,
  distribution: Partial<Record<Difficulty, number>> | null | undefined,
): Partial<Record<Difficulty, number>> {
  const entries = DIFFICULTIES.map((difficulty) => ({
    difficulty,
    weight: distribution?.[difficulty] ?? 0,
  })).filter((entry) => entry.weight > 0);

  if (entries.length === 0) {
    const counts: Partial<Record<Difficulty, number>> = {};
    const base = Math.floor(total / DIFFICULTIES.length);
    const remainder = total - base * DIFFICULTIES.length;
    DIFFICULTIES.forEach((difficulty, index) => {
      const count = base + (index < remainder ? 1 : 0);
      if (count > 0) counts[difficulty] = count;
    });
    return counts;
  }

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const exact = entries.map((entry) => ({
    difficulty: entry.difficulty,
    value: (entry.weight / totalWeight) * total,
  }));

  const counts: Partial<Record<Difficulty, number>> = {};
  let assigned = 0;
  for (const entry of exact) {
    const floored = Math.floor(entry.value);
    counts[entry.difficulty] = floored;
    assigned += floored;
  }

  const byRemainder = [...exact].sort(
    (a, b) => (b.value % 1) - (a.value % 1) || a.difficulty.localeCompare(b.difficulty),
  );
  for (let i = 0; assigned < total && i < byRemainder.length; i += 1) {
    const difficulty = byRemainder[i % byRemainder.length].difficulty;
    counts[difficulty] = (counts[difficulty] ?? 0) + 1;
    assigned += 1;
  }

  for (const difficulty of DIFFICULTIES) {
    if ((counts[difficulty] ?? 0) === 0) delete counts[difficulty];
  }
  return counts;
}

export interface SelectQuestionsParams {
  /** Every published question the template is allowed to draw from. */
  pool: Question[];
  template: ExamTemplate;
  /** Question ids this student has already been shown. */
  previouslySeenIds?: string[];
  rng?: Rng;
}

/**
 * Choose the questions for one attempt.
 *
 * When `avoidPreviouslySeen` is set, seen questions are excluded first. If that
 * leaves too few, `allowReuse` decides whether they come back into play or the
 * attempt is refused.
 */
export function selectQuestions({
  pool,
  template,
  previouslySeenIds = [],
  rng = createRng(),
}: SelectQuestionsParams): Question[] {
  const seen = new Set(previouslySeenIds);
  const unseen = pool.filter((question) => !seen.has(question.id));

  let eligible = template.avoidPreviouslySeen ? unseen : pool;
  if (eligible.length < template.totalQuestions && template.avoidPreviouslySeen && template.allowReuse) {
    eligible = pool;
  }

  const buckets = new Map<Difficulty, Question[]>();
  for (const question of eligible) {
    const bucket = buckets.get(question.difficulty) ?? [];
    bucket.push(question);
    buckets.set(question.difficulty, bucket);
  }

  const counts = targetCountsByDifficulty(template.totalQuestions, template.difficultyDistribution);
  const chosen: Question[] = [];
  const chosenIds = new Set<string>();

  for (const [difficulty, count] of Object.entries(counts) as [Difficulty, number][]) {
    const bucket = shuffle(buckets.get(difficulty) ?? [], rng);
    for (const question of bucket.slice(0, count)) {
      chosen.push(question);
      chosenIds.add(question.id);
    }
  }

  // Top up from anything left over when a difficulty bucket ran short.
  if (chosen.length < template.totalQuestions) {
    const leftovers = shuffle(
      eligible.filter((question) => !chosenIds.has(question.id)),
      rng,
    );
    for (const question of leftovers) {
      if (chosen.length >= template.totalQuestions) break;
      chosen.push(question);
      chosenIds.add(question.id);
    }
  }

  if (chosen.length < template.totalQuestions) {
    const scope = template.subjectId
      ? "this subject"
      : template.categoryId
        ? "this category"
        : "the whole question bank";
    throw new InsufficientQuestionsError(
      template.totalQuestions,
      eligible.length,
      scope,
    );
  }

  return template.randomizeQuestions
    ? shuffle(chosen, rng)
    : chosen.sort((a, b) => a.id.localeCompare(b.id));
}

// --------------------------------------------------------------- options ----

/**
 * Build the per-question display order.
 *
 * The returned array maps a display position to a canonical (authored) option
 * index, so `mapping[0]` is the canonical index of the option shown first.
 */
export function buildOptionMapping(
  questions: readonly Question[],
  randomize: boolean,
  rng: Rng = createRng(),
): Record<string, number[]> {
  const mapping: Record<string, number[]> = {};
  for (const question of questions) {
    const identity = question.options.map((_, index) => index);
    mapping[question.id] = randomize ? shuffle(identity, rng) : identity;
  }
  return mapping;
}

/** Apply a display mapping to the authored options. */
export function displayOptions(question: Question, mapping: number[] | undefined): string[] {
  if (!mapping || mapping.length !== question.options.length) return [...question.options];
  return mapping.map((canonicalIndex) => question.options[canonicalIndex] ?? "");
}

/** Translate the student's display indices back into canonical indices. */
export function canonicalizeSelection(
  displayIndices: readonly number[],
  mapping: number[] | undefined,
): number[] {
  if (!mapping) return [...displayIndices].sort((a, b) => a - b);
  const canonical = displayIndices
    .map((index) => mapping[index])
    .filter((index): index is number => Number.isInteger(index));
  return [...new Set(canonical)].sort((a, b) => a - b);
}

function sameAnswers(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

// -------------------------------------------------------------- grading -----

export interface GradeInput {
  /** Questions in presentation order, with authored answers. */
  questions: Question[];
  optionMapping: Record<string, number[]>;
  /** questionId -> display indices selected by the student. */
  responses: Record<string, number[]>;
  negativeMarking: boolean;
}

export interface QuestionOutcome {
  question: Question;
  position: number;
  selectedCanonicalIndices: number[];
  isAnswered: boolean;
  isCorrect: boolean;
  awardedMarks: number;
  maxMarks: number;
}

export interface GradeSummary {
  outcomes: QuestionOutcome[];
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  earnedMarks: number;
  maxMarks: number;
  percentage: number;
  passStatus: "PASS" | "FAIL";
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Mark a submission.
 *
 * Policy (kept deliberately simple and in one place):
 *   * exact match           -> full marks
 *   * answered, not exact   -> zero, or a deduction when negative marking is on
 *   * unanswered            -> zero, never a deduction
 * Partial credit for partially-correct multi-select answers is not awarded.
 */
export function gradeAttempt(
  input: GradeInput & { passThresholdPercent?: number },
): GradeSummary {
  const { questions, optionMapping, responses, negativeMarking, passThresholdPercent = 0 } = input;

  const outcomes: QuestionOutcome[] = questions.map((question, position) => {
    const selectedDisplay = responses[question.id] ?? [];
    const selectedCanonical = canonicalizeSelection(selectedDisplay, optionMapping[question.id]);
    const correct = [...new Set(question.correctOptionIndices)].sort((a, b) => a - b);
    const isAnswered = selectedCanonical.length > 0;
    const isCorrect = isAnswered && sameAnswers(selectedCanonical, correct);

    const deduction =
      question.negativeMarks ?? round2(question.marks * 0.25);

    const awardedMarks = isCorrect
      ? question.marks
      : isAnswered && negativeMarking
        ? -deduction
        : 0;

    return {
      question,
      position,
      selectedCanonicalIndices: selectedCanonical,
      isAnswered,
      isCorrect,
      awardedMarks: round2(awardedMarks),
      maxMarks: question.marks,
    };
  });

  const correctAnswers = outcomes.filter((outcome) => outcome.isCorrect).length;
  const unansweredQuestions = outcomes.filter((outcome) => !outcome.isAnswered).length;
  const incorrectAnswers = outcomes.length - correctAnswers - unansweredQuestions;

  const earnedMarks = round2(outcomes.reduce((sum, outcome) => sum + outcome.awardedMarks, 0));
  const maxMarks = round2(outcomes.reduce((sum, outcome) => sum + outcome.maxMarks, 0));
  const percentage = maxMarks > 0 ? round2(Math.max(0, (earnedMarks / maxMarks) * 100)) : 0;

  return {
    outcomes,
    totalQuestions: outcomes.length,
    correctAnswers,
    incorrectAnswers,
    unansweredQuestions,
    earnedMarks,
    maxMarks,
    percentage,
    passStatus: percentage >= passThresholdPercent ? "PASS" : "FAIL",
  };
}

/**
 * Build the persisted answer-review payload from a graded attempt.
 *
 * Everything here is expressed in *display* space so it lines up with the
 * `options` array: the student saw the options in a shuffled order, and the
 * review must show their selection and the correct answer in that same order.
 * Canonical indices are translated into display positions.
 */
export function buildAnswerReview(
  summary: GradeSummary,
  optionMapping: Record<string, number[]>,
  responses: Record<string, number[]>,
): AnswerReviewEntry[] {
  return summary.outcomes.map((outcome) => {
    const mapping = optionMapping[outcome.question.id];

    // canonical index -> display position
    const displayPositionOf = new Map<number, number>();
    (mapping ?? []).forEach((canonicalIndex, displayIndex) => {
      displayPositionOf.set(canonicalIndex, displayIndex);
    });

    const correctIndices = outcome.question.correctOptionIndices
      .map((canonicalIndex) => displayPositionOf.get(canonicalIndex))
      .filter((position): position is number => position !== undefined)
      .sort((a, b) => a - b);

    return {
      questionId: outcome.question.id,
      position: outcome.position,
      questionText: outcome.question.questionText,
      questionType: outcome.question.questionType,
      difficulty: outcome.question.difficulty,
      options: displayOptions(outcome.question, mapping),
      // The raw response is already in display space.
      selectedIndices: [...new Set(responses[outcome.question.id] ?? [])].sort((a, b) => a - b),
      correctIndices: correctIndices.length > 0 ? correctIndices : outcome.question.correctOptionIndices,
      explanation: outcome.question.explanation,
      isCorrect: outcome.isCorrect,
      isAnswered: outcome.isAnswered,
      awardedMarks: outcome.awardedMarks,
      maxMarks: outcome.maxMarks,
    };
  });
}
