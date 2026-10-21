"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, errorMessages } from "@/lib/client";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [m100Code, setM100Code] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    setSuccessMsg("");
    try {
      const res = await apiRequest<{ autoApproved?: boolean; m100Code?: string }>("/api/auth/register", {
        method: "POST",
        body: {
          name: name.trim() || undefined,
          email,
          password,
          m100Code: m100Code.trim() || undefined,
        },
      });

      if (res?.autoApproved) {
        setSuccessMsg("M100 Code Verified! Your account is automatically activated for immediate exam access.");
        setTimeout(() => {
          router.replace("/exams");
          router.refresh();
        }, 1200);
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch (error) {
      setErrors(errorMessages(error));
      setBusy(false);
    }
  }

  return (
    <>
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      {errors.length > 0 && (
        <div className="alert alert-error">
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul>
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Yonas Bogale"
          />
        </div>

        <div className="field">
          <label htmlFor="email">Work or Personal Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <div className="field">
          <div className="row-between" style={{ alignItems: "center", marginBottom: 4 }}>
            <label htmlFor="m100Code" style={{ margin: 0 }}>
              M100 Employee Code
            </label>
            <span className="badge badge-accent" style={{ fontSize: "0.72rem" }}>
              Instant Access
            </span>
          </div>
          <input
            id="m100Code"
            type="text"
            value={m100Code}
            onChange={(event) => setM100Code(event.target.value.toUpperCase())}
            placeholder="e.g. M100-AMSH-001"
            style={{ fontFamily: "monospace", letterSpacing: "0.05em", fontWeight: 600 }}
          />
          <div className="field-hint">
            Employees with a valid M100 code skip administrator approval and start taking exams immediately.
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
          {busy ? "Activating account…" : m100Code.trim() ? "Register & Start Exam →" : "Create Account"}
        </button>
      </form>
    </>
  );
}
