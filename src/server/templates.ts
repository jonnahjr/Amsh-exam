import { randomUUID } from "node:crypto";
import { all, fromBool, one, run, toBool, transaction } from "@/lib/db";
import { parseJson, stringifyJson } from "@/lib/json";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { TemplateInput } from "@/lib/validation";
import type { Difficulty, ExamTemplate, ExamTemplateRow } from "@/types";

/** Turn a raw row into a template with its JSON and boolean columns converted. */
export function hydrateTemplate(row: ExamTemplateRow): ExamTemplate {
  return {
    ...row,
    negativeMarking: toBool(row.negativeMarking),
    randomizeQuestions: toBool(row.randomizeQuestions),
    randomizeOptions: toBool(row.randomizeOptions),
    avoidPreviouslySeen: toBool(row.avoidPreviouslySeen),
    allowReuse: toBool(row.allowReuse),
    autoSubmitOnExpiry: toBool(row.autoSubmitOnExpiry),
    isPublic: toBool(row.isPublic),
    topicWeights: parseJson<Record<string, number>>(row.topicWeights, {}),
    difficultyDistribution: parseJson<Partial<Record<Difficulty, number>>>(
      row.difficultyDistribution,
      {},
    ),
  };
}

export interface TemplateListItem extends ExamTemplate {
  subjectName: string | null;
  categoryName: string | null;
}

export function listTemplates(options: { includeUnpublished?: boolean } = {}): TemplateListItem[] {
  const rows = all<ExamTemplateRow & { subjectName: string | null; categoryName: string | null }>(
    `SELECT t.*, s."name" AS "subjectName", c."name" AS "categoryName"
     FROM "ExamTemplate" t
     LEFT JOIN "Subject"  s ON s."id" = t."subjectId"
     LEFT JOIN "Category" c ON c."id" = t."categoryId"
     ${options.includeUnpublished ? "" : "WHERE t.\"isPublic\" = 1"}
     ORDER BY t."name"`,
  );

  return rows.map((row) => ({
    ...hydrateTemplate(row),
    subjectName: row.subjectName,
    categoryName: row.categoryName,
  }));
}

export function findTemplateBySlug(slug: string): ExamTemplate | null {
  const row = one<ExamTemplateRow>('SELECT * FROM "ExamTemplate" WHERE "slug" = ?', [slug]);
  return row ? hydrateTemplate(row) : null;
}

export function findTemplateById(id: string): ExamTemplate | null {
  const row = one<ExamTemplateRow>('SELECT * FROM "ExamTemplate" WHERE "id" = ?', [id]);
  return row ? hydrateTemplate(row) : null;
}

export function findTemplateWithNames(
  slug: string,
): (ExamTemplate & { subjectName: string | null; categoryName: string | null }) | null {
  const row = one<
    ExamTemplateRow & { subjectName: string | null; categoryName: string | null }
  >(
    `SELECT t.*, s."name" AS "subjectName", c."name" AS "categoryName"
     FROM "ExamTemplate" t
     LEFT JOIN "Subject"  s ON s."id" = t."subjectId"
     LEFT JOIN "Category" c ON c."id" = t."categoryId"
     WHERE t."slug" = ?`,
    [slug],
  );
  if (!row) return null;
  return {
    ...hydrateTemplate(row),
    subjectName: row.subjectName,
    categoryName: row.categoryName,
  };
}

export function countTemplates(): number {
  return one<{ n: number }>('SELECT COUNT(*) AS "n" FROM "ExamTemplate"')?.n ?? 0;
}

// ---------------------------------------------------------------- writes ----

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function replaceDifficultyRows(templateId: string, distribution: Partial<Record<Difficulty, number>> | null | undefined): void {
  run('DELETE FROM "DifficultyDistribution" WHERE "templateId" = ?', [templateId]);
  let order = 0;
  for (const [difficulty, weight] of Object.entries(distribution ?? {})) {
    if (typeof weight !== "number" || weight <= 0) continue;
    run(
      'INSERT INTO "DifficultyDistribution" ("id","templateId","difficulty","weight","order") VALUES (?,?,?,?,?)',
      [randomUUID(), templateId, difficulty, weight, order],
    );
    order += 1;
  }
}

