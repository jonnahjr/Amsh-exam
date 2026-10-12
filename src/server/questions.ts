import { randomUUID } from "node:crypto";
import { all, one, run, transaction } from "@/lib/db";
import { parseIndexArray, parseStringArray, stringifyJson } from "@/lib/json";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { QuestionInput } from "@/lib/validation";
import type { Difficulty, ExamTemplate, PublicationStatus, Question, QuestionRow } from "@/types";

/** Turn a raw row into a question with its JSON columns parsed. */
export function hydrateQuestion(row: QuestionRow): Question {
  return {
    ...row,
    options: parseStringArray(row.options),
    correctOptionIndices: parseIndexArray(row.correctOptionIndices),
    tags: parseStringArray(row.tags),
    canonicalIndices: parseIndexArray(row.canonicalIndices),
  };
}

export async function findQuestionById(id: string): Promise<Question | null> {
  const row = await one<QuestionRow>('SELECT * FROM "Question" WHERE "id" = ?', [id]);
  return row ? hydrateQuestion(row) : null;
}

export interface QuestionListFilters {
  search?: string;
  status?: PublicationStatus;
  difficulty?: Difficulty;
  subjectId?: string;
  page?: number;
  pageSize?: number;
}

export interface QuestionListItem extends Question {
  subjectName: string | null;
  categoryName: string | null;
  topicName: string | null;
  authorName: string | null;
}

