import { NextResponse } from "next/server";
import { handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { listAllResults, listResultsForUser } from "@/server/results";

export const dynamic = "force-dynamic";

/**
 * List results.
 *
 * Staff see every student's results; students see only their own.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();

    if (user.role === "STUDENT") {
      return ok({ items: listResultsForUser(user.id), scope: "own" });
    }

    return ok({ items: listAllResults(), scope: "all" });
  } catch (error) {
    return handleError(error);
  }
}
