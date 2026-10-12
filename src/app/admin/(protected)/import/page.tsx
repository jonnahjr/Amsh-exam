import Link from "next/link";
import { redirect } from "next/navigation";
import { all } from "@/lib/db";
import { canAuthorContent, getSessionUser } from "@/lib/auth";
import { ImportForm } from "@/components/ImportForm";
import { EmptyState, PageHeader, formatDateTime } from "@/components/ui";
import { CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_SAMPLE } from "@/lib/csv-template";
import type { ImportJobRow } from "@/types";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  if (!canAuthorContent(user)) {
    return (
      <EmptyState title="Instructors only">
        <p className="muted">Your account cannot import questions.</p>
        <Link className="btn" href="/questions">
          Back to the question bank
        </Link>
      </EmptyState>
    );
  }

  const jobs = await all<ImportJobRow>(
    'SELECT * FROM "ImportJob" WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT 10',
    [user.id],
  );

  return (
    <>
      <PageHeader
        title="Import questions"
        description="Bulk-load questions from a CSV or JSON file. Every row is validated independently, so one bad row does not block the rest."
      />

      <div className="stack">
        <div className="card">
          <h3>CSV format</h3>
          <p className="small muted">
            The header row is matched by name and is not case sensitive. Provide the options as{" "}
            <code>option1…optionN</code>, and the answers as zero-based indices in{" "}
            <code>correctOptionIndices</code> (for example <code>0</code> or <code>0|2</code>).
            Replace the end of the header with <code>options</code> to supply a{" "}
            <code>|</code>-separated list instead.
          </p>

          <pre
            className="mono small"
            style={{
              background: "var(--surface-alt)",
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              overflowX: "auto",
              margin: "0 0 10px",
            }}
          >
            {CSV_TEMPLATE_HEADERS}
            {"\n"}
            {CSV_TEMPLATE_SAMPLE}
          </pre>

          <p className="field-hint" style={{ margin: 0 }}>
            Valid <code>questionType</code> values: SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE,
            SHORT_ANSWER, SCENARIO, MATCHING, ESSAY. Valid <code>difficulty</code> values: EASY,
            INTERMEDIATE, HARD, EXPERT. Valid <code>status</code> values: DRAFT, PUBLISHED,
            ARCHIVED.
          </p>
        </div>

        <ImportForm />

        {jobs.length > 0 && (
          <section>
            <h2>Recent imports</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Format</th>
                    <th>Status</th>
                    <th className="num">Rows</th>
                    <th className="num">Imported</th>
                    <th className="num">Skipped</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="small">{job.fileName}</td>
                      <td className="small">{job.fileType}</td>
                      <td>
                        <span
                          className={`badge ${
                            job.status === "COMPLETED"
                              ? "badge-published"
                              : job.status === "FAILED"
                                ? "badge-fail"
                                : ""
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="num">{job.totalRows}</td>
                      <td className="num">{job.imported}</td>
                      <td className="num">{job.skipped}</td>
                      <td className="small nowrap">{formatDateTime(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
