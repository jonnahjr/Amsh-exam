import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Create account · Exam Platform" };

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/");

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <span
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, var(--accent), #a78bfa)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
              color: "#fff",
              fontWeight: 700,
              boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
              flexShrink: 0,
            }}
          >
            E
          </span>
          <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>
            Exam Platform
          </span>
        </div>
        <h1>Create your account</h1>
        <p>Sign up to sit mock exams and track your results over time.</p>
        <RegisterForm />
        <p className="small" style={{ marginTop: 18, marginBottom: 0, color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}

