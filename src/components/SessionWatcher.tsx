"use client";

import { useEffect } from "react";

/**
 * Watches the candidate's session while they work.
 *
 * Access can be revoked server-side at any moment (an admin pauses or
 * terminates the check-in), but an already-open page keeps its client state and
 * would only notice on the next navigation. Polling `/api/auth/me` means a
 * revoked candidate is signed out and returned to the entry page within a few
 * seconds, even in the middle of an exam.
 */
const POLL_INTERVAL_MS = 5000;
// The logout endpoint clears the stale cookie and forwards to the entry page
// (the check-in portal a candidate starts from), so this works even though the
// session being watched is already revoked.
const SIGN_OUT_URL = "/api/auth/logout?next=/checkin";

export function SessionWatcher() {
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checking = false;

    function signOut() {
      if (stopped) return;
      stopped = true;
      if (timer) clearTimeout(timer);
      window.location.replace(SIGN_OUT_URL);
    }


    async function check() {
      if (stopped || checking) return;
      checking = true;
      try {
        const res = await fetch(`/api/auth/me?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const payload = await res.json().catch(() => null);
          // The API wraps results in `{ data }`; `data: null` means the session
          // no longer resolves (paused, terminated, or signed out elsewhere).
          const user = payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
          if (!user) {
            signOut();
            return;
          }
        }
      } catch {
        // A network hiccup is not proof of a revoked session; retry next tick.
      } finally {
        checking = false;
      }

      if (!stopped) timer = setTimeout(check, POLL_INTERVAL_MS);
    }

    function onWake() {
      if (document.visibilityState === "visible" && !stopped) {
        if (timer) clearTimeout(timer);
        void check();
      }
    }

    void check();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, []);

  return null;
}
