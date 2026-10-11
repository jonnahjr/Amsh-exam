/**
 * CSV import template constants.
 *
 * Kept in `lib` rather than `server` because the import form renders them in
 * the browser; importing from `@/server/import` would pull `node:sqlite` into
 * the client bundle.
 */

export const CSV_TEMPLATE_HEADERS = [
  "questionText",
  "questionType",
  "difficulty",
  "option1",
  "option2",
  "option3",
  "option4",
  "correctOptionIndices",
  "explanation",
  "marks",
  "subjectSlug",
  "topicSlug",
  "tags",
  "status",
].join(",");

export const CSV_TEMPLATE_SAMPLE = [
  '"Which port does HTTPS use by default?"',
  "SINGLE_CHOICE",
  "EASY",
  '"21"',
  '"80"',
  '"443"',
  '"8080"',
  "2",
  '"HTTPS uses TCP port 443."',
  "1",
  "aws-fundamentals",
  "s3",
  '"network"',
  "PUBLISHED",
].join(",");

export const VALID_QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "SCENARIO",
  "MATCHING",
  "ESSAY",
] as const;

export const VALID_DIFFICULTIES = ["EASY", "INTERMEDIATE", "HARD", "EXPERT"] as const;
export const VALID_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
