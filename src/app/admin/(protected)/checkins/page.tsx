"use client";

import { useState, useEffect, useCallback } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";

interface CheckIn {
  id: string;
  employeeName: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "TERMINATED";
  checkedInAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  m100Code?: string | null;
  totalAttempts?: number;
  totalCompleted?: number;
  bestScore?: number | null;
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
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkin/list?t=${Date.now()}`);
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const items = data.items ?? data.data?.items ?? [];
        setRows(items);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 1500); // auto-refresh every 1.5s for instant updates
    return () => clearInterval(interval);
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "terminate") {
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
          <h1>Employee Check-Ins & Authorization</h1>
          <p>Authorize candidate exam sessions in real time. Track how many times each candidate has sat for exams.</p>
        </div>
        <div className="row">
          <span className="badge" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
            {pending.length} pending
          </span>
          <button className="btn btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Pending */}
      <section style={{ marginBottom: 32 }}>
        <p className="section-heading">Pending Authorization</p>
        {loading ? (
          <div className="empty"><span className="muted">Loading…</span></div>
        ) : pending.length === 0 ? (
          <div className="empty">
            <h3>No pending requests</h3>
            <p className="muted">Check-ins will appear here automatically when employees check in.</p>
          </div>
        ) : (
          <div className="stack">
            {pending.map((row) => (
              <div key={row.id} className="checkin-admin-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="checkin-admin-pulse" />
                  <div className="checkin-admin-info">
                    <div className="checkin-admin-name" style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                      {row.employeeName}
                    </div>
                    <div className="checkin-admin-meta" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                      <span>Checked in <WaitingDuration iso={row.checkedInAt} /></span>
                      <span>·</span>
                      <span className="badge" style={{ fontSize: "0.75rem", background: (row.totalAttempts ?? 0) > 0 ? "rgba(37, 99, 235, 0.1)" : "var(--surface-alt)" }}>
                        Taken test: <strong>{row.totalAttempts ?? 0} time{(row.totalAttempts ?? 0) === 1 ? "" : "s"}</strong>
                      </span>
                      {row.bestScore !== null && row.bestScore !== undefined && (
                        <span className="badge badge-accent" style={{ fontSize: "0.75rem" }}>
                          Best: {row.bestScore}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="row checkin-admin-actions" style={{ gap: 8 }}>
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
                    {busyId === row.id ? "…" : "Approve & Start"}
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
          <p className="section-heading">Recent Authorization History</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Tests Taken</th>
                  <th>Best Score</th>
                  <th>Status</th>
                  <th>Checked In</th>
                  <th>Authorized At</th>
                  <th>Authorized By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {done.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{row.employeeName}</span>
                        {row.m100Code && (
                          <span className="badge badge-accent" style={{ fontSize: "0.72rem", padding: "2px 6px" }}>
                            {row.m100Code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ fontWeight: 600 }}>
                        {row.totalAttempts ?? 0} time{(row.totalAttempts ?? 0) === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td>
                      {row.bestScore !== null && row.bestScore !== undefined ? (
                        <strong style={{ color: "var(--accent)" }}>{row.bestScore}%</strong>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${row.status === "APPROVED" ? "badge-published" : "badge-fail"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="muted small">{new Date(row.checkedInAt).toLocaleTimeString()}</td>
                    <td className="muted small">
                      {row.approvedAt ? new Date(row.approvedAt).toLocaleTimeString() : "—"}
                    </td>
                    <td className="small">
                      {row.approvedBy?.includes("M100") ? (
                        <span style={{ color: "var(--success)", fontWeight: 600 }}>
                          ⚡ M100 Auto
                        </span>
                      ) : (
                        <span className="muted">{row.approvedBy ?? "—"}</span>
                      )}
                    </td>
                    <td>
                      {row.status === "TERMINATED" ? (
                        <span className="muted small">Terminated</span>
                      ) : row.status === "APPROVED" && row.approvedBy?.includes("M100") ? (
                        <button
                          className="btn btn-sm"
                          style={{ borderColor: "var(--danger-border)", color: "var(--danger)", background: "var(--danger-soft)" }}
                          disabled={busyId === row.id}
                          onClick={() => setConfirmId(row.id)}
                        >
                          {busyId === row.id ? "…" : "Terminate"}
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmModal
        open={confirmId !== null}
        title="Terminate M100 session?"
        message="This immediately revokes the candidate's exam access. Their results are kept, and the M100 code stays locked to their account so it cannot be used to check back in."
        confirmLabel="Terminate"
        variant="danger"
        onConfirm={() => {
          const id = confirmId;
          setConfirmId(null);
          if (id) void act(id, "terminate");
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