export function createTemplate(input: TemplateInput): ExamTemplate {
  const slug = input.slug ?? slugify(input.name);
  if (!slug) throw new ConflictError("Could not derive a slug from that name.");

  if (findTemplateBySlug(slug)) {
    throw new ConflictError(`A template with the slug "${slug}" already exists.`);
  }

  const id = randomUUID();
  const timestamp = new Date().toISOString();

  transaction(() => {
    run(
      `INSERT INTO "ExamTemplate"
        ("id","slug","name","categoryId","subjectId","topicWeights","totalQuestions","durationMinutes",
         "marksPerQuestion","negativeMarking","difficultyDistribution","randomizeQuestions","randomizeOptions",
         "avoidPreviouslySeen","allowReuse","autoSubmitOnExpiry","passThresholdPercent","description","isPublic",
         "publishedAt","createdAt","updatedAt")
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        slug,
        input.name,
        input.categoryId ?? null,
        input.subjectId ?? null,
        input.topicWeights ? stringifyJson(input.topicWeights) : null,
        input.totalQuestions,
        input.durationMinutes,
        input.marksPerQuestion,
        fromBool(input.negativeMarking),
        input.difficultyDistribution ? stringifyJson(input.difficultyDistribution) : null,
        fromBool(input.randomizeQuestions),
        fromBool(input.randomizeOptions),
        fromBool(input.avoidPreviouslySeen),
        fromBool(input.allowReuse),
        fromBool(input.autoSubmitOnExpiry),
        input.passThresholdPercent,
        input.description ?? null,
        fromBool(input.isPublic),
        timestamp,
        timestamp,
        timestamp,
      ],
    );
    replaceDifficultyRows(id, input.difficultyDistribution);
  });

  const created = findTemplateById(id);
  if (!created) throw new ConflictError("The template was written but could not be read back.");
  return created;
}

export function updateTemplate(id: string, input: TemplateInput): ExamTemplate {
  const existing = findTemplateById(id);
  if (!existing) throw new NotFoundError("That exam template does not exist.");

  const timestamp = new Date().toISOString();

  transaction(() => {
    run(
      `UPDATE "ExamTemplate" SET
         "name" = ?, "categoryId" = ?, "subjectId" = ?, "topicWeights" = ?,
         "totalQuestions" = ?, "durationMinutes" = ?, "marksPerQuestion" = ?,
         "negativeMarking" = ?, "difficultyDistribution" = ?, "randomizeQuestions" = ?,
         "randomizeOptions" = ?, "avoidPreviouslySeen" = ?, "allowReuse" = ?,
         "autoSubmitOnExpiry" = ?, "passThresholdPercent" = ?, "description" = ?,
         "isPublic" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      [
        input.name,
        input.categoryId ?? null,
        input.subjectId ?? null,
        input.topicWeights ? stringifyJson(input.topicWeights) : null,
        input.totalQuestions,
        input.durationMinutes,
        input.marksPerQuestion,
        fromBool(input.negativeMarking),
        input.difficultyDistribution ? stringifyJson(input.difficultyDistribution) : null,
        fromBool(input.randomizeQuestions),
        fromBool(input.randomizeOptions),
        fromBool(input.avoidPreviouslySeen),
        fromBool(input.allowReuse),
        fromBool(input.autoSubmitOnExpiry),
        input.passThresholdPercent,
        input.description ?? null,
        fromBool(input.isPublic),
        timestamp,
        id,
      ],
    );
    replaceDifficultyRows(id, input.difficultyDistribution);
  });

  const updated = findTemplateById(id);
  if (!updated) throw new NotFoundError("That exam template does not exist.");
  return updated;
}

/**
 * Delete a template.
 *
 * Attempts cascade, so this refuses once anyone has taken the exam rather than
 * silently destroying their history.
 */
export function deleteTemplate(id: string): void {
  const existing = findTemplateById(id);
  if (!existing) throw new NotFoundError("That exam template does not exist.");

  const attempts =
    one<{ n: number }>('SELECT COUNT(*) AS "n" FROM "ExamAttempt" WHERE "templateId" = ?', [id])
      ?.n ?? 0;

  if (attempts > 0) {
    throw new ConflictError(
      `This exam has ${attempts} recorded attempt${attempts === 1 ? "" : "s"}. ` +
        "Unpublish it instead of deleting it so past results stay intact.",
    );
  }

  run('DELETE FROM "ExamTemplate" WHERE "id" = ?', [id]);
}

export function setTemplateVisibility(id: string, isPublic: boolean): ExamTemplate {
  const { changes } = run('UPDATE "ExamTemplate" SET "isPublic" = ?, "updatedAt" = ? WHERE "id" = ?', [
    fromBool(isPublic),
    new Date().toISOString(),
    id,
  ]);
  if (changes === 0) throw new NotFoundError("That exam template does not exist.");

  const updated = findTemplateById(id);
  if (!updated) throw new NotFoundError("That exam template does not exist.");
  return updated;
}
