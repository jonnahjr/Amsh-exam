import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Return the signed-in user, or null. */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    return ok(user);
  } catch (error) {
    return handleError(error);
  }
}
