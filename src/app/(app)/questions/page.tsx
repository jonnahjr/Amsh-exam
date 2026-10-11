import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listQuestions } from "@/server/questions";
import { listSubjects } from "@/server/taxonomy";
import {
  DifficultyBadge,
  EmptyState,
  PageHeader,
  StatusBadge,
  formatDateTime,
} from "@/components/ui";
import { DIFFICULTIES, PUBLICATION_STATUSES, type Difficulty, type PublicationStatus } from "@/types";

export const dynamic = "force-dynamic";

/** A query parameter may arrive repeated, so collapse it to a single value. */
type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QuestionsPage(props: { searchParams: RawSearchParams }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const searchParams = props.searchParams;
  const q = first(searchParams.q);
  const rawStatus = first(searchParams.status);
  const rawDifficulty = first(searchParams.difficulty);
  const subjectId = first(searchParams.subjectId);
  const rawPage = first(searchParams.page);

  const isStaff = user.role === "INSTRUCTOR" || user.role === "ADMINISTRATOR";
  const page = Math.max(1, Number(rawPage ?? 1) || 1);

  const status = PUBLICATION_STATUSES.includes(rawStatus as PublicationStatus)
    ? (rawStatus as PublicationStatus)
    : undefined;
  const difficulty = DIFFICULTIES.includes(rawDifficulty as Difficulty)
    ? (rawDifficulty as Difficulty)
    : undefined;

  const subjects = listSubjects();
  const result = listQuestions({
    search: q?.trim() || undefined,
    status,
    difficulty,
    subjectId: subjectId || undefined,
    page,
    pageSize: 20,
  });

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, status: rawStatus, difficulty: rawDifficulty, subjectId, page: rawPage, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `/questions?${query}` : "/questions";
  };

  return (
    <>
      <PageHeader
        title="Question bank"
        description={
          isStaff
            ? "Every question in the bank. Only published questions are drawn into exams."
            : "Browse the published questions available for your exams."
        }
        actions={
          isStaff ? (
            <Link className="btn btn-primary" href="/questions/new">
              New question
            </Link>
          ) : null
        }
      />

      <div className="stack">
        <form className="card card-tight" method="get" action="/questions">
          <div className="row" style={{ alignItems: "flex-end" }}>
            <div className="field" style={{ margin: 0, flex: "2 1 200px" }}>
              <label htmlFor="q">Search</label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q ?? ""}
                placeholder="Question text or code"
              />
            </div>

            <div className="field" style={{ margin: 0, flex: "1 1 150px" }}>
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={rawStatus ?? ""}>
                <option value="">Any</option>
                {PUBLICATION_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ margin: 0, flex: "1 1 150px" }}>
              <label htmlFor="difficulty">Difficulty</label>
              <select id="difficulty" name="difficulty" defaultValue={rawDifficulty ?? ""}>
                <option value="">Any</option>
                {DIFFICULTIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ margin: 0, flex: "1 1 170px" }}>
              <label htmlFor="subjectId">Subject</label>
              <select id="subjectId" name="subjectId" defaultValue={subjectId ?? ""}>
                <option value="">Any</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary">
              Filter
            </button>
            <Link className="btn btn-ghost" href="/questions">
              Reset
            </Link>
          </div>
        </form>

        <div className="row-between">
          <span className="small muted">
            {result.total} question{result.total === 1 ? "" : "s"} found
            {result.total > 0 ? ` · page ${result.page} of ${Math.max(1, Math.ceil(result.total / result.pageSize))}` : ""}
          </span>
        </div>

        {result.items.length === 0 ? (
          <EmptyState title="No questions match those filters">
            <p className="muted">
              {isStaff
                ? "Adjust the filters, or add a new question."
                : "Try clearing the filters."}
            </p>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Code</th>
                  <th>Question</th>
                  <th>Subject</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th className="num">Marks</th>
                  <th>Author</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((question) => (
                  <tr key={question.id}>
                    <td className="mono small">{question.questionId ?? "—"}</td>
                    <td>
                      <div style={{ maxWidth: "46ch" }} className="small">
                        {question.questionText.length > 150
                          ? `${question.questionText.slice(0, 150)}…`
                          : question.questionText}
                      </div>
                      {question.tags.length > 0 && (
                        <div className="faint small" style={{ marginTop: 3 }}>
                          {question.tags.join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="small">{question.subjectName ?? "—"}</td>
                    <td>
                      <DifficultyBadge difficulty={question.difficulty} />
                    </td>
                    <td>
                      <StatusBadge status={question.status} />
                    </td>
                    <td className="num">{question.marks}</td>
                    <td className="small">{question.authorName ?? "—"}</td>
                    <td className="small nowrap">{formatDateTime(question.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result.total > result.pageSize && (
          <div className="row">
            <Link
              className="btn btn-sm"
              href={buildHref({ page: String(result.page - 1) })}
              style={result.page <= 1 ? { pointerEvents: "none", opacity: 0.5 } : undefined}
            >
              ← Previous
            </Link>
            <Link
              className="btn btn-sm"
              href={buildHref({ page: String(result.page + 1) })}
              style={
                result.page >= Math.ceil(result.total / result.pageSize)
                  ? { pointerEvents: "none", opacity: 0.5 }
                  : undefined
              }
            >
              Next →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
