import { NextResponse } from "next/server";
import { handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { listAllResults, listResultsForUser } from "@/server/results";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    if (user.role === "STUDENT" || user.role === "EMPLOYEE") {
      return ok({ items: await listResultsForUser(user.id), scope: "own" });
    }
    return ok({ items: await listAllResults(), scope: "all" });
  } catch (error) {
    return handleError(error);
  }
}