import { NextResponse } from "next/server";
import { handleError, ok, readJsonBody } from "@/lib/http";
import { NotFoundError } from "@/lib/errors";
import { canAuthorContent, requireRole } from "@/lib/auth";
import { questionUpdateSchema } from "@/lib/validation";
import { deleteQuestion, findQuestionById, toPublicQuestion, updateQuestion } from "@/server/questions";
import { clientAddress, recordAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

interface Context { params: { id: string }; }

export async function GET(_request: Request, { params }: Context): Promise<NextResponse> {
  try {
    const user = await requireRole("STUDENT");
    const question = await findQuestionById(params.id);
    if (!question) throw new NotFoundError("That question does not exist.");
    return ok(canAuthorContent(user) ? question : toPublicQuestion(question));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Context): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR");
    const body = await readJsonBody(request);
    const input = questionUpdateSchema.parse(body);
    const question = await updateQuestion(params.id, input);
    recordAudit({
      userId: user.id, action: "QUESTION_UPDATED",
      entity: "Question", entityId: question.id,
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });
    return ok(question);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: Context): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR");
    await deleteQuestion(params.id);
    recordAudit({
      userId: user.id, action: "QUESTION_DELETED",
      entity: "Question", entityId: params.id,
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}