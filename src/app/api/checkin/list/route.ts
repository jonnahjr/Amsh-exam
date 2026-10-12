import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { handleError } from "@/lib/http";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    await requireRole("ADMINISTRATOR", "INSTRUCTOR");
    const items = await all<{
      id: string; employeeName: string; status: string;
      checkedInAt: string; approvedAt: string | null; approvedBy: string | null;
      totalAttempts: number; totalCompleted: number; bestScore: number | null;
    }>(
      `SELECT
         c."id", c."employeeName", c."status", c."checkedInAt", c."approvedAt", c."approvedBy",
         (SELECT COUNT(*) FROM "ExamAttempt" ea JOIN "User" u ON u."id" = ea."userId" WHERE LOWER(u."name") = LOWER(c."employeeName")) AS "totalAttempts",
         (SELECT COUNT(*) FROM "Result" r JOIN "User" u ON u."id" = r."userId" WHERE LOWER(u."name") = LOWER(c."employeeName")) AS "totalCompleted",
         (SELECT MAX(r."percentage") FROM "Result" r JOIN "User" u ON u."id" = r."userId" WHERE LOWER(u."name") = LOWER(c."employeeName")) AS "bestScore"
       FROM "CheckIn" c
       ORDER BY c."checkedInAt" DESC
       LIMIT 100`,
    );
    return NextResponse.json({ items });
  } catch (error) {
    return handleError(error);
  }
}