import { NextResponse } from "next/server";
import { handleError, ok, readJsonBody } from "@/lib/http";
import { NotFoundError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { templateInputSchema } from "@/lib/validation";
import { deleteTemplate, findTemplateById, updateTemplate } from "@/server/templates";
import { clientAddress, recordAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

interface Context { params: { id: string }; }

export async function GET(_request: Request, { params }: Context): Promise<NextResponse> {
  try {
    await requireRole("STUDENT");
    const template = await findTemplateById(params.id);
    if (!template) throw new NotFoundError("That exam template does not exist.");
    return ok(template);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Context): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR");
    const body = await readJsonBody(request);
    const input = templateInputSchema.parse(body);
    const template = await updateTemplate(params.id, input);
    recordAudit({
      userId: user.id, action: "TEMPLATE_UPDATED",
      entity: "ExamTemplate", entityId: template.id,
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });
    return ok(template);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: Context): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR");
    await deleteTemplate(params.id);
    recordAudit({
      userId: user.id, action: "TEMPLATE_DELETED",
      entity: "ExamTemplate", entityId: params.id,
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}