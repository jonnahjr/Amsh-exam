import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { countAvailableQuestions } from "@/server/questions";
import { findTemplateWithNames } from "@/server/templates";
import { findActiveAttempt } from "@/server/attempts";
import { StartExamButton } from "@/components/StartExamButton";
import { one } from "@/lib/db";
import { validateM100Code } from "@/server/m100";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({ params }: { params: { slug: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const template = await findTemplateWithNames(params.slug);
  if (!template) notFound();
  if (!template.isPublic && (user.role === "STUDENT" || user.role === "EMPLOYEE")) notFound();

  const [available, activeAttempt] = await Promise.all([
    countAvailableQuestions(template),
    findActiveAttempt(user.id, template.id),
  ]);
  const ready = available >= template.totalQuestions;

  let hasApprovedCheckin = true;
  if (user.role === "STUDENT" || user.role === "EMPLOYEE") {
    const checkin = await one<{ id: string }>(
      `SELECT "id" FROM "CheckIn"
       WHERE ("id" = ? OR LOWER("employeeName") = LOWER(?))
         AND "status" = 'APPROVED'
       ORDER BY "checkedInAt" DESC
       LIMIT 1`,
      [user.id, user.name ?? ""],
    );
    if (checkin) {
      hasApprovedCheckin = true;
    } else {
      const userRow = await one<{ m100Code: string | null }>(
        `SELECT "m100Code" FROM "User" WHERE "id" = ?`,
        [user.id],
      );
      if (userRow?.m100Code) {
        const m100Val = await validateM100Code(userRow.m100Code, user.id);
        hasApprovedCheckin = m100Val.valid;
      } else {
        hasApprovedCheckin = false;
      }
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}>
      <div>
        <Link href="/exams" className="res-back-link">
          <span>←</span> All exams
        </Link>
      </div>

      <div
        className="card"
        style={{
          padding: "40px 48px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#000000", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            {template.name}
          </h1>
          {template.description && (
            <p style={{ color: "#475569", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 16px" }}>
              {template.description}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              paddingTop: 12,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <span
              style={{
                background: "rgba(37, 99, 235, 0.08)",
                color: "#2563eb",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              {template.subjectName ?? template.categoryName ?? "General"}
            </span>
            <span
              style={{
                background: "#f8fafc",
                color: "#334155",
                border: "1px solid #e2e8f0",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              {template.totalQuestions} Questions
            </span>
            <span
              style={{
                background: "#f8fafc",
                color: "#334155",
                border: "1px solid #e2e8f0",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              {template.durationMinutes} Minutes
            </span>
            <span
              style={{
                background: "#f8fafc",
                color: "#334155",
                border: "1px solid #e2e8f0",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              Pass Mark: {template.passThresholdPercent}%
            </span>
          </div>
        </div>

        {!ready && (
          <div className="alert alert-warning" style={{ marginTop: 20 }}>
            <strong>This exam is not ready to sit yet.</strong> It needs{" "}
            {template.totalQuestions} questions but only {available} published question
            {available === 1 ? "" : "s"} match its scope.
          </div>
        )}

        {activeAttempt && (
          <div className="alert alert-info" style={{ marginTop: 20 }}>
            You have an attempt for this exam in progress. Resume it to continue your test.
          </div>
        )}

        {!hasApprovedCheckin && !activeAttempt && (
          <div className="alert alert-warning" style={{ marginTop: 20 }}>
            <strong>Check-in required:</strong> Your previous session has ended. Please check in at the front desk to receive administrator authorization before beginning this exam.
          </div>
        )}

        <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
          {activeAttempt ? (
            <Link
              className="btn btn-primary"
              href={`/attempt/${activeAttempt.attemptToken}`}
              style={{ padding: "12px 28px", fontSize: "1rem", height: 46 }}
            >
              Resume attempt →
            </Link>
          ) : !hasApprovedCheckin ? (
            <Link
              className="btn btn-primary"
              href="/checkin"
              style={{ padding: "12px 28px", fontSize: "1rem", height: 46, display: "inline-flex", alignItems: "center" }}
            >
              Go to Check-In Desk →
            </Link>
          ) : (
            <StartExamButton slug={template.slug} disabled={!ready} />
          )}
        </div>
      </div>
    </div>
  );
}
