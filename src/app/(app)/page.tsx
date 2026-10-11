import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { countAvailableQuestions } from "@/server/questions";
import { listTemplates } from "@/server/templates";
import { listResultsForUser, platformStats, statsForUser } from "@/server/results";
import { EmptyState, PageHeader, PassBadge, Stat, formatDateTime } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/checkin");

  const isStudent = user.role === "STUDENT";
  const studentStats = isStudent ? statsForUser(user.id) : null;
  const overview = isStudent ? null : platformStats();

  const templates = listTemplates({ includeUnpublished: !isStudent }).slice(0, 6);
  const recentResults = listResultsForUser(user.id).slice(0, 5);

  return (
    <>
      <PageHeader
        title={`Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description={
          isStudent
            ? "Pick an exam below, or review how your recent attempts went."
            : "Author questions, assemble exams, and keep an eye on how students are performing."
        }
        actions={
          <>
            <Link className="btn" href="/exams">
              Browse exams
            </Link>
            {!isStudent && (
              <Link className="btn btn-primary" href="/questions/new">
                New question
              </Link>
            )}
          </>
        }
      />

      <div className="stack">
        {isStudent && studentStats ? (
          <div className="grid">
            <Stat label="Exams taken" value={studentStats.attempts} />
            <Stat
              label="Average score"
              value={studentStats.attempts === 0 ? "—" : `${studentStats.averagePercentage}%`}
            />
            <Stat
              label="Best score"
              value={studentStats.attempts === 0 ? "—" : `${studentStats.bestPercentage}%`}
            />
            <Stat
              label="Exams passed"
              value={`${studentStats.passed} / ${studentStats.attempts}`}
            />
          </div>
        ) : null}

        {overview ? (
          <div className="grid">
            <Stat label="Question bank" value={overview.questions} />
            <Stat label="Published" value={overview.publishedQuestions} />
            <Stat label="Exam templates" value={overview.templates} />
            <Stat label="Students" value={overview.students} />
            <Stat label="Attempts" value={overview.attempts} />
            <Stat
              label="Average score"
              value={overview.results === 0 ? "—" : `${overview.averagePercentage}%`}
            />
          </div>
        ) : null}

        <section>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Available exams</h2>
            <Link href="/exams">View all →</Link>
          </div>

          {templates.length === 0 ? (
            <EmptyState title="No exams yet">
              <p className="muted">
                Run <code>npm run db:seed</code> to load the demo question bank and exams.
              </p>
            </EmptyState>
          ) : (
            <div className="grid">
              {templates.map((template) => {
                const available = countAvailableQuestions(template);
                const ready = available >= template.totalQuestions;
                return (
                  <Link
                    key={template.id}
                    href={`/exams/${template.slug}`}
                    className="card card-link"
                  >
                    <div className="row-between" style={{ marginBottom: 6 }}>
                      <h3 style={{ margin: 0 }}>{template.name}</h3>
                      {!template.isPublic && <span className="badge">Unpublished</span>}
                    </div>
                    <div className="card-meta">
                      {template.totalQuestions} questions · {template.durationMinutes} min
                      {template.negativeMarking ? " · negative marking" : ""}
                    </div>
                    <div className="card-meta" style={{ marginTop: 8 }}>
                      {template.subjectName ?? template.categoryName ?? "All subjects"}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      {ready ? (
                        <span className="badge badge-published">Ready</span>
                      ) : (
                        <span className="badge badge-hard">
                          Needs {template.totalQuestions - available} more questions
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Your recent results</h2>
            <Link href="/results">View all →</Link>
          </div>

          {recentResults.length === 0 ? (
            <EmptyState title="No attempts yet">
              <p className="muted">Sit an exam and your marked result will appear here.</p>
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th className="num">Score</th>
                    <th>Outcome</th>
                    <th>Submitted</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentResults.map((result) => (
                    <tr key={result.id}>
                      <td>{result.templateName}</td>
                      <td className="num">{result.percentage}%</td>
                      <td>
                        <PassBadge passStatus={result.passStatus} />
                      </td>
                      <td className="nowrap">{formatDateTime(result.submittedAt)}</td>
                      <td>
                        <Link className="btn btn-sm" href={`/results/${result.id}`}>
                          Review
                        </Link>
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
