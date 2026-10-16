import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Footer } from "@/components/Footer";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Sign In · AMSH Exam" };

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  // Already signed in as admin → go straight to dashboard
  if (user && (user.role === "ADMINISTRATOR" || user.role === "INSTRUCTOR")) {
    redirect("/admin");
  }
  // Non-admin session: just show the login form.
  // Submitting admin credentials via LoginForm will overwrite the session cookie.

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <Image src="/amsh-logo.jpg" alt="AMSH" width={40} height={40} style={{ borderRadius: 10 }} priority />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em", color: "var(--text)" }}>
              AMSH Exam
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>Administrator Portal</div>
          </div>
        </div>

        <h1>Admin Sign In</h1>
        <p>Access the admin dashboard to manage exams, questions, and employee check-ins.</p>

        <LoginForm />
      </div>
      <Footer variant="compact" />
    </div>
  );
}
