import Link from "next/link";
import { redirect } from "next/navigation";
import { canAuthorContent, getSessionUser } from "@/lib/auth";
import { listSubjects, listTopics } from "@/server/taxonomy";
import { QuestionForm } from "@/components/QuestionForm";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!canAuthorContent(user)) {
    return (
      <div className="empty">
        <h3>Instructors only</h3>
        <p className="muted">Your account does not have permission to author questions.</p>
        <Link className="btn" href="/questions">
          Back to the question bank
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="New question"
        description="Published questions immediately become eligible for exams whose scope covers their subject."
      />

      <QuestionForm subjects={await listSubjects()} topics={await listTopics()} />
    </>
  );
}
