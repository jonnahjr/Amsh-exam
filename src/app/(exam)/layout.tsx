import { SessionWatcher } from "@/components/SessionWatcher";

// Attempt state is per-user and time-sensitive: never prerender it.
export const dynamic = "force-dynamic";

/**
 * Exam-taking shell.
 *
 * Deliberately has no site navigation: during a timed exam the only links on
 * screen should be the ones the candidate actually needs.
 */
export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Signs the candidate out mid-exam if an admin pauses or terminates them. */}
      <SessionWatcher />
      {children}
    </>
  );
}
