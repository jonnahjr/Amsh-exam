import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listAllResults, listResultsForUser, statsForUser } from "@/server/results";
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

  const isStudent = user.role === "STUDENT";
  const results = await (isStudent ? listResultsForUser(user.id) : listAllResults());
  const stats = isStudent ? await statsForUser(user.id) : null;

  return (
    <div className="results-white-theme">
      <PageHeader
        title={isStudent ? "Your results" : "All student results"}
        description={
          isStudent
            ? "Every attempt you have submitted, newest first. Open one to see the full answer review."
            : `Showing the ${results.length} most recent submitted attempts across all students.`
        }
      />

      <div className="stack">
        {stats && (
          <div className="grid">
            <Stat label="Attempts" value={stats.attempts} />
            <Stat
              label="Average"
              value={stats.attempts === 0 ? "—" : `${stats.averagePercentage}%`}
            />
            <Stat label="Best" value={stats.attempts === 0 ? "—" : `${stats.bestPercentage}%`} />
            <Stat label="Passed" value={`${stats.passed} / ${stats.attempts}`} />
          </div>
        )}

        {results.length === 0 ? (
          <EmptyState title="No results yet">
            <p className="muted">
              {isStudent
                ? "Sit an exam and your marked result will appear here."
                : "No student has submitted an exam yet."}
            </p>
            {isStudent && (
              <Link className="btn btn-primary" href="/exams">
                Browse exams
              </Link>
            )}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {!isStudent && <th>Student</th>}
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
                      {!isStudent && (
                        <td>
                          {withStudent.studentName ?? withStudent.studentEmail ?? "Unknown"}
                        </td>
                      )}
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
