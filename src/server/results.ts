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

export function listResultsForUser(userId: string): ResultListItem[] {
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

export function listAllResults(limit = 200): (ResultListItem & { studentName: string | null; studentEmail: string })[] {
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

export function findResultDetail(id: string): ResultDetail | null {
  const result = one<ResultRow>('SELECT * FROM "Result" WHERE "id" = ?', [id]);
  if (!result) return null;

  const attempt = one<ExamAttemptRow>('SELECT * FROM "ExamAttempt" WHERE "id" = ?', [
    result.attemptId,
  ]);
  if (!attempt) return null;

  const template = one<ExamTemplateRow>('SELECT * FROM "ExamTemplate" WHERE "id" = ?', [
    attempt.templateId,
  ]);
  if (!template) return null;

  return {
    result,
    attempt,
    template,
    review: parseJson<AnswerReviewEntry[]>(result.answerReview, []),
  };
}

/** Look up the graded result for an attempt, used to redirect finished exams. */
export function findResultIdByAttemptToken(token: string): string | null {
  return (
    one<{ id: string }>(
      `SELECT r."id" FROM "Result" r
       JOIN "ExamAttempt" a ON a."id" = r."attemptId"
       WHERE a."attemptToken" = ?`,
      [token],
    )?.id ?? null
  );
}

export function requireResultDetail(id: string): ResultDetail {
  const detail = findResultDetail(id);
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

export function statsForUser(userId: string): UserStats {
  const row = one<{
    attempts: number;
    average: number | null;
    best: number | null;
    passed: number;
    failed: number;
  }>(
    `SELECT COUNT(*)                                             AS "attempts",
            ROUND(AVG("percentage"), 2)                          AS "average",
            MAX("percentage")                                    AS "best",
            SUM(CASE WHEN "passStatus" = 'PASS' THEN 1 ELSE 0 END) AS "passed",
            SUM(CASE WHEN "passStatus" = 'FAIL' THEN 1 ELSE 0 END) AS "failed"
     FROM "Result" WHERE "userId" = ?`,
    [userId],
  );

  return {
    attempts: row?.attempts ?? 0,
    averagePercentage: row?.average ?? 0,
    bestPercentage: row?.best ?? 0,
    passed: row?.passed ?? 0,
    failed: row?.failed ?? 0,
  };
}

/** Recent results across the platform, for the admin dashboard. */
export function platformStats(): {
  users: number;
  students: number;
  questions: number;
  publishedQuestions: number;
  templates: number;
  attempts: number;
  results: number;
  averagePercentage: number;
} {
  const scalar = (sql: string): number => one<{ n: number }>(sql)?.n ?? 0;

  return {
    users: scalar('SELECT COUNT(*) AS "n" FROM "User"'),
    students: scalar('SELECT COUNT(*) AS "n" FROM "User" WHERE "role" = \'STUDENT\''),
    questions: scalar('SELECT COUNT(*) AS "n" FROM "Question"'),
    publishedQuestions: scalar('SELECT COUNT(*) AS "n" FROM "Question" WHERE "status" = \'PUBLISHED\''),
    templates: scalar('SELECT COUNT(*) AS "n" FROM "ExamTemplate"'),
    attempts: scalar('SELECT COUNT(*) AS "n" FROM "ExamAttempt"'),
    results: scalar('SELECT COUNT(*) AS "n" FROM "Result"'),
    averagePercentage:
      one<{ v: number | null }>('SELECT ROUND(AVG("percentage"), 2) AS "v" FROM "Result"')?.v ?? 0,
  };
}
