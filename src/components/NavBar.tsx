import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

/**
 * Top navigation.
 *
 * Rendered on the server so the session is resolved before the first paint and
 * no loading flicker appears.
 */
export async function NavBar() {
  const user = await getSessionUser();
  const isStaff = user?.role === "INSTRUCTOR" || user?.role === "ADMINISTRATOR";

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <Image
            src="/amsh-logo.jpg"
            alt="AMSH"
            width={28}
            height={28}
            className="brand-logo-img"
            priority
          />
          AMSH Exam
        </Link>

        <nav className="nav-links">
          {user && (
            <>
              <Link href="/exams">Exams</Link>
              <Link href="/questions">Question Bank</Link>
              <Link href="/results">Results</Link>
              {isStaff && <Link href="/admin/checkins">Check-Ins</Link>}
              {isStaff && <Link href="/admin/bulk-exam">Bulk Add Exam</Link>}
              {isStaff && <Link href="/admin/import">Import</Link>}
              {user.role === "ADMINISTRATOR" && <Link href="/admin/audit">Audit Log</Link>}
            </>
          )}
        </nav>

        <div className="nav-right">
          {user ? (
            <>
              <span>
                {user.name ?? user.email}{" "}
                <span className="badge badge-accent">{user.role}</span>
              </span>
              <LogoutButton />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
