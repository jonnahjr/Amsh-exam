import { NextResponse } from "next/server";
import { handleError, ok } from "@/lib/http";
import { getSessionUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { recordAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

/** Clear the session cookie. */
export async function POST(): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (user) {
      recordAudit({
        userId: user.id,
        action: "LOGOUT",
        entity: "User",
        entityId: user.id,
      });
    }

    const response = ok({ signedOut: true });
    // Overwrite with an immediately-expiring cookie of the same shape.
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    return handleError(error);
  }
}
