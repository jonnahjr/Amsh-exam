import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/admin/login");
  }

  if (user.role === "ADMINISTRATOR" || user.role === "INSTRUCTOR") {
    redirect("/admin/checkins");
  }

  redirect("/");
}
