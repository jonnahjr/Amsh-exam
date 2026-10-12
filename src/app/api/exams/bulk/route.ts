import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { one, run, transaction, fromBool } from "@/lib/db";
import { stringifyJson } from "@/lib/json";
import { created, handleError, readJsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { clientAddress, recordAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

interface BulkQuestionInput {
  questionText: string;
  options: string[];
  correctOptionIndices: number[];
  explanation?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  marks?: number;
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR", "ADMINISTRATOR");
    const body = (await readJsonBody(request)) as Record<string, unknown> | null;

    const examName = (body?.examName ?? "").toString().trim();
    const description = (body?.description ?? "").toString().trim();
    const durationMinutes = Math.max(1, Math.min(600, Number(body?.durationMinutes ?? 30)));
    const passThresholdPercent = Math.max(0, Math.min(100, Number(body?.passThresholdPercent ?? 70)));
    const rawQuestions = Array.isArray(body?.questions) ? (body.questions as BulkQuestionInput[]) : [];

    if (!examName || examName.length < 2) throw new AppError("Please provide an exam name (at least 2 characters).", 400, "VALIDATION");
    if (rawQuestions.length === 0) throw new AppError("No questions were provided.", 400, "VALIDATION");

    const validQuestions: BulkQuestionInput[] = [];
    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      const text = (q.questionText ?? "").trim();
      const opts = Array.isArray(q.options) ? q.options.map((o) => (o ?? "").toString().trim()).filter(Boolean) : [];
      const corrects = Array.isArray(q.correctOptionIndices)
        ? q.correctOptionIndices.filter((idx) => typeof idx === "number" && idx >= 0 && idx < opts.length) : [];
      if (!text) continue;
      if (opts.length < 2) throw new AppError(`Question ${i + 1} must have at least 2 options.`, 400, "VALIDATION");
      if (corrects.length === 0) throw new AppError(`Question ${i + 1} does not have a correct answer selected.`, 400, "VALIDATION");
      validQuestions.push({
        questionText: text, options: opts, correctOptionIndices: corrects,
        explanation: (q.explanation ?? "").trim() || undefined,
        difficulty: ["EASY", "MEDIUM", "HARD"].includes(q.difficulty ?? "") ? q.difficulty : "MEDIUM",
        marks: Math.max(1, Number(q.marks ?? 1)),
      });
    }

    if (validQuestions.length === 0) throw new AppError("No valid questions found.", 400, "VALIDATION");

    const timestamp = new Date().toISOString();
    const templateId = randomUUID();

    // Slug uniqueness check
    let baseSlug = slugify(examName) || `exam-${Date.now().toString(36)}`;
    let slug = baseSlug;
    let counter = 1;
    while (await one('SELECT "id" FROM "ExamTemplate" WHERE "slug" = ?', [slug])) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Find or create subject
    let subject = await one<{ id: string }>('SELECT "id" FROM "Subject" WHERE LOWER("name") = LOWER(?)', [examName]);
    let subjectId = subject?.id;
    if (!subjectId) {
      const firstCat = await one<{ id: string }>('SELECT "id" FROM "Category" LIMIT 1');
      const catId = firstCat?.id ?? randomUUID();
      if (!firstCat) {
        await run(`INSERT INTO "Category" ("id","name","slug","createdAt","updatedAt") VALUES (?,?,?,?,?)`, [catId, "General", "general", timestamp, timestamp]);
      }
      subjectId = randomUUID();
      const subjectSlug = `${slugify(examName)}-${Date.now().toString(36).slice(-4)}`;
      await run(`INSERT INTO "Subject" ("id","categoryId","name","slug","createdAt","updatedAt") VALUES (?,?,?,?,?,?)`, [subjectId, catId, examName, subjectSlug, timestamp, timestamp]);
    }

    await transaction(async (q) => {
      for (const qu of validQuestions) {
        const qId = randomUUID();
        const qType = qu.correctOptionIndices.length > 1 ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE";
        await q.run(
          `INSERT INTO "Question" ("id","questionText","categoryId","subjectId","topicId","difficulty","questionType","options","correctOptionIndices","explanation","marks","negativeMarks","tags","learningObjectives","source","authorId","status","publishedAt","archivedAt","canonicalIndices","createdAt","updatedAt")
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [qId, qu.questionText, null, subjectId, null, qu.difficulty ?? "MEDIUM", qType,
           stringifyJson(qu.options), stringifyJson(qu.correctOptionIndices),
           qu.explanation ?? null, qu.marks ?? 1, null, stringifyJson([]), null, "Bulk Import",
           user.id, "PUBLISHED", timestamp, null,
           stringifyJson(qu.options.map((_, idx) => idx)), timestamp, timestamp],
        );
      }
      await q.run(
        `INSERT INTO "ExamTemplate" ("id","slug","name","categoryId","subjectId","topicWeights","totalQuestions","durationMinutes","marksPerQuestion","negativeMarking","difficultyDistribution","randomizeQuestions","randomizeOptions","avoidPreviouslySeen","allowReuse","autoSubmitOnExpiry","passThresholdPercent","description","isPublic","publishedAt","createdAt","updatedAt")
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [templateId, slug, examName, null, subjectId, null, validQuestions.length, durationMinutes,
         1, fromBool(false), null, fromBool(true), fromBool(true), fromBool(false), fromBool(false),
         fromBool(true), passThresholdPercent, description || `Exam with ${validQuestions.length} questions.`,
         fromBool(true), timestamp, timestamp, timestamp],
      );
    });

    recordAudit({ userId: user.id, action: "TEMPLATE_CREATED", entity: "ExamTemplate", entityId: templateId,
      details: { slug, totalQuestions: validQuestions.length, examName },
      ipAddress: clientAddress(request.headers), userAgent: request.headers.get("user-agent") });

    return created({ success: true, exam: { id: templateId, slug, name: examName, totalQuestions: validQuestions.length, durationMinutes, passThresholdPercent } });
  } catch (error) {
    return handleError(error);
  }
}