import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { created, handleError, readJsonBody } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { importRequestSchema } from "@/lib/validation";
import { importQuestions } from "@/server/import";
import { clientAddress, recordAudit } from "@/server/audit";
import type { ImportJobRow } from "@/types";

export const dynamic = "force-dynamic";

/** Import questions from a CSV or JSON upload. Requires INSTRUCTOR or above. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR");
    const body = await readJsonBody(request);
    const input = importRequestSchema.parse(body);

    const outcome = importQuestions({
      userId: user.id,
      fileName: input.fileName,
      fileType: input.fileType,
      content: input.content,
    });

    recordAudit({
      userId: user.id,
      action: "QUESTIONS_IMPORTED",
      entity: "ImportJob",
      entityId: outcome.jobId,
      details: {
        fileName: input.fileName,
        fileType: input.fileType,
        imported: outcome.imported,
        skipped: outcome.skipped,
      },
      ipAddress: clientAddress(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    return created(outcome);
  } catch (error) {
    return handleError(error);
  }
}

/** Recent import jobs for the current user. */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireRole("INSTRUCTOR");
    const jobs = all<ImportJobRow>(
      'SELECT * FROM "ImportJob" WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT 20',
      [user.id],
    );
    return NextResponse.json({ data: { items: jobs } });
  } catch (error) {
    return handleError(error);
  }
}
