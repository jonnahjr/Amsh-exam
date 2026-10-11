/**
 * Shared types.
 *
 * `*Row` types mirror the SQLite tables exactly (JSON columns stay as strings).
 * The plain types are the hydrated versions the UI works with.
 */

export type Role = "STUDENT" | "INSTRUCTOR" | "ADMINISTRATOR";
export type Difficulty = "EASY" | "INTERMEDIATE" | "HARD" | "EXPERT";
export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "SCENARIO"
  | "MATCHING"
  | "ESSAY";
export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AttemptStatus = "ACTIVE" | "SUBMITTED" | "EXPIRED" | "CANCELLED";
export type ResultStatus = "PENDING" | "COMPLETED";
export type PassStatus = "PASS" | "FAIL";
export type ImportType = "CSV" | "JSON";
export type ImportStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export const DIFFICULTIES: Difficulty[] = ["EASY", "INTERMEDIATE", "HARD", "EXPERT"];
export const QUESTION_TYPES: QuestionType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "SCENARIO",
  "MATCHING",
  "ESSAY",
];
export const PUBLICATION_STATUSES: PublicationStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

// ------------------------------------------------------------- taxonomy -----

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  code: string | null;
  description: string | null;
  subjectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectRow {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicRow {
  id: string;
  slug: string;
  name: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectWithCategory extends SubjectRow {
  categoryName: string;
  categorySlug: string;
}

// ------------------------------------------------------------ questions -----

export interface QuestionRow {
  id: string;
  questionId: string | null;
  questionText: string;
  categoryId: string | null;
  subjectId: string | null;
  topicId: string | null;
  difficulty: Difficulty;
  questionType: QuestionType;
  options: string;
  correctOptionIndices: string;
  explanation: string | null;
  marks: number;
  negativeMarks: number | null;
  tags: string;
  learningObjectives: string | null;
  source: string | null;
  authorId: string;
  status: PublicationStatus;
  publishedAt: string | null;
  archivedAt: string | null;
  importId: string | null;
  canonicalIndices: string;
  createdAt: string;
  updatedAt: string;
}

/** A question with its JSON columns parsed. */
export interface Question extends Omit<QuestionRow, "options" | "correctOptionIndices" | "tags" | "canonicalIndices"> {
  options: string[];
  correctOptionIndices: number[];
  tags: string[];
  canonicalIndices: number[];
}

/** A question as shown to a student mid-exam: no answers, display order applied. */
export interface AttemptQuestionView {
  questionId: string;
  position: number;
  questionText: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  /** Options in the order this student should see them. */
  options: string[];
  marks: number;
  /** Answer key, included only after submission. */
  correctOptionIndices?: number[];
  explanation?: string | null;
}

// ------------------------------------------------------------ templates -----

export interface ExamTemplateRow {
  id: string;
  slug: string;
  name: string;
  categoryId: string | null;
  subjectId: string | null;
  topicWeights: string | null;
  totalQuestions: number;
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarking: number;
  difficultyDistribution: string | null;
  randomizeQuestions: number;
  randomizeOptions: number;
  avoidPreviouslySeen: number;
  allowReuse: number;
  autoSubmitOnExpiry: number;
  passThresholdPercent: number;
  description: string | null;
  isPublic: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamTemplate
  extends Omit<
    ExamTemplateRow,
    "negativeMarking" | "randomizeQuestions" | "randomizeOptions" | "avoidPreviouslySeen" | "allowReuse" | "autoSubmitOnExpiry" | "isPublic" | "topicWeights" | "difficultyDistribution"
  > {
  negativeMarking: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  avoidPreviouslySeen: boolean;
  allowReuse: boolean;
  autoSubmitOnExpiry: boolean;
  isPublic: boolean;
  topicWeights: Record<string, number>;
  difficultyDistribution: Partial<Record<Difficulty, number>>;
}

// ------------------------------------------------------------- attempts -----

export interface ExamAttemptRow {
  id: string;
  attemptToken: string;
  templateId: string;
  userId: string;
  selectedQuestionIds: string;
  optionMapping: string | null;
  directionState: "FORWARD" | "BACKWARD";
  flags: string;
  responses: string;
  previouslySeen: string;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  status: AttemptStatus;
  startedByUserId: string | null;
  configSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------- results -----

export interface ResultRow {
  id: string;
  attemptId: string;
  userId: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  earnedMarks: number;
  maxMarks: number;
  percentage: number;
  durationSeconds: number | null;
  status: ResultStatus;
  passStatus: PassStatus | null;
  answerReview: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * One row of the post-exam answer review.
 *
 * `options`, `selectedIndices`, and `correctIndices` are all in the same
 * (display) index space, so they can be compared directly when rendering.
 */
export interface AnswerReviewEntry {
  questionId: string;
  position: number;
  questionText: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  options: string[];
  selectedIndices: number[];
  correctIndices: number[];
  explanation: string | null;
  isCorrect: boolean;
  isAnswered: boolean;
  awardedMarks: number;
  maxMarks: number;
}

// --------------------------------------------------------------- misc -------

export interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ImportJobRow {
  id: string;
  userId: string;
  fileName: string;
  fileType: ImportType;
  status: ImportStatus;
  totalRows: number;
  imported: number;
  skipped: number;
  failedRows: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
