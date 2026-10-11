"use client";

import { useState, useEffect, useCallback } from "react";

interface CheckIn {
  id: string;
  employeeName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  checkedInAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function WaitingDuration({ iso }: { iso: string }) {
  const [display, setDisplay] = useState(timeAgo(iso));
  useEffect(() => {
    const i = setInterval(() => setDisplay(timeAgo(iso)), 5000);
    return () => clearInterval(i);
  }, [iso]);
  return <span>{display}</span>;
}

export default function AdminCheckInsPage() {
  const [rows, setRows] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/checkin/list");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRows(data.items ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000); // auto-refresh every 4s
    return () => clearInterval(interval);
  }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/checkin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d?.error?.message ?? "Action failed.");
      } else {
        await load();
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = rows.filter((r) => r.status === "PENDING");
  const done = rows.filter((r) => r.status !== "PENDING");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Employee Check-Ins</h1>
          <p>Approve or reject employee session requests in real time. Page refreshes automatically.</p>
        </div>
        <div className="row">
          <span className="badge" style={{ fontSize: "0.8rem", padding: "4px 12px" }}>
            {pending.length} pending
          </span>
          <button className="btn btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Pending */}
      <section style={{ marginBottom: 32 }}>
        <p className="section-heading">Pending Approval</p>
        {loading ? (
          <div className="empty"><span className="muted">Loading…</span></div>
        ) : pending.length === 0 ? (
          <div className="empty">
            <h3>No pending requests</h3>
            <p className="muted">Check-ins will appear here automatically as employees sign in.</p>
          </div>
        ) : (
          <div className="stack">
            {pending.map((row) => (
              <div key={row.id} className="checkin-admin-row">
                <div className="checkin-admin-pulse" />
                <div className="checkin-admin-info">
                  <div className="checkin-admin-name">{row.employeeName}</div>
                  <div className="checkin-admin-meta">
                    Checked in <WaitingDuration iso={row.checkedInAt} />
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    className="btn btn-sm"
                    style={{ borderColor: "var(--danger-border)", color: "var(--danger)", background: "var(--danger-soft)" }}
                    disabled={busyId === row.id}
                    onClick={() => act(row.id, "reject")}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={busyId === row.id}
                    onClick={() => act(row.id, "approve")}
                  >
                    {busyId === row.id ? "…" : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      {done.length > 0 && (
        <section>
          <p className="section-heading">Recent History</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Checked in</th>
                  <th>Decided</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {done.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500 }}>{row.employeeName}</td>
                    <td>
                      <span className={`badge ${row.status === "APPROVED" ? "badge-published" : "badge-fail"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="muted small">{new Date(row.checkedInAt).toLocaleTimeString()}</td>
                    <td className="muted small">
                      {row.approvedAt ? new Date(row.approvedAt).toLocaleTimeString() : "—"}
                    </td>
                    <td className="muted small">{row.approvedBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
