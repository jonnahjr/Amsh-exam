import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listAttemptsGroupedByUser } from "@/server/results";
import {
  EmptyState,
  PageHeader,
  PassBadge,
  Stat,
  formatDateTime,
  formatDurationSeconds,
  formatMarks,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/** How often each candidate sat an exam, and their score on every attempt. */
export default async function AdminAttemptsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const groups = await listAttemptsGroupedByUser();
  const totalAttempts = groups.reduce((sum, group) => sum + group.attempts.length, 0);

  return (
    <>
      <PageHeader
        title="Attempts by candidate"
        description="Every candidate's attempt count with the score they earned on each one, newest activity first."
      />

      {groups.length === 0 ? (
        <EmptyState title="No submitted attempts yet">
          <p className="muted">Scores appear here as soon as a candidate submits an exam.</p>
        </EmptyState>
      ) : (
        <div className="stack">
          <div className="grid">
            <Stat label="Candidates" value={groups.length} />
            <Stat label="Attempts" value={totalAttempts} />
          </div>

          {groups.map((group) => {
            const scores = group.attempts.map((attempt) => attempt.percentage);
            const best = Math.max(...scores);
            const average = Math.round(
              scores.reduce((sum, score) => sum + score, 0) / scores.length,
            );
            const passed = group.attempts.filter(
              (attempt) => attempt.passStatus === "PASS",
            ).length;

            return (
              <section key={group.userId} className="card">
                <div className="row-between" style={{ marginBottom: 8 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{group.name ?? group.email}</h3>
                    <div className="small muted">{group.email}</div>
                  </div>
                  <div className="row">
                    <span className="badge badge-accent">
                      {group.attempts.length} attempt
                      {group.attempts.length === 1 ? "" : "s"}
                    </span>
                    <span className="badge">Passed {passed}/{group.attempts.length}</span>
                    <span className="badge">Best {best}%</span>
                    <span className="badge">Avg {average}%</span>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="num">#</th>
                        <th>Exam</th>
                        <th className="num">Score</th>
                        <th className="num">Marks</th>
                        <th className="num">Correct</th>
                        <th>Outcome</th>
                        <th className="num">Time</th>
                        <th>Submitted</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {group.attempts.map((attempt, index) => (
                        <tr key={attempt.id}>
                          <td className="num small">{index + 1}</td>
                          <td className="small">{attempt.templateName}</td>
                          <td className="num">
                            <strong>{attempt.percentage}%</strong>
                          </td>
                          <td className="num small">
                            {formatMarks(attempt.earnedMarks)} / {formatMarks(attempt.maxMarks)}
                          </td>
                          <td className="num small">
                            {attempt.correctAnswers}/{attempt.totalQuestions}
                          </td>
                          <td>
                            <PassBadge passStatus={attempt.passStatus} />
                          </td>
                          <td className="num small nowrap">
                            {formatDurationSeconds(attempt.durationSeconds)}
                          </td>
                          <td className="small nowrap">
                            {formatDateTime(attempt.submittedAt)}
                          </td>
                          <td>
                            <Link className="btn btn-sm" href={`/results/${attempt.id}`}>
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}