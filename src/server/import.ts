import { randomUUID } from "node:crypto";
import { run } from "@/lib/db";
import { stringifyJson } from "@/lib/json";
import { ValidationError } from "@/lib/errors";
import { importRowSchema } from "@/lib/validation";
import { createQuestion } from "@/server/questions";
import { findCategoryBySlug, findSubjectBySlug, findTopicBySlug } from "@/server/taxonomy";
import type { ImportJobRow, ImportType } from "@/types";

/**
 * CSV and JSON question import.
 *
 * Each row is validated and inserted independently: valid rows are imported,
 * invalid rows are reported with their line number so the file can be fixed
 * and re-uploaded.
 */

export interface RowFailure {
  row: number;
  error: string;
}

export interface ImportOutcome {
  jobId: string;
  totalRows: number;
  imported: number;
  skipped: number;
  failedRows: RowFailure[];
}

// ------------------------------------------------------------- CSV parser ---

/**
 * Parse CSV text into rows of cells.
 *
 * Handles quoted fields, escaped quotes (""), embedded newlines and commas,
 * and both CRLF and LF line endings.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM if the spreadsheet tool added one.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char === "\r") {
      // handled by the \n branch
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string> = {
  questiontext: "questionText",
  question: "questionText",
  text: "questionText",
  questiontype: "questionType",
  type: "questionType",
  difficulty: "difficulty",
  options: "options",
  option1: "option1",
  option2: "option2",
  option3: "option3",
  option4: "option4",
  option5: "option5",
  option6: "option6",
  correctoptionindices: "correctOptionIndices",
  correct: "correctOptionIndices",
  answer: "correctOptionIndices",
  explanation: "explanation",
  marks: "marks",
  negativemarks: "negativeMarks",
  subjectslug: "subjectSlug",
  subject: "subjectSlug",
  topicslug: "topicSlug",
  topic: "topicSlug",
  categoryslug: "categorySlug",
  category: "categorySlug",
  tags: "tags",
  learningobjectives: "learningObjectives",
  source: "source",
  status: "status",
};

export function normaliseHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return HEADER_ALIASES[key] ?? key;
}

/** Accept "0|2", "0,2", "0 2" or a JSON array for multi-answer columns. */
export function splitDelimited(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed.map((entry) => String(entry));
    } catch {
      // fall through to the delimiter path
    }
  }
  return trimmed
    .split(/[|;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseIndexList(value: string): number[] {
  return splitDelimited(value)
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isInteger(entry) && entry >= 0);
}

/** Rows as objects keyed by the normalised header names. */
export function csvRowsToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const headers = rows[0].map(normaliseHeader);
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });
    return record;
  });
}

// ----------------------------------------------------------- row mapping ----

/** Resolve a raw object (from CSV or JSON) into the validated question input. */
async function toQuestionPayload(raw: Record<string, unknown>): Promise<Record<string, unknown>> {
  const asString = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    return text === "" ? undefined : text;
  };

  // CSV carries options as option1..optionN; JSON may carry an array.
  let options: string[];
  if (Array.isArray(raw.options)) {
    options = raw.options.map((entry) => String(entry));
  } else if (typeof raw.options === "string" && raw.options.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw.options) as unknown;
      options = Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
    } catch {
      options = splitDelimited(raw.options);
    }
  } else if (typeof raw.options === "string" && raw.options.includes("|")) {
    options = splitDelimited(raw.options);
  } else {
    options = [];
    for (let index = 1; index <= 10; index += 1) {
      const value = asString(raw[`option${index}`]);
      if (value === undefined) break;
      options.push(value);
    }
  }

  let correctOptionIndices: number[];
  if (Array.isArray(raw.correctOptionIndices)) {
    correctOptionIndices = raw.correctOptionIndices
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry >= 0);
  } else if (typeof raw.correctOptionIndices === "string") {
    correctOptionIndices = parseIndexList(raw.correctOptionIndices);
  } else {
    correctOptionIndices = [];
  }

  let tags: string[];
  if (Array.isArray(raw.tags)) {
    tags = raw.tags.map((entry) => String(entry).trim()).filter(Boolean);
  } else if (typeof raw.tags === "string" && raw.tags.trim()) {
    tags = splitDelimited(raw.tags);
  } else {
    tags = [];
  }

  const payload: Record<string, unknown> = {
    questionText: asString(raw.questionText),
    options,
    correctOptionIndices,
    tags,
  };

  for (const key of [
    "questionType",
    "difficulty",
    "explanation",
    "learningObjectives",
    "source",
    "status",
  ] as const) {
    const value = asString(raw[key]);
    if (value !== undefined) payload[key] = value;
  }

  for (const key of ["marks", "negativeMarks"] as const) {
    const value = raw[key];
    if (value === undefined || value === null || value === "") continue;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) payload[key] = numeric;
  }

  // Taxonomy can be given as slugs (friendlier) or as ids.
  for (const key of ["categoryId", "subjectId", "topicId"] as const) {
    const value = asString(raw[key]);
    if (value !== undefined) payload[key] = value;
  }

  const categorySlug = asString(raw.categorySlug);
  const subjectSlug = asString(raw.subjectSlug);
  const topicSlug = asString(raw.topicSlug);

  if (categorySlug) {
    const category = await findCategoryBySlug(categorySlug);
    if (!category) throw new Error(`Unknown category slug "${categorySlug}".`);
    payload.categoryId = category.id;
  }

  if (subjectSlug) {
    const subject = await findSubjectBySlug(subjectSlug);
    if (!subject) throw new Error(`Unknown subject slug "${subjectSlug}".`);
    payload.subjectId = subject.id;
    payload.categoryId = payload.categoryId ?? subject.categoryId;
  }

  if (topicSlug) {
    const topic = await findTopicBySlug(topicSlug);
    if (!topic) throw new Error(`Unknown topic slug "${topicSlug}".`);
    payload.topicId = topic.id;
  }

  // Drop keys the schema does not know about before validating.
  return payload;
}

