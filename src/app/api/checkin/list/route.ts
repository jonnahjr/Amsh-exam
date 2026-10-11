import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { handleError, ok } from "@/lib/http";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/checkin/list — admin only: list recent check-ins */
export async function GET(): Promise<NextResponse> {
  try {
    await requireRole("ADMINISTRATOR", "INSTRUCTOR");

    const items = all<{
      id: string;
      employeeName: string;
      status: string;
      checkedInAt: string;
      approvedAt: string | null;
      approvedBy: string | null;
    }>(
      `SELECT "id","employeeName","status","checkedInAt","approvedAt","approvedBy"
       FROM "CheckIn"
       ORDER BY "checkedInAt" DESC
       LIMIT 100`,
    );

    return NextResponse.json({ items });
  } catch (error) {
    return handleError(error);
  }
}
