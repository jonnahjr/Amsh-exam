"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Signing out is a POST so it cannot be triggered by a link prefetch or an
 * image tag. The full refresh discards any cached server-rendered pages that
 * still show the previous user's data.
 */
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={signOut} disabled={busy}>
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
