import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Root site entrance:
 * When users open the site (http://localhost:3001/ or /),
 * - Visitors/Candidates without a session go directly to /checkin
 * - Staff/Administrators go to /admin
 * - Active students go to /exams
 */
export default async function RootPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/checkin");
  }

  if (user.role === "ADMINISTRATOR" || user.role === "INSTRUCTOR") {
    redirect("/admin");
  }

  redirect("/exams");
}
