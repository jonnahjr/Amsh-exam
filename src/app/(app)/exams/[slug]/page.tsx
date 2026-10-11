import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { countAvailableQuestions, poolBreakdown } from "@/server/questions";
import { findTemplateWithNames } from "@/server/templates";
import { findActiveAttempt } from "@/server/attempts";
import { StartExamButton } from "@/components/StartExamButton";
import { DifficultyBadge, formatMarks } from "@/components/ui";
import { DIFFICULTIES } from "@/types";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({ params }: { params: { slug: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const template = findTemplateWithNames(params.slug);
  if (!template) notFound();
  if (!template.isPublic && user.role === "STUDENT") notFound();

  const available = countAvailableQuestions(template);
  const breakdown = poolBreakdown(template);
  const ready = available >= template.totalQuestions;
  const activeAttempt = findActiveAttempt(user.id, template.id);

  const distribution = Object.entries(template.difficultyDistribution).filter(
    ([, weight]) => typeof weight === "number" && weight > 0,
  ) as [string, number][];

  return (
    <div className="stack">
      <div>
        <Link href="/exams" className="small">
          ← All exams
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1>{template.name}</h1>
          <p>{template.description ?? "No description provided."}</p>
          <div className="row small muted" style={{ marginTop: 8 }}>
            <span>{template.subjectName ?? template.categoryName ?? "All subjects"}</span>
            <span>·</span>
            <span>{template.totalQuestions} questions</span>
            <span>·</span>
            <span>{template.durationMinutes} minutes</span>
          </div>
        </div>

        <div className="row">
          {activeAttempt ? (
            <Link className="btn btn-primary" href={`/attempt/${activeAttempt.attemptToken}`}>
              Resume attempt →
            </Link>
          ) : (
            <StartExamButton slug={template.slug} disabled={!ready} />
          )}
        </div>
      </div>

      {!ready && (
        <div className="alert alert-warning">
          <strong>This exam is not ready to sit yet.</strong> It needs{" "}
          {template.totalQuestions} questions but only {available} published question
          {available === 1 ? "" : "s"} match its scope. Add or publish more questions, or lower the
          question count.
        </div>
      )}

      {activeAttempt && (
        <div className="alert alert-info">
          You have an attempt for this exam in progress. Resume it rather than starting a new one —
          the timer is already running.
        </div>
      )}

      <div className="grid">
        <div className="card">
          <h3>Exam rules</h3>
          <table>
            <tbody>
              <tr>
                <td className="muted">Questions</td>
                <td className="num">{template.totalQuestions}</td>
              </tr>
              <tr>
                <td className="muted">Time limit</td>
                <td className="num">{template.durationMinutes} min</td>
              </tr>
              <tr>
                <td className="muted">Marks per question</td>
                <td className="num">{formatMarks(template.marksPerQuestion)}</td>
              </tr>
              <tr>
                <td className="muted">Negative marking</td>
                <td className="num">{template.negativeMarking ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td className="muted">Pass mark</td>
                <td className="num">{template.passThresholdPercent}%</td>
              </tr>
              <tr>
                <td className="muted">Questions randomized</td>
                <td className="num">{template.randomizeQuestions ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td className="muted">Options shuffled</td>
                <td className="num">{template.randomizeOptions ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td className="muted">Auto-submit on expiry</td>
                <td className="num">{template.autoSubmitOnExpiry ? "Yes" : "No"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Question pool</h3>
          <p className="small muted">
            {available} published question{available === 1 ? "" : "s"} available in scope.
          </p>

          <table>
            <thead>
              <tr>
                <th>Difficulty</th>
                <th className="num">In pool</th>
                <th className="num">Target</th>
              </tr>
            </thead>
            <tbody>
              {DIFFICULTIES.map((difficulty) => {
                const weight = template.difficultyDistribution[difficulty];
                const target =
                  typeof weight === "number" && weight > 0
                    ? Math.max(1, Math.round(weight * template.totalQuestions))
                    : null;
                return (
                  <tr key={difficulty}>
                    <td>
                      <DifficultyBadge difficulty={difficulty} />
                    </td>
                    <td className="num">{breakdown[difficulty] ?? 0}</td>
                    <td className="num">{target ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {distribution.length === 0 && (
            <p className="field-hint">
              No difficulty distribution is configured, so questions are drawn evenly across
              difficulties.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
