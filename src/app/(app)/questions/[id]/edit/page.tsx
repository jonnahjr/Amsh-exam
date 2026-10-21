import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canAuthorContent, getSessionUser } from "@/lib/auth";
import { listSubjects, listTopics } from "@/server/taxonomy";
import { findQuestionById } from "@/server/questions";
import { QuestionForm } from "@/components/QuestionForm";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditQuestionPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  if (!canAuthorContent(user)) {
    redirect("/exams");
  }

  const question = await findQuestionById(params.id);
  if (!question) notFound();

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link href="/questions" className="small">
          ← Back to questions
        </Link>
      </div>

      <PageHeader
        title={`Edit Question (${question.questionId ?? question.id.slice(0, 8)})`}
        description="Update question wording, options, correct answers, or metadata."
      />

      <QuestionForm
        subjects={await listSubjects()}
        topics={await listTopics()}
        initialData={{
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          difficulty: question.difficulty,
          options: question.options,
          correctOptionIndices: question.correctOptionIndices,
          subjectId: question.subjectId,
          topicId: question.topicId,
          marks: question.marks,
          negativeMarks: question.negativeMarks,
          explanation: question.explanation,
          tags: question.tags,
          learningObjectives: question.learningObjectives,
          source: question.source,
          status: question.status,
        }}
      />
    </>
  );
}
