"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/Footer";

type Phase = "form" | "waiting" | "approved" | "rejected";

export default function RootCheckInPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [m100Code, setM100Code] = useState("");
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isM100Approved, setIsM100Approved] = useState(false);

  // Count elapsed seconds while waiting
  useEffect(() => {
    if (phase !== "waiting" || !checkedInAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - checkedInAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, checkedInAt]);

  // Poll for manual approval if entered without M100 code
  const poll = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/checkin?id=${id}&t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "APPROVED") {
        setPhase("approved");
        setIsM100Approved(Boolean(data.autoApproved || data.m100Code));
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
    const trimmedName = name.trim();
    const trimmedCode = m100Code.trim().toUpperCase();

    if (trimmedName.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          m100Code: trimmedCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Something went wrong. Please check your information and try again.");
        return;
      }

      // If M100 was validated, backend returns APPROVED immediately
      if (data.status === "APPROVED") {
        setPhase("approved");
        setIsM100Approved(true);
        setTimeout(() => {
          window.location.href = data.redirectUrl || "/exams";
        }, 1200);
        return;
      }

      // Otherwise, wait for manual administrator approval
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
    setM100Code("");
    setCheckInId(null);
    setCheckedInAt(null);
    setElapsed(0);
    setError("");
    setIsM100Approved(false);
  }

  return (
    <div className="checkin-shell">
      <div className="checkin-card">
        {/* Logo */}
        <div className="checkin-logo">
          <Image src="/amsh-logo.jpg" alt="MOCK EXAM" width={56} height={56} className="checkin-logo-img" priority />
          <div>
            <div className="checkin-logo-name">MOCK EXAM</div>
            <div className="checkin-logo-sub">Employee Check-In Portal</div>
          </div>
        </div>

        {/* Form phase */}
        {phase === "form" && (
          <div className="checkin-body">
            <h1 className="checkin-title">Employee Exam Portal</h1>
            <p className="checkin-desc">
              Enter your full name and employee code for <strong>instant automatic exam access</strong> without waiting for administrator approval.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 20 }}>
                {error}
              </div>
            )}

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
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="m100-code">
                  Employee Code
                </label>
                <input
                  id="m100-code"
                  type="text"
                  placeholder=""
                  value={m100Code}
                  onChange={(e) => setM100Code(e.target.value.toUpperCase())}
                  autoComplete="off"
                  style={{ fontFamily: "monospace", letterSpacing: "0.05em", fontWeight: 600 }}
                />
                <div className="field-hint">
                  Have an employee code? Enter it above to bypass the waiting queue. Leave blank to request manual administrator approval.
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={busy}
                style={{ marginTop: 12, height: 46, fontSize: "1rem" }}
              >
                {busy
                  ? "Verifying authorization…"
                  : m100Code.trim()
                  ? "Activate & Start Exam →"
                  : "Request Check-In →"}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Need an account with password? <Link href="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>Register with employee code</Link>
            </div>
          </div>
        )}

        {/* Waiting phase (for manual check-in requests without M100) */}
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
              Tip: If you have an employee code, you can start over and enter it for instant access.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 20 }}
              onClick={reset}
            >
              ← Enter Employee Code instead
            </button>
          </div>
        )}

        {/* Approved phase (instant for code, or after manual approval) */}
        {phase === "approved" && (
          <div className="checkin-body" style={{ textAlign: "center" }}>
            <div className="checkin-result-icon checkin-result-ok">✓</div>
            <h1 className="checkin-title" style={{ color: "var(--success)", marginTop: 20 }}>
              {isM100Approved ? "Employee Code Verified!" : "Session Approved!"}
            </h1>
            <p className="checkin-desc">
              Welcome, <strong style={{ color: "var(--text)" }}>{name}</strong>!
              <br />
              {isM100Approved
                ? "Your employee code has been validated. Exam access is active immediately."
                : "Your session has been approved by the administrator."}
            </p>
            {isM100Approved ? (
              <div className="badge badge-accent" style={{ padding: "6px 14px", fontSize: "0.85rem", marginBottom: 20 }}>
                Automatic Authorization Active
              </div>
            ) : (
              <div className="checkin-elapsed" style={{ marginBottom: 20 }}>
                Approved after <strong>{formatTime(elapsed)}</strong>
              </div>
            )}
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
              Your check-in was not approved. Please contact an administrator or provide a valid M100 employee code.
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
