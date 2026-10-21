import { z } from "zod";
import { DIFFICULTIES, PUBLICATION_STATUSES, QUESTION_TYPES } from "@/types";

/**
 * Every API payload is validated here before it reaches the database layer.
 *
 * Shared enums come from `@/types` so the SQLite CHECK constraints, the
 * TypeScript unions, and the runtime validation cannot drift apart.
 */

const difficultyEnum = z.enum(DIFFICULTIES as [string, ...string[]]);
const questionTypeEnum = z.enum(QUESTION_TYPES as [string, ...string[]]);
const publicationStatusEnum = z.enum(PUBLICATION_STATUSES as [string, ...string[]]);

// ------------------------------------------------------------------ auth ----

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
  name: z.string().trim().min(1, "Name is required.").max(120).optional(),
  m100Code: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  m100Code: z.string().trim().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ------------------------------------------------------------- questions ----

const optionList = z
  .array(z.string().trim())
  .max(26, "A question can have at most 26 options.");

export const questionInputSchema = z
  .object({
    questionText: z.string().trim().min(1, "Question text is required.").max(5000),
    questionType: questionTypeEnum.default("SINGLE_CHOICE"),
    difficulty: difficultyEnum.default("EASY"),
    options: optionList.default([]),
    correctOptionIndices: z
      .array(z.number().int().min(0))
      .default([]),
    categoryId: z.string().uuid().nullish(),
    subjectId: z.string().uuid().nullish(),
    topicId: z.string().uuid().nullish(),
    explanation: z.string().trim().max(5000).nullish(),
    marks: z.number().positive("Marks must be greater than zero.").max(1000).default(1),
    negativeMarks: z.number().min(0).max(1000).nullish(),
    tags: z.array(z.string().trim().min(1)).max(20).default([]),
    learningObjectives: z.string().trim().max(2000).nullish(),
    source: z.string().trim().max(300).nullish(),
    status: publicationStatusEnum.default("DRAFT"),
  })
  .superRefine((value, ctx) => {
    const needsOptions =
      value.questionType === "SINGLE_CHOICE" ||
      value.questionType === "MULTIPLE_CHOICE" ||
      value.questionType === "TRUE_FALSE" ||
      value.questionType === "SCENARIO" ||
      value.questionType === "MATCHING";

    if (needsOptions && value.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: `${value.questionType} questions need at least two options.`,
      });
    }

    for (const index of value.correctOptionIndices) {
      if (index >= value.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctOptionIndices"],
          message: `Option index ${index} is out of range; there are ${value.options.length} options.`,
        });
      }
    }

    if (needsOptions && value.correctOptionIndices.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctOptionIndices"],
        message: "Mark at least one option as correct.",
      });
    }

    if (
      (value.questionType === "SINGLE_CHOICE" || value.questionType === "TRUE_FALSE") &&
      value.correctOptionIndices.length > 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctOptionIndices"],
        message: `${value.questionType} questions can only have one correct option.`,
      });
    }

    if (value.negativeMarks != null && value.negativeMarks > value.marks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["negativeMarks"],
        message: "Negative marks cannot exceed the question's marks.",
      });
    }
  });

export const questionUpdateSchema = questionInputSchema;

export type QuestionInput = z.infer<typeof questionInputSchema>;

// ------------------------------------------------------------- templates ----

const difficultyWeights = z.record(difficultyEnum, z.number().min(0).max(1));

export const templateInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers, and hyphens.")
    .max(120)
    .optional(),
  description: z.string().trim().max(2000).nullish(),
  categoryId: z.string().uuid().nullish(),
  subjectId: z.string().uuid().nullish(),
  topicWeights: z.record(z.string(), z.number().min(0)).nullish(),
  totalQuestions: z.number().int().min(1).max(500).default(10),
  durationMinutes: z.number().int().min(1).max(600).default(30),
  marksPerQuestion: z.number().positive().max(100).default(1),
  negativeMarking: z.boolean().default(false),
  difficultyDistribution: difficultyWeights.nullish(),
  randomizeQuestions: z.boolean().default(true),
  randomizeOptions: z.boolean().default(true),
  avoidPreviouslySeen: z.boolean().default(false),
  allowReuse: z.boolean().default(false),
  autoSubmitOnExpiry: z.boolean().default(true),
  passThresholdPercent: z.number().int().min(0).max(100).default(0),
  isPublic: z.boolean().default(true),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;

// -------------------------------------------------------------- attempts ----

export const startAttemptSchema = z.object({
  templateSlug: z.string().trim().min(1, "A template slug is required."),
});

export const saveResponseSchema = z.object({
  questionId: z.string().min(1),
  selectedIndices: z.array(z.number().int().min(0)).max(26).default([]),
  flagged: z.boolean().optional(),
  directionState: z.enum(["FORWARD", "BACKWARD"]).optional(),
});

export type SaveResponseInput = z.infer<typeof saveResponseSchema>;

// ---------------------------------------------------------------- import ----

export const importRowSchema = questionInputSchema;

export const importRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(300),
  fileType: z.enum(["CSV", "JSON"]),
  content: z.string().min(1, "The uploaded file is empty."),
});

export type ImportRequestInput = z.infer<typeof importRequestSchema>;

// ------------------------------------------------------------- pagination ---

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: publicationStatusEnum.optional(),
  difficulty: difficultyEnum.optional(),
  subjectId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
