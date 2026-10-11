import { NextResponse } from "next/server";
import { handleError, created, ok, readJsonBody } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { listQuerySchema, questionInputSchema } from "@/lib/validation";
import { createQuestion, listQuestions } from "@/server/questions";
import { clientAddress, recordAudit } from "@/server/audit";
import { DIFFICULTIES, PUBLICATION_STATUSES, type Difficulty, type PublicationStatus } from "@/types";

export const dynamic = "force-dynamic";

/** List questions with optional filters. Any signed-in user may read. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireRole("STUDENT");

    const url = new URL(request.url);
    const filters = listQuerySchema.parse(Object.fromEntries(url.searchParams));

    // The query schema validates these as enums; narrow them to the unions the
    // repository expects rather than casting blindly.
    const status = PUBLICATION_STATUSES.includes(filters.status as PublicationStatus)
      ? (filters.status as PublicationStatus)
      : undefined;
    const difficulty = DIFFICULTIES.includes(filters.difficulty as Difficulty)
      ? (filters.difficulty as Difficulty)
      : undefined;

    const result = listQuestions({
      search: filters.q,
      status,
      difficulty,
      subjectId: filters.subjectId,
      page: filters.page,
      pageSize: filters.pageSize,
    });

    return ok({
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pageCount: Math.max(1, Math.ceil(result.total / result.pageSize)),
    });
  } catch (error) {
    return handleError(error);
  }
}

/** Create a question. Requires at least the INSTRUCTOR role. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR");
    const body = await readJsonBody(request);
    const input = questionInputSchema.parse(body);

    const question = createQuestion(input, user.id);

    recordAudit({
      userId: user.id,
      action: "QUESTION_CREATED",
      entity: "Question",
      entityId: question.id,
      details: { status: question.status, difficulty: question.difficulty },
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    return created(question);
  } catch (error) {
    return handleError(error);
  }
}