// --------------------------------------------------------------- service ----

export interface ImportParams {
  userId: string;
  fileName: string;
  fileType: ImportType;
  content: string;
}

export async function importQuestions({ userId, fileName, fileType, content }: ImportParams): Promise<ImportOutcome> {
  const jobId = randomUUID();
  const startedAt = new Date().toISOString();

  await run(
    `INSERT INTO "ImportJob"
       ("id","userId","fileName","fileType","status","totalRows","imported","skipped","failedRows",
        "startedAt","completedAt","createdAt","updatedAt")
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [jobId, userId, fileName, fileType, "RUNNING", 0, 0, 0, null, startedAt, null, startedAt, startedAt],
  );

  let rawRows: Record<string, unknown>[] = [];

  try {
    if (fileType === "CSV") {
      rawRows = csvRowsToObjects(content);
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new ValidationError("The uploaded file is not valid JSON.");
      }
      if (!Array.isArray(parsed)) {
        throw new ValidationError("The JSON file must contain an array of question objects.");
      }
      rawRows = parsed as Record<string, unknown>[];
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not parse the file.";
    await finishJob(jobId, { status: "FAILED", totalRows: 0, imported: 0, skipped: 0, failedRows: [{ row: 0, error: message }] });
    throw error instanceof ValidationError ? error : new ValidationError(message);
  }

  const failedRows: RowFailure[] = [];
  let imported = 0;
  let skipped = 0;

  for (let index = 0; index < rawRows.length; index += 1) {
    const raw = rawRows[index];
    const rowNumber = index + 1;
    try {
      const payload = await toQuestionPayload(raw);
      const parsed = importRowSchema.safeParse(payload);
      if (!parsed.success) {
        const message = parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`)
          .join("; ");
        failedRows.push({ row: rowNumber, error: message });
        skipped += 1;
        continue;
      }
      await createQuestion(parsed.data, userId);
      imported += 1;
    } catch (error) {
      failedRows.push({
        row: rowNumber,
        error: error instanceof Error ? error.message : "Unknown error.",
      });
      skipped += 1;
    }
  }

  const status = failedRows.length > 0 && imported === 0 ? "FAILED" : "COMPLETED";
  await finishJob(jobId, { status, totalRows: rawRows.length, imported, skipped, failedRows });

  return { jobId, totalRows: rawRows.length, imported, skipped, failedRows };
}

async function finishJob(
  jobId: string,
  outcome: {
    status: ImportJobRow["status"];
    totalRows: number;
    imported: number;
    skipped: number;
    failedRows: RowFailure[];
  },
): Promise<void> {
  const timestamp = new Date().toISOString();
  await run(
    `UPDATE "ImportJob"
     SET "status" = ?, "totalRows" = ?, "imported" = ?, "skipped" = ?, "failedRows" = ?,
         "completedAt" = ?, "updatedAt" = ?
     WHERE "id" = ?`,
    [
      outcome.status,
      outcome.totalRows,
      outcome.imported,
      outcome.skipped,
      stringifyJson(outcome.failedRows.slice(0, 200)),
      timestamp,
      timestamp,
      jobId,
    ],
  );
}

// The CSV template constants the import page renders live in
// `@/lib/csv-template` so the client bundle never reaches this module.
