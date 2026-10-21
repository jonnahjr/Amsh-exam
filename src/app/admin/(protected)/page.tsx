import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { platformStats } from "@/server/results";
import { PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

interface CandidateStat {
  candidateName: string;
  m100Code?: string | null;
  totalCheckIns: number;
  totalAttempts: number;
  totalCompleted: number;
  avgScore: number | null;
  bestScore: number | null;
  lastActive: string | null;
  latestStatus: string;
}

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  if (user.role !== "ADMINISTRATOR" && user.role !== "INSTRUCTOR") {
    redirect("/admin/login");
  }

  const [overview, pendingCheckinsRow, candidateStats] = await Promise.all([
    platformStats(),
    one<{ c: number }>('SELECT COUNT(*) AS "c" FROM "CheckIn" WHERE "status" = \'PENDING\''),
    all<CandidateStat>(`
    SELECT 
      c."employeeName" AS "candidateName",
      (
        SELECT u2."m100Code" 
        FROM "User" u2 
        WHERE LOWER(u2."name") = LOWER(c."employeeName") AND u2."m100Code" IS NOT NULL
        LIMIT 1
      ) AS "m100Code",
      COUNT(c."id") AS "totalCheckIns",
      (
        SELECT COUNT(DISTINCT ea."id") 
        FROM "ExamAttempt" ea 
        JOIN "User" u ON u."id" = ea."userId" 
        WHERE LOWER(u."name") = LOWER(c."employeeName")
      ) AS "totalAttempts",
      (
        SELECT COUNT(DISTINCT r."id") 
        FROM "Result" r 
        JOIN "User" u ON u."id" = r."userId" 
        WHERE LOWER(u."name") = LOWER(c."employeeName")
      ) AS "totalCompleted",
      (
        SELECT ROUND(AVG(r."percentage")::numeric, 1)
        FROM "Result" r 
        JOIN "User" u ON u."id" = r."userId" 
        WHERE LOWER(u."name") = LOWER(c."employeeName")
      ) AS "avgScore",
      (
        SELECT MAX(r."percentage") 
        FROM "Result" r 
        JOIN "User" u ON u."id" = r."userId" 
        WHERE LOWER(u."name") = LOWER(c."employeeName")
      ) AS "bestScore",
      MAX(c."checkedInAt") AS "lastActive",
      (
        SELECT c2."status" 
        FROM "CheckIn" c2 
        WHERE LOWER(c2."employeeName") = LOWER(c."employeeName") 
        ORDER BY c2."checkedInAt" DESC 
        LIMIT 1
      ) AS "latestStatus"
    FROM "CheckIn" c
    GROUP BY c."employeeName"
    ORDER BY "lastActive" DESC
  `),
  ]);
  const pendingCheckinsCount = pendingCheckinsRow?.c ?? 0;

  return (
    <>
      <PageHeader
        title="Admin Control Center"
        description="Comprehensive dashboard for employee authorizations, test attempt frequency tracking, and question bank manipulation."
        actions={
          <div className="row" style={{ gap: 10 }}>
            <Link className="btn btn-primary" href="/admin/checkins">
              Approve Check-Ins {pendingCheckinsCount > 0 ? `(${pendingCheckinsCount} Pending)` : ""}
            </Link>
            <Link className="btn" href="/questions/new">
              + New Question
            </Link>
            <Link className="btn" href="/questions">
              Question Bank
            </Link>
          </div>
        }
      />

      <div className="stack" style={{ gap: 28 }}>
        {/* Key Operational Metrics */}
        <div className="grid">
          <Stat
            label="Pending Check-Ins"
            value={pendingCheckinsCount}
          />
          <Stat label="Total Questions" value={overview.questions} />
          <Stat label="Active Exam Pools" value={overview.templates} />
          <Stat label="Exams Delivered" value={overview.attempts} />
          <Stat label="Completed Results" value={overview.results} />
          <Stat label="Platform Avg Score" value={`${overview.averagePercentage}%`} />
        </div>

        {/* Quick Access Action Hub */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Candidate Check-Ins</h3>
                {pendingCheckinsCount > 0 ? (
                  <span className="badge badge-accent" style={{ background: "var(--warning)", color: "#000" }}>
                    {pendingCheckinsCount} waiting
                  </span>
                ) : (
                  <span className="badge badge-published">All clear</span>
                )}
              </div>
              <p className="small muted">
                Review and approve incoming candidate check-in requests in real time before they begin their exam.
              </p>
            </div>
            <Link className="btn btn-primary btn-block" href="/admin/checkins" style={{ marginTop: 14 }}>
              Open Check-In Queue →
            </Link>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Question Bank Management</h3>
                <span className="badge">{overview.publishedQuestions} published</span>
              </div>
              <p className="small muted">
                Add, modify, edit options, correct answers, difficulty ratings, or delete questions in the bank.
              </p>
            </div>
            <div className="row" style={{ marginTop: 14, gap: 8 }}>
              <Link className="btn btn-block" href="/questions" style={{ flex: 1 }}>
                Browse & Edit →
              </Link>
              <Link className="btn btn-primary" href="/questions/new">
                + Add
              </Link>
            </div>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Bulk Add Exam & Import</h3>
                <span className="badge">Tools</span>
              </div>
              <p className="small muted">
                Paste bulk text or upload JSON/CSV exam files to insert 100-question exams instantly.
              </p>
            </div>
            <div className="row" style={{ marginTop: 14, gap: 8 }}>
              <Link className="btn btn-block" href="/admin/bulk-exam" style={{ flex: 1 }}>
                Bulk Exam →
              </Link>
              <Link className="btn" href="/admin/import">
                Import
              </Link>
            </div>
          </div>
        </div>

        {/* Candidate Test Attempt History & Frequency */}
        <section className="card">
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Candidate Attempt Frequency & Performance</h2>
              <p className="small muted" style={{ margin: "4px 0 0" }}>
                Tracks exactly how many times each employee/candidate has checked in, started tests, and scored.
              </p>
            </div>
            <span className="badge badge-accent">
              {candidateStats.length} Unique Candidate{candidateStats.length === 1 ? "" : "s"}
            </span>
          </div>

          {candidateStats.length === 0 ? (
            <div className="empty">
              <p className="muted">No candidate check-ins recorded yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Candidate Name</th>
                    <th>Times Tested</th>
                    <th>Check-Ins</th>
                    <th>Completed Tests</th>
                    <th>Best Score</th>
                    <th>Average Score</th>
                    <th>Latest Status</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateStats.map((item) => (
                    <tr key={item.candidateName}>
                      <td style={{ fontWeight: 600, color: "var(--text)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{item.candidateName}</span>
                          {item.m100Code && (
                            <span className="badge badge-accent" style={{ fontSize: "0.72rem", padding: "2px 6px" }}>
                              {item.m100Code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            fontWeight: 700,
                            background: item.totalAttempts > 0 ? "rgba(37, 99, 235, 0.1)" : "var(--surface-alt)",
                            borderColor: item.totalAttempts > 0 ? "var(--accent)" : "var(--border)",
                            color: item.totalAttempts > 0 ? "var(--accent)" : "var(--text-muted)",
                          }}
                        >
                          {item.totalAttempts} time{item.totalAttempts === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td>{item.totalCheckIns} check-in{item.totalCheckIns === 1 ? "" : "s"}</td>
                      <td>
                        <strong>{item.totalCompleted}</strong> finished
                      </td>
                      <td>
                        {item.bestScore !== null ? (
                          <strong style={{ color: "var(--success)" }}>{item.bestScore}%</strong>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {item.avgScore !== null ? (
                          <span>{item.avgScore}%</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${item.latestStatus === "APPROVED" ? "badge-published" : item.latestStatus === "PENDING" ? "badge-accent" : "badge-fail"}`}>
                          {item.latestStatus}
                        </span>
                      </td>
                      <td className="muted small">
                        {item.lastActive ? new Date(item.lastActive).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
