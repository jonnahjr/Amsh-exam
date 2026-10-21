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
    redirect("/exams");
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
