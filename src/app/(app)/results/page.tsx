import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listAllResults } from "@/server/results";
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

export default async function ResultsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isStaff = user.role === "INSTRUCTOR" || user.role === "ADMINISTRATOR";
  if (!isStaff) {
    redirect("/exams");
  }

  const results = await listAllResults();
  const totalAttempts = results.length;
  const passedCount = results.filter((r) => r.passStatus === "PASS").length;
  const avgScore = totalAttempts > 0 ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalAttempts) : 0;
  const bestScore = totalAttempts > 0 ? Math.max(...results.map((r) => r.percentage)) : 0;

  return (
    <div className="results-white-theme">
      <PageHeader
        title="All student results"
        description={`Showing the ${results.length} most recent submitted attempts across all candidates.`}
      />

      <div className="stack">
        {totalAttempts > 0 && (
          <div className="grid">
            <Stat label="Total Submissions" value={totalAttempts} />
            <Stat label="Average Score" value={`${avgScore}%`} />
            <Stat label="Highest Score" value={`${bestScore}%`} />
            <Stat label="Passed" value={`${passedCount} / ${totalAttempts}`} />
          </div>
        )}

        {results.length === 0 ? (
          <EmptyState title="No results yet">
            <p className="muted">
              No student has submitted an exam yet.
            </p>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
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
                {results.map((result) => {
                  const withStudent = result as typeof result & {
                    studentName?: string | null;
                    studentEmail?: string;
                  };
                  return (
                    <tr key={result.id}>
                      <td>
                        {withStudent.studentName ?? withStudent.studentEmail ?? "Unknown"}
                      </td>
                      <td>{result.templateName}</td>
                      <td className="num">
                        <strong>{result.percentage}%</strong>
                      </td>
                      <td className="num">
                        {formatMarks(result.earnedMarks)} / {formatMarks(result.maxMarks)}
                      </td>
                      <td className="num">
                        {result.correctAnswers}/{result.totalQuestions}
                      </td>
                      <td>
                        <PassBadge passStatus={result.passStatus} />
                      </td>
                      <td className="num nowrap">{formatDurationSeconds(result.durationSeconds)}</td>
                      <td className="nowrap">{formatDateTime(result.submittedAt)}</td>
                      <td>
                        <Link className="btn btn-sm" href={`/results/${result.id}`}>
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
