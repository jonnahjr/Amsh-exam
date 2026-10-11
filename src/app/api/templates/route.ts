import { NextResponse } from "next/server";
import { created, handleError, ok, readJsonBody } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { templateInputSchema } from "@/lib/validation";
import { countAvailableQuestions } from "@/server/questions";
import { createTemplate, listTemplates } from "@/server/templates";
import { clientAddress, recordAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

/** List exam templates. Students only see published ones. */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireRole("STUDENT");
    const includeUnpublished = user.role !== "STUDENT";

    const templates = listTemplates({ includeUnpublished }).map((template) => ({
      ...template,
      availableQuestions: countAvailableQuestions(template),
    }));

    return ok({ items: templates });
  } catch (error) {
    return handleError(error);
  }
}

/** Create an exam template. Requires at least the INSTRUCTOR role. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR");
    const body = await readJsonBody(request);
    const input = templateInputSchema.parse(body);

    const template = createTemplate(input);

    recordAudit({
      userId: user.id,
      action: "TEMPLATE_CREATED",
      entity: "ExamTemplate",
      entityId: template.id,
      details: { slug: template.slug, totalQuestions: template.totalQuestions },
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    return created(template);
  } catch (error) {
    return handleError(error);
  }
}
