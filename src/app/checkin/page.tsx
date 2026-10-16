"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Footer } from "@/components/Footer";

type Phase = "form" | "waiting" | "approved" | "rejected";

export default function CheckInPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Count elapsed seconds while waiting
  useEffect(() => {
    if (phase !== "waiting" || !checkedInAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - checkedInAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, checkedInAt]);

  // Poll for approval every 1.2 seconds for super fast responsiveness
  const poll = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/checkin?id=${id}&t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "APPROVED") {
        setPhase("approved");
        // Automatically open the exam page immediately upon approval!
        setTimeout(() => {
          window.location.href = data.redirectUrl || "/exams";
        }, 1200);
      } else if (data.status === "REJECTED") {
        setPhase("rejected");
      }
    } catch {
      // silently ignore network errors during poll
    }
  }, []);

  useEffect(() => {
    if (phase !== "waiting" || !checkInId) return;
    const interval = setInterval(() => poll(checkInId), 1200);
    return () => clearInterval(interval);
  }, [phase, checkInId, poll]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Please enter your full name.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setCheckInId(data.id);
      setCheckedInAt(new Date());
      setElapsed(0);
      setPhase("waiting");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function reset() {
    setPhase("form");
    setName("");
    setCheckInId(null);
    setCheckedInAt(null);
    setElapsed(0);
    setError("");
  }

  return (
    <div className="checkin-shell">
      <div className="checkin-card">
        {/* Logo */}
        <div className="checkin-logo">
          <Image src="/amsh-logo.jpg" alt="AMSH Exam" width={56} height={56} className="checkin-logo-img" priority />
          <div>
            <div className="checkin-logo-name">AMSH Exam</div>
            <div className="checkin-logo-sub">Employee Check-In</div>
          </div>
        </div>

        {/* Form phase */}
        {phase === "form" && (
          <div className="checkin-body">
            <h1 className="checkin-title">Welcome</h1>
            <p className="checkin-desc">Enter your name to begin. Your session will start once approved by an administrator.</p>

            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="employee-name">Your Full Name</label>
                <input
                  id="employee-name"
                  type="text"
                  placeholder="e.g. Yonas Bogale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={busy}
                style={{ marginTop: 8, height: 46, fontSize: "1rem" }}
              >
                {busy ? "Submitting…" : "Check In →"}
              </button>
            </form>
          </div>
        )}

        {/* Waiting phase */}
        {phase === "waiting" && (
          <div className="checkin-body" style={{ textAlign: "center" }}>
            <div className="checkin-spinner" aria-label="Waiting for approval" />
            <h1 className="checkin-title" style={{ marginTop: 24 }}>Waiting for Approval</h1>
            <p className="checkin-desc">
              Your check-in has been submitted, <strong style={{ color: "var(--text)" }}>{name}</strong>.
              <br />An administrator will approve your session shortly.
            </p>
            <div className="checkin-timer">
              <span className="checkin-timer-label">Waiting time</span>
              <span className="checkin-timer-value">{formatTime(elapsed)}</span>
            </div>
            <p className="faint small" style={{ marginTop: 16 }}>
              This page checks automatically every few seconds — no need to refresh.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 20 }}
              onClick={reset}
            >
              ← Start over
            </button>
          </div>
        )}

        {/* Approved phase */}
        {phase === "approved" && (
          <div className="checkin-body" style={{ textAlign: "center" }}>
            <div className="checkin-result-icon checkin-result-ok">✓</div>
            <h1 className="checkin-title" style={{ color: "var(--success)", marginTop: 20 }}>
              Session Approved!
            </h1>
            <p className="checkin-desc">
              Welcome, <strong style={{ color: "var(--text)" }}>{name}</strong>!
              <br />Your session has been approved by the administrator.
            </p>
            <div className="checkin-elapsed" style={{ marginBottom: 20 }}>
              Approved after <strong>{formatTime(elapsed)}</strong>
            </div>
            <a
              href="/exams"
              className="btn btn-primary btn-block"
              style={{ height: 46, fontSize: "1rem", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              Start Exam Now →
            </a>
          </div>
        )}

        {/* Rejected phase */}
        {phase === "rejected" && (
          <div className="checkin-body" style={{ textAlign: "center" }}>
            <div className="checkin-result-icon checkin-result-fail">✕</div>
            <h1 className="checkin-title" style={{ color: "var(--danger)", marginTop: 20 }}>
              Request Declined
            </h1>
            <p className="checkin-desc">
              Your check-in was not approved. Please contact an administrator.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 24 }}
              onClick={reset}
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <Footer variant="compact" />
    </div>
  );
}
