"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, errorMessages } from "@/lib/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await apiRequest("/api/auth/login", { method: "POST", body: { email, password } });
      router.replace("/admin");
      // Refresh so server components re-render with the new session cookie.
      router.refresh();
    } catch (error) {
      setErrors(errorMessages(error));
      setBusy(false);
    }
  }

  return (
    <>
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
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jonasjjonas14@gmail.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={busy}
          style={{ height: 44, fontSize: "0.95rem" }}
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </>
  );
}
