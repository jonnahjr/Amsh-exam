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

export async function listTemplates(options: { includeUnpublished?: boolean } = {}): Promise<TemplateListItem[]> {
  const rows = await all<ExamTemplateRow & { subjectName: string | null; categoryName: string | null }>(
    `SELECT t.*, s."name" AS "subjectName", c."name" AS "categoryName"
     FROM "ExamTemplate" t
     LEFT JOIN "Subject"  s ON s."id" = t."subjectId"
     LEFT JOIN "Category" c ON c."id" = t."categoryId"
     ${options.includeUnpublished ? "" : 'WHERE t."isPublic" = TRUE'}
     ORDER BY CASE WHEN t."slug" = 'mock-exam-1' THEN 0 ELSE 1 END, t."name"`,
  );
  return rows.map((row) => ({
    ...hydrateTemplate(row),
    subjectName: row.subjectName,
    categoryName: row.categoryName,
  }));
}

export async function findTemplateBySlug(slug: string): Promise<ExamTemplate | null> {
  const row = await one<ExamTemplateRow>('SELECT * FROM "ExamTemplate" WHERE "slug" = ?', [slug]);
  return row ? hydrateTemplate(row) : null;
}

export async function findTemplateById(id: string): Promise<ExamTemplate | null> {
  const row = await one<ExamTemplateRow>('SELECT * FROM "ExamTemplate" WHERE "id" = ?', [id]);
  return row ? hydrateTemplate(row) : null;
}

export async function findTemplateWithNames(
  slug: string,
): Promise<(ExamTemplate & { subjectName: string | null; categoryName: string | null }) | null> {
  const row = await one<ExamTemplateRow & { subjectName: string | null; categoryName: string | null }>(
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

export async function countTemplates(): Promise<number> {
  const row = await one<{ n: string }>('SELECT COUNT(*) AS "n" FROM "ExamTemplate"');
  return Number(row?.n ?? 0);
}

// ---------------------------------------------------------------- writes ----

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

type TxHelper = Parameters<Parameters<typeof transaction>[0]>[0];

async function replaceDifficultyRows(
  templateId: string,
  distribution: Partial<Record<Difficulty, number>> | null | undefined,
  q: TxHelper,
): Promise<void> {
  await q.run('DELETE FROM "DifficultyDistribution" WHERE "templateId" = ?', [templateId]);
  let order = 0;
  for (const [difficulty, weight] of Object.entries(distribution ?? {})) {
    if (typeof weight !== "number" || weight <= 0) continue;
    await q.run(
      'INSERT INTO "DifficultyDistribution" ("id","templateId","difficulty","weight","order") VALUES (?,?,?,?,?)',
      [randomUUID(), templateId, difficulty, weight, order],
    );
    order += 1;
  }
}

export async function createTemplate(input: TemplateInput): Promise<ExamTemplate> {
  const slug = input.slug ?? slugify(input.name);
  if (!slug) throw new ConflictError("Could not derive a slug from that name.");

  if (await findTemplateBySlug(slug)) {
    throw new ConflictError(`A template with the slug "${slug}" already exists.`);
  }

  const id = randomUUID();
  const timestamp = new Date().toISOString();

  await transaction(async (q) => {
    await q.run(
      `INSERT INTO "ExamTemplate"
        ("id","slug","name","categoryId","subjectId","topicWeights","totalQuestions","durationMinutes",
         "marksPerQuestion","negativeMarking","difficultyDistribution","randomizeQuestions","randomizeOptions",
         "avoidPreviouslySeen","allowReuse","autoSubmitOnExpiry","passThresholdPercent","description","isPublic",
         "publishedAt","createdAt","updatedAt")
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, slug, input.name, input.categoryId ?? null, input.subjectId ?? null,
        input.topicWeights ? stringifyJson(input.topicWeights) : null,
        input.totalQuestions, input.durationMinutes, input.marksPerQuestion,
        fromBool(input.negativeMarking),
        input.difficultyDistribution ? stringifyJson(input.difficultyDistribution) : null,
        fromBool(input.randomizeQuestions), fromBool(input.randomizeOptions),
        fromBool(input.avoidPreviouslySeen), fromBool(input.allowReuse),
        fromBool(input.autoSubmitOnExpiry), input.passThresholdPercent,
        input.description ?? null, fromBool(input.isPublic), timestamp, timestamp, timestamp,
      ],
    );
    await replaceDifficultyRows(id, input.difficultyDistribution, q);
  });

  const created = await findTemplateById(id);
  if (!created) throw new ConflictError("The template was written but could not be read back.");
  return created;
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<ExamTemplate> {
  const existing = await findTemplateById(id);
  if (!existing) throw new NotFoundError("That exam template does not exist.");

  const timestamp = new Date().toISOString();

  await transaction(async (q) => {
    await q.run(
      `UPDATE "ExamTemplate" SET
         "name" = ?, "categoryId" = ?, "subjectId" = ?, "topicWeights" = ?,
         "totalQuestions" = ?, "durationMinutes" = ?, "marksPerQuestion" = ?,
         "negativeMarking" = ?, "difficultyDistribution" = ?, "randomizeQuestions" = ?,
         "randomizeOptions" = ?, "avoidPreviouslySeen" = ?, "allowReuse" = ?,
         "autoSubmitOnExpiry" = ?, "passThresholdPercent" = ?, "description" = ?,
         "isPublic" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      [
        input.name, input.categoryId ?? null, input.subjectId ?? null,
        input.topicWeights ? stringifyJson(input.topicWeights) : null,
        input.totalQuestions, input.durationMinutes, input.marksPerQuestion,
        fromBool(input.negativeMarking),
        input.difficultyDistribution ? stringifyJson(input.difficultyDistribution) : null,
        fromBool(input.randomizeQuestions), fromBool(input.randomizeOptions),
        fromBool(input.avoidPreviouslySeen), fromBool(input.allowReuse),
        fromBool(input.autoSubmitOnExpiry), input.passThresholdPercent,
        input.description ?? null, fromBool(input.isPublic), timestamp, id,
      ],
    );
    await replaceDifficultyRows(id, input.difficultyDistribution, q);
  });

  const updated = await findTemplateById(id);
  if (!updated) throw new NotFoundError("That exam template does not exist.");
  return updated;
}

export async function deleteTemplate(id: string): Promise<void> {
  const existing = await findTemplateById(id);
  if (!existing) throw new NotFoundError("That exam template does not exist.");

  const row = await one<{ n: string }>('SELECT COUNT(*) AS "n" FROM "ExamAttempt" WHERE "templateId" = ?', [id]);
  const attempts = Number(row?.n ?? 0);

  if (attempts > 0) {
    throw new ConflictError(
      `This exam has ${attempts} recorded attempt${attempts === 1 ? "" : "s"}. ` +
        "Unpublish it instead of deleting it so past results stay intact.",
    );
  }

  await run('DELETE FROM "ExamTemplate" WHERE "id" = ?', [id]);
}

export async function setTemplateVisibility(id: string, isPublic: boolean): Promise<ExamTemplate> {
  const { changes } = await run(
    'UPDATE "ExamTemplate" SET "isPublic" = ?, "updatedAt" = ? WHERE "id" = ?',
    [fromBool(isPublic), new Date().toISOString(), id],
  );
  if (changes === 0) throw new NotFoundError("That exam template does not exist.");

  const updated = await findTemplateById(id);
  if (!updated) throw new NotFoundError("That exam template does not exist.");
  return updated;
}