export async function listQuestions(filters: QuestionListFilters = {}): Promise<{
  items: QuestionListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filters.search) {
    where.push('(q."questionText" ILIKE ? OR q."questionId" ILIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like);
  }
  if (filters.status) {
    where.push('q."status" = ?');
    params.push(filters.status);
  }
  if (filters.difficulty) {
    where.push('q."difficulty" = ?');
    params.push(filters.difficulty);
  }
  if (filters.subjectId) {
    where.push('q."subjectId" = ?');
    params.push(filters.subjectId);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRow, rows] = await Promise.all([
    one<{ n: string }>(`SELECT COUNT(*) AS "n" FROM "Question" q ${whereSql}`, params),
    all<QuestionRow & { subjectName: string | null; categoryName: string | null; topicName: string | null; authorName: string | null }>(
      `SELECT q.*,
              s."name" AS "subjectName",
              c."name" AS "categoryName",
              t."name" AS "topicName",
              u."name" AS "authorName"
       FROM "Question" q
       LEFT JOIN "Subject"  s ON s."id" = q."subjectId"
       LEFT JOIN "Category" c ON c."id" = q."categoryId"
       LEFT JOIN "Topic"    t ON t."id" = q."topicId"
       LEFT JOIN "User"     u ON u."id" = q."authorId"
       ${whereSql}
       ORDER BY q."createdAt" DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);

  return {
    items: rows.map((row) => ({
      ...hydrateQuestion(row),
      subjectName: row.subjectName,
      categoryName: row.categoryName,
      topicName: row.topicName,
      authorName: row.authorName,
    })),
    total: Number(countRow?.n ?? 0),
    page,
    pageSize,
  };
}

/**
 * Every published question a template may draw from, honouring its scope.
 */
export async function questionPoolForTemplate(template: ExamTemplate): Promise<Question[]> {
  const where = ['"status" = ?'];
  const params: string[] = ["PUBLISHED"];

  if (template.subjectId) {
    where.push('"subjectId" = ?');
    params.push(template.subjectId);
  } else if (template.categoryId) {
    where.push('"categoryId" = ?');
    params.push(template.categoryId);
  }

  const rows = await all<QuestionRow>(
    `SELECT * FROM "Question" WHERE ${where.join(" AND ")} ORDER BY "createdAt"`,
    params,
  );
  return rows.map(hydrateQuestion);
}

/** Count published questions available to a template. */
export async function countAvailableQuestions(template: ExamTemplate): Promise<number> {
  const where = ['"status" = ?'];
  const params: string[] = ["PUBLISHED"];
  if (template.subjectId) {
    where.push('"subjectId" = ?');
    params.push(template.subjectId);
  } else if (template.categoryId) {
    where.push('"categoryId" = ?');
    params.push(template.categoryId);
  }
  const row = await one<{ n: string }>(
    `SELECT COUNT(*) AS "n" FROM "Question" WHERE ${where.join(" AND ")}`,
    params,
  );
  return Number(row?.n ?? 0);
}

/** Question ids this user has already been shown for a given template. */
export async function previouslySeenQuestionIds(userId: string, templateId: string): Promise<string[]> {
  const rows = await all<{ selectedQuestionIds: string }>(
    `SELECT "selectedQuestionIds" FROM "ExamAttempt" WHERE "userId" = ? AND "templateId" = ?`,
    [userId, templateId],
  );
  const seen = new Set<string>();
  for (const row of rows) {
    for (const id of parseStringArray(row.selectedQuestionIds)) seen.add(id);
  }
  return [...seen];
}

export async function countQuestions(): Promise<number> {
  const row = await one<{ n: string }>('SELECT COUNT(*) AS "n" FROM "Question"');
  return Number(row?.n ?? 0);
}

// ---------------------------------------------------------------- writes ----

type TxHelper = Parameters<Parameters<typeof transaction>[0]>[0];

/** Upsert tag rows and rebuild the join rows for one question. */
async function syncTags(questionId: string, tags: string[], q: TxHelper): Promise<void> {
  await q.run('DELETE FROM "QuestionTag" WHERE "questionId" = ?', [questionId]);
  const timestamp = new Date().toISOString();

  for (const rawTag of tags) {
    const name = rawTag.trim();
    if (!name) continue;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) continue;

    let tagRow = await q.one<{ id: string }>('SELECT "id" FROM "Tag" WHERE "slug" = ?', [slug]);
    if (!tagRow) {
      const tagId = randomUUID();
      await q.run(
        'INSERT INTO "Tag" ("id","slug","name","createdAt","updatedAt") VALUES (?,?,?,?,?)',
        [tagId, slug, name, timestamp, timestamp],
      );
      tagRow = { id: tagId };
    }
    await q.run(
      'INSERT INTO "QuestionTag" ("questionId","tagId") VALUES (?,?) ON CONFLICT DO NOTHING',
      [questionId, tagRow.id],
    );
  }
}

async function nextQuestionCode(): Promise<string> {
  const row = await one<{ n: string }>('SELECT COUNT(*) AS "n" FROM "Question"');
  return `Q${String(Number(row?.n ?? 0) + 1).padStart(5, "0")}`;
}

export async function createQuestion(input: QuestionInput, authorId: string): Promise<Question> {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  const publishedAt = input.status === "PUBLISHED" ? timestamp : null;
  const archivedAt = input.status === "ARCHIVED" ? timestamp : null;
  const qCode = await nextQuestionCode();

  await transaction(async (q) => {
    await q.run(
      `INSERT INTO "Question"
        ("id","questionId","questionText","categoryId","subjectId","topicId","difficulty","questionType",
         "options","correctOptionIndices","explanation","marks","negativeMarks","tags","learningObjectives",
         "source","authorId","status","publishedAt","archivedAt","importId","canonicalIndices","createdAt","updatedAt")
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, qCode, input.questionText,
        input.categoryId ?? null, input.subjectId ?? null, input.topicId ?? null,
        input.difficulty, input.questionType,
        stringifyJson(input.options), stringifyJson(input.correctOptionIndices),
        input.explanation ?? null, input.marks, input.negativeMarks ?? null,
        stringifyJson(input.tags), input.learningObjectives ?? null, input.source ?? null,
        authorId, input.status, publishedAt, archivedAt, null,
        stringifyJson(input.options.map((_, index) => index)),
        timestamp, timestamp,
      ],
    );
    await syncTags(id, input.tags, q);
  });

  const created = await findQuestionById(id);
  if (!created) throw new ConflictError("The question was written but could not be read back.");
  return created;
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<Question> {
  const existing = await findQuestionById(id);
  if (!existing) throw new NotFoundError("That question does not exist.");

  const timestamp = new Date().toISOString();
  const publishedAt = input.status === "PUBLISHED" ? (existing.publishedAt ?? timestamp) : existing.publishedAt;
  const archivedAt = input.status === "ARCHIVED" ? (existing.archivedAt ?? timestamp) : null;

  await transaction(async (q) => {
    await q.run(
      `UPDATE "Question" SET
         "questionText" = ?, "categoryId" = ?, "subjectId" = ?, "topicId" = ?,
         "difficulty" = ?, "questionType" = ?, "options" = ?, "correctOptionIndices" = ?,
         "explanation" = ?, "marks" = ?, "negativeMarks" = ?, "tags" = ?,
         "learningObjectives" = ?, "source" = ?, "status" = ?, "publishedAt" = ?,
         "archivedAt" = ?, "canonicalIndices" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      [
        input.questionText, input.categoryId ?? null, input.subjectId ?? null, input.topicId ?? null,
        input.difficulty, input.questionType,
        stringifyJson(input.options), stringifyJson(input.correctOptionIndices),
        input.explanation ?? null, input.marks, input.negativeMarks ?? null,
        stringifyJson(input.tags), input.learningObjectives ?? null, input.source ?? null,
        input.status, publishedAt, archivedAt,
        stringifyJson(input.options.map((_, index) => index)),
        timestamp, id,
      ],
    );
    await syncTags(id, input.tags, q);
  });

  const updated = await findQuestionById(id);
  if (!updated) throw new NotFoundError("That question does not exist.");
  return updated;
}

export async function deleteQuestion(id: string): Promise<void> {
  const existing = await findQuestionById(id);
  if (!existing) throw new NotFoundError("That question does not exist.");

  const row = await one<{ n: string }>(
    'SELECT COUNT(*) AS "n" FROM "AttemptQuestion" WHERE "questionId" = ?',
    [id],
  );
  const used = Number(row?.n ?? 0);

  if (used > 0) {
    throw new ConflictError(
      `This question appears in ${used} exam attempt${used === 1 ? "" : "s"}. ` +
        "Archive it instead of deleting it so past results stay intact.",
    );
  }

  await run('DELETE FROM "Question" WHERE "id" = ?', [id]);
}

export async function publishQuestion(id: string): Promise<Question> {
  const existing = await findQuestionById(id);
  if (!existing) throw new NotFoundError("That question does not exist.");

  await run('UPDATE "Question" SET "status" = ?, "publishedAt" = ?, "updatedAt" = ? WHERE "id" = ?', [
    "PUBLISHED",
    existing.publishedAt ?? new Date().toISOString(),
    new Date().toISOString(),
    id,
  ]);

  const updated = await findQuestionById(id);
  if (!updated) throw new NotFoundError("That question does not exist.");
  return updated;
}

export async function archiveQuestion(id: string): Promise<Question> {
  const timestamp = new Date().toISOString();
  const { changes } = await run(
    'UPDATE "Question" SET "status" = ?, "archivedAt" = ?, "updatedAt" = ? WHERE "id" = ?',
    ["ARCHIVED", timestamp, timestamp, id],
  );
  if (changes === 0) throw new NotFoundError("That question does not exist.");

  const updated = await findQuestionById(id);
  if (!updated) throw new NotFoundError("That question does not exist.");
  return updated;
}

/** Difficulty mix of a template pool, used on the exam detail page. */
export async function poolBreakdown(template: ExamTemplate): Promise<Record<string, number>> {
  const pool = await questionPoolForTemplate(template);
  const breakdown: Record<string, number> = {};
  for (const question of pool) {
    breakdown[question.difficulty] = (breakdown[question.difficulty] ?? 0) + 1;
  }
  return breakdown;
}

/** Exposed for the import service, which inserts in bulk. */
export const questionInternals = {
  syncTags,
  nextQuestionCode,
  hydrateQuestion,
};