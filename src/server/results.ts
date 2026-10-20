import { all, one } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { AnswerReviewEntry, ExamAttemptRow, ExamTemplateRow, ResultRow } from "@/types";

export interface ResultListItem extends ResultRow {
  templateName: string;
  templateSlug: string;
  attemptToken: string;
  timeLimitMinutes: number;
}

export async function listResultsForUser(userId: string): Promise<ResultListItem[]> {
  return all<ResultListItem>(
    `SELECT r.*, t."name" AS "templateName", t."slug" AS "templateSlug",
            a."attemptToken" AS "attemptToken", t."durationMinutes" AS "timeLimitMinutes"
     FROM "Result" r
     JOIN "ExamAttempt"  a ON a."id" = r."attemptId"
     JOIN "ExamTemplate" t ON t."id" = a."templateId"
     WHERE r."userId" = ?
     ORDER BY COALESCE(r."submittedAt", r."createdAt") DESC`,
    [userId],
  );
}

export async function listAllResults(limit = 200): Promise<(ResultListItem & { studentName: string | null; studentEmail: string })[]> {
  return all<ResultListItem & { studentName: string | null; studentEmail: string }>(
    `SELECT r.*, t."name" AS "templateName", t."slug" AS "templateSlug",
            a."attemptToken" AS "attemptToken", t."durationMinutes" AS "timeLimitMinutes",
            u."name" AS "studentName", u."email" AS "studentEmail"
     FROM "Result" r
     JOIN "ExamAttempt"  a ON a."id" = r."attemptId"
     JOIN "ExamTemplate" t ON t."id" = a."templateId"
     JOIN "User"         u ON u."id" = r."userId"
     ORDER BY COALESCE(r."submittedAt", r."createdAt") DESC
     LIMIT ?`,
    [limit],
  );
}

export interface ResultDetail {
  result: ResultRow;
  attempt: ExamAttemptRow;
  template: ExamTemplateRow;
  review: AnswerReviewEntry[];
}

export async function findResultDetail(id: string): Promise<ResultDetail | null> {
  const result = await one<ResultRow>('SELECT * FROM "Result" WHERE "id" = ?', [id]);
  if (!result) return null;

  const attempt = await one<ExamAttemptRow>('SELECT * FROM "ExamAttempt" WHERE "id" = ?', [result.attemptId]);
  if (!attempt) return null;

  const template = await one<ExamTemplateRow>('SELECT * FROM "ExamTemplate" WHERE "id" = ?', [attempt.templateId]);
  if (!template) return null;

  return {
    result,
    attempt,
    template,
    review: parseJson<AnswerReviewEntry[]>(result.answerReview, []),
  };
}

/** Look up the graded result for an attempt, used to redirect finished exams. */
export async function findResultIdByAttemptToken(token: string): Promise<string | null> {
  const row = await one<{ id: string }>(
    `SELECT r."id" FROM "Result" r
     JOIN "ExamAttempt" a ON a."id" = r."attemptId"
     WHERE a."attemptToken" = ?`,
    [token],
  );
  return row?.id ?? null;
}

export async function requireResultDetail(id: string): Promise<ResultDetail> {
  const detail = await findResultDetail(id);
  if (!detail) throw new NotFoundError("That result does not exist.");
  return detail;
}

/** Students may only read their own results. */
export function assertCanViewResult(
  detail: ResultDetail,
  viewer: { id: string; role: string },
): void {
  if (viewer.role === "INSTRUCTOR" || viewer.role === "ADMINISTRATOR") return;
  if (detail.result.userId !== viewer.id) {
    throw new ForbiddenError("That result belongs to another student.");
  }
}

export interface UserStats {
  attempts: number;
  averagePercentage: number;
  bestPercentage: number;
  passed: number;
  failed: number;
}

export async function statsForUser(userId: string): Promise<UserStats> {
  const row = await one<{
    attempts: string;
    average: string | null;
    best: string | null;
    passed: string;
    failed: string;
  }>(
    `SELECT COUNT(*)                                                    AS "attempts",
            ROUND(AVG("percentage")::numeric, 2)                        AS "average",
            MAX("percentage")                                           AS "best",
            SUM(CASE WHEN "passStatus" = 'PASS' THEN 1 ELSE 0 END)     AS "passed",
            SUM(CASE WHEN "passStatus" = 'FAIL' THEN 1 ELSE 0 END)     AS "failed"
     FROM "Result" WHERE "userId" = ?`,
    [userId],
  );

  return {
    attempts: Number(row?.attempts ?? 0),
    averagePercentage: Number(row?.average ?? 0),
    bestPercentage: Number(row?.best ?? 0),
    passed: Number(row?.passed ?? 0),
    failed: Number(row?.failed ?? 0),
  };
}

/** Recent results across the platform, for the admin dashboard. */
export async function platformStats(): Promise<{
  users: number;
  students: number;
  questions: number;
  publishedQuestions: number;
  templates: number;
  attempts: number;
  results: number;
  averagePercentage: number;
}> {
  const scalar = async (sql: string): Promise<number> => {
    const row = await one<{ n: string }>(sql);
    return Number(row?.n ?? 0);
  };

  const [users, students, questions, publishedQuestions, templates, attempts, results, avgRow] =
    await Promise.all([
      scalar('SELECT COUNT(*) AS "n" FROM "User"'),
      scalar(`SELECT COUNT(*) AS "n" FROM "User" WHERE "role" = 'STUDENT' OR "role" = 'EMPLOYEE'`),
      scalar('SELECT COUNT(*) AS "n" FROM "Question"'),
      scalar(`SELECT COUNT(*) AS "n" FROM "Question" WHERE "status" = 'PUBLISHED'`),
      scalar('SELECT COUNT(*) AS "n" FROM "ExamTemplate"'),
      scalar('SELECT COUNT(*) AS "n" FROM "ExamAttempt"'),
      scalar('SELECT COUNT(*) AS "n" FROM "Result"'),
      one<{ v: string | null }>('SELECT ROUND(AVG("percentage")::numeric, 2) AS "v" FROM "Result"'),
    ]);

  return {
    users, students, questions, publishedQuestions, templates, attempts, results,
    averagePercentage: Number(avgRow?.v ?? 0),
  };
}