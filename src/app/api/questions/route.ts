import { NextResponse } from "next/server";
import { handleError, created, ok, readJsonBody } from "@/lib/http";
import { canAuthorContent, requireRole } from "@/lib/auth";
import { listQuerySchema, questionInputSchema } from "@/lib/validation";
import { createQuestion, listQuestions, toPublicQuestion } from "@/server/questions";
import { clientAddress, recordAudit } from "@/server/audit";
import { DIFFICULTIES, PUBLICATION_STATUSES, type Difficulty, type PublicationStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR", "ADMINISTRATOR");
    const url = new URL(request.url);
    const filters = listQuerySchema.parse(Object.fromEntries(url.searchParams));

    const status = PUBLICATION_STATUSES.includes(filters.status as PublicationStatus)
      ? (filters.status as PublicationStatus) : undefined;
    const difficulty = DIFFICULTIES.includes(filters.difficulty as Difficulty)
      ? (filters.difficulty as Difficulty) : undefined;

    const result = await listQuestions({
      search: filters.q, status, difficulty,
      subjectId: filters.subjectId,
      page: filters.page, pageSize: filters.pageSize,
    });

    return ok({
      items: canAuthorContent(user) ? result.items : result.items.map(toPublicQuestion),
      total: result.total,
      page: result.page, pageSize: result.pageSize,
      pageCount: Math.max(1, Math.ceil(result.total / result.pageSize)),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR");
    const body = await readJsonBody(request);
    const input = questionInputSchema.parse(body);
    const question = await createQuestion(input, user.id);

    recordAudit({
      userId: user.id, action: "QUESTION_CREATED",
      entity: "Question", entityId: question.id,
      details: { status: question.status, difficulty: question.difficulty },
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    return created(question);
  } catch (error) {
    return handleError(error);
  }
}