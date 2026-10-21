import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminLayoutClient } from "@/components/AdminLayoutClient";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/admin/login");
  }

  // Strictly block any student, employee, or non-admin from accessing admin pages & settings
  if (user.role !== "ADMINISTRATOR" && user.role !== "INSTRUCTOR") {
    redirect("/admin/login");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
