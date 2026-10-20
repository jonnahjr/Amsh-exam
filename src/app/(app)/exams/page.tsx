import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { availableQuestionCounts } from "@/server/questions";
import { listTemplates } from "@/server/templates";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isStudent = user.role === "STUDENT" || user.role === "EMPLOYEE";
  const [rawTemplates, counts] = await Promise.all([
    listTemplates({ includeUnpublished: !isStudent }),
    availableQuestionCounts(),
  ]);
  const templates = rawTemplates
    .map((template) => {
      const available = template.subjectId
        ? counts.bySubject[template.subjectId]
        : template.categoryId
          ? counts.byCategory[template.categoryId]
          : counts.total;
      return { ...template, available: available ?? 0 };
    })
    // Pin Mock Exam 1 as the first card; everything else keeps its order.
    .sort((a, b) => Number(b.slug === "mock-exam-1") - Number(a.slug === "mock-exam-1"));

  return (
    <>
      <PageHeader
        title="Exams"
        description="Every exam draws a fresh random selection of questions from the bank, so no two attempts are identical."
        actions={
          !isStudent ? (
            <Link className="btn" href="/questions/new">
              New question
            </Link>
          ) : null
        }
      />

      {templates.length === 0 ? (
        <EmptyState title="No exams available">
          <p className="muted">
            Run <code>npm run db:seed</code> to load the demo exams, or create questions first.
          </p>
        </EmptyState>
      ) : (
        <div className="grid">
          {templates.map((template) => {
            const available = template.available;
            const ready = available >= template.totalQuestions;
            return (
              <Link key={template.id} href={`/exams/${template.slug}`} className="card card-link">
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <h3 style={{ margin: 0 }}>{template.name}</h3>
                  {!template.isPublic && <span className="badge">Draft</span>}
                </div>

                {template.description && (
                  <p className="small muted" style={{ marginBottom: 10 }}>
                    {template.description}
                  </p>
                )}

                <div className="card-meta">
                  {template.totalQuestions} questions · {template.durationMinutes} min
                  {template.negativeMarking ? " · negative marking" : ""}
                </div>
                <div className="card-meta">{template.subjectName ?? template.categoryName ?? "All subjects"}</div>

                <div className="row" style={{ marginTop: 12 }}>
                  {ready ? (
                    <span className="badge badge-published">
                      {available} in pool
                    </span>
                  ) : (
                    <span className="badge badge-hard">
                      Only {available} of {template.totalQuestions}
                    </span>
                  )}
                  <span className="badge">Pass {template.passThresholdPercent}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
