"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { apiRequest, errorMessages } from "@/lib/client";
import { CSV_TEMPLATE_HEADERS } from "@/lib/csv-template";

interface ImportResult {
  jobId: string;
  totalRows: number;
  imported: number;
  skipped: number;
  failedRows: { row: number; error: string }[];
}

export function ImportForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"CSV" | "JSON">("CSV");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setResult(null);
    setErrors([]);
    if (!file) {
      setFileName("");
      setContent("");
      return;
    }

    const isJson = file.name.toLowerCase().endsWith(".json");
    setFileType(isJson ? "JSON" : "CSV");
    setFileName(file.name);
    setContent(await file.text());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    setResult(null);

    try {
      const outcome = await apiRequest<ImportResult>("/api/import", {
        method: "POST",
        body: { fileName: fileName || "pasted-content", fileType, content },
      });
      setResult(outcome);
      router.refresh();
    } catch (error) {
      setErrors(errorMessages(error));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFileName("");
    setContent("");
    setResult(null);
    setErrors([]);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <form onSubmit={onSubmit} className="stack" noValidate>
      {errors.length > 0 && (
        <div className="alert alert-error">
          <strong>Import failed.</strong>
          <ul>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className={result.imported > 0 ? "alert alert-success" : "alert alert-warning"}>
          <strong>
            {result.imported} of {result.totalRows} row{result.totalRows === 1 ? "" : "s"} imported
            {result.skipped > 0 ? `, ${result.skipped} skipped` : ""}.
          </strong>

          {result.failedRows.length > 0 && (
            <>
              <p style={{ margin: "8px 0 4px" }}>Rows that could not be imported:</p>
              <ul>
                {result.failedRows.slice(0, 20).map((failure, index) => (
                  <li key={`${failure.row}-${index}`}>
                    Row {failure.row}: {failure.error}
                  </li>
                ))}
              </ul>
              {result.failedRows.length > 20 && (
                <p style={{ margin: "6px 0 0" }}>
                  …and {result.failedRows.length - 20} more.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="card">
        <h3>Upload a file</h3>

        <div className="field">
          <label htmlFor="file">CSV or JSON file</label>
          <input
            id="file"
            ref={fileInput}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={onFileChange}
          />
          <div className="field-hint">
            The file is read in your browser and posted as JSON, so nothing is uploaded twice.
          </div>
        </div>

        {fileName && (
          <p className="small muted">
            Loaded <strong>{fileName}</strong> as {fileType} ({content.length.toLocaleString()}{" "}
            characters).
          </p>
        )}
      </div>

      <div className="card">
        <h3>Or paste content</h3>

        <div className="field">
          <label htmlFor="fileType">Format</label>
          <select
            id="fileType"
            value={fileType}
            onChange={(event) => setFileType(event.target.value as "CSV" | "JSON")}
          >
            <option value="CSV">CSV</option>
            <option value="JSON">JSON</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (!fileName) setFileName("pasted-content");
            }}
            rows={10}
            className="mono"
            placeholder={fileType === "CSV" ? CSV_TEMPLATE_HEADERS : '[{"questionText": "…"}]'}
          />
        </div>
      </div>

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || content.trim() === ""}>
          {busy ? "Importing…" : "Import questions"}
        </button>
        <button type="button" className="btn" onClick={reset} disabled={busy}>
          Clear
        </button>
      </div>
    </form>
  );
}
