import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listAuditLogs } from "@/server/audit";
import { EmptyState, PageHeader, formatDateTime } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Every mutating action writes an audit row; this is where they surface. */
export default async function AuditLogPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  if (user.role !== "ADMINISTRATOR") {
    return (
      <EmptyState title="Administrators only">
        <p className="muted">Your account cannot view the audit log.</p>
        <Link className="btn" href="/">
          Back to the dashboard
        </Link>
      </EmptyState>
    );
  }

  const entries = await listAuditLogs(200);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Sign-ins, attempts, submissions, and content changes — newest first."
      />

      {entries.length === 0 ? (
        <EmptyState title="Nothing logged yet">
          <p className="muted">Actions will appear here as people use the platform.</p>
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>User</th>
                <th>Entity</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="small nowrap">{formatDateTime(entry.createdAt)}</td>
                  <td className="small">
                    <span className="badge">{entry.action}</span>
                  </td>
                  <td className="small">{entry.userEmail ?? entry.userName ?? "—"}</td>
                  <td className="small">
                    {entry.entity ?? "—"}
                    {entry.entityId && (
                      <div className="faint mono" style={{ fontSize: "0.72rem" }}>
                        {entry.entityId.slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="small" style={{ maxWidth: "34ch" }}>
                    {entry.details ? (
                      <code style={{ fontSize: "0.75rem", wordBreak: "break-word" }}>
                        {entry.details}
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="small faint">{entry.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
