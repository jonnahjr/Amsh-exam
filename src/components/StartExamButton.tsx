"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, errorMessages } from "@/lib/client";

interface StartResponse {
  attemptToken: string;
  attemptId: string;
  questionCount: number;
}

export function StartExamButton({ slug, disabled }: { slug: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function start() {
    setBusy(true);
    setErrors([]);
    try {
      const attempt = await apiRequest<StartResponse>("/api/attempts", {
        method: "POST",
        body: { templateSlug: slug },
      });
      router.push(`/attempt/${attempt.attemptToken}`);
    } catch (error) {
      setErrors(errorMessages(error));
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={start}
        disabled={busy || disabled}
      >
        {busy ? "Preparing exam…" : "Start exam"}
      </button>

      {errors.length > 0 && (
        <div className="alert alert-error" style={{ marginTop: 10, marginBottom: 0 }}>
          {errors.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
