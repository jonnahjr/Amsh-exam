// Temporary end-to-end smoke check. Run against a live dev server:
//   node scripts/smoke.mjs
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const BASE = "http://localhost:3000";
const jar = new Map();
let failures = 0;

/**
 * React splits adjacent text nodes with comment markers, so `{100}%` arrives as
 * `100<!-- -->%`. Strip them before doing substring checks on rendered HTML.
 */
const rendered = (text) => text.replace(/<!--.*?-->/g, "");

// Wait for the dev server to finish its first compile before asserting.
for (let i = 0; i < 60; i += 1) {
  try {
    const res = await fetch(`${BASE}/login`);
    if (res.status === 200) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  -> ${detail}` : ""}`);
  if (!ok) failures++;
}

async function req(p, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookie) headers.cookie = cookie;
  if (opts.body) headers["content-type"] = "application/json";
  const res = await fetch(BASE + p, {
    method: opts.method || "GET",
    headers,
    body: opts.body,
    redirect: "manual",
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const pair = c.split(";")[0];
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
}

console.log("=== 1. authentication ===");
let r = await req("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "student@exam.local", password: "WRONG" }),
});
check("wrong password rejected with 401", r.status === 401, `got ${r.status}`);

r = await req("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "student@exam.local", password: "Student#12345" }),
});
check("login succeeds", r.status === 200 && r.json?.data?.role === "STUDENT", `status ${r.status} role ${r.json?.data?.role}`);
check("session cookie set", jar.size > 0, [...jar.keys()].join(","));

r = await req("/api/auth/me");
check("/api/auth/me returns the student", r.json?.data?.email === "student@exam.local");

console.log("\n=== 2. role protection ===");
r = await req("/api/questions", {
  method: "POST",
  body: JSON.stringify({ questionText: "x", options: ["a", "b"], correctOptionIndices: [0] }),
});
check("student cannot create a question (403)", r.status === 403, `got ${r.status}`);

r = await req("/api/import", {
  method: "POST",
  body: JSON.stringify({ fileName: "a.csv", fileType: "CSV", content: "x" }),
});
check("student cannot import (403)", r.status === 403, `got ${r.status}`);

console.log("\n=== 3. starting an exam ===");
r = await req("/api/attempts", {
  method: "POST",
  body: JSON.stringify({ templateSlug: "statistics-foundations" }),
});
check("attempt created", r.status === 201, `status ${r.status} ${r.json?.error?.message ?? ""}`);
const token = r.json?.data?.attemptToken;
check("attempt has 8 questions", r.json?.data?.questionCount === 8, `got ${r.json?.data?.questionCount}`);

r = await req("/api/attempts", {
  method: "POST",
  body: JSON.stringify({ templateSlug: "statistics-foundations" }),
});
check("re-starting resumes the same attempt", r.json?.data?.attemptToken === token);

r = await req("/api/attempts", {
  method: "POST",
  body: JSON.stringify({ templateSlug: "does-not-exist" }),
});
check("unknown template is a clean 404", r.status === 404, `got ${r.status}`);

console.log("\n=== 4. loading the paper ===");
r = await req(`/api/attempts/${token}`);
check("attempt loads", r.status === 200, `got ${r.status}`);
const session = r.json?.data;
check("8 questions returned", session?.questions?.length === 8);
check(
  "answer key is NOT leaked to the client",
  session?.questions?.every((q) => q.correctOptionIndices === undefined),
);
check(
  "options present on every question",
  session?.questions?.every((q) => Array.isArray(q.options) && q.options.length >= 2),
);
check(
  "timer is running",
  session?.remainingSeconds > 0 && session?.remainingSeconds <= 1200,
  `${session?.remainingSeconds}s`,
);

console.log("\n=== 5. answering correctly through shuffled options ===");
const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || "./prisma/exam.db");
const db = new DatabaseSync(dbPath);
const row = db
  .prepare('SELECT "optionMapping","selectedQuestionIds" FROM "ExamAttempt" WHERE "attemptToken" = ?')
  .get(token);
const mapping = JSON.parse(row.optionMapping);
const ids = JSON.parse(row.selectedQuestionIds);

const answerKey = ids.map((id) => {
  const q = db.prepare('SELECT "correctOptionIndices" FROM "Question" WHERE "id" = ?').get(id);
  const correct = JSON.parse(q.correctOptionIndices);
  const display = correct.map((c) => mapping[id].indexOf(c)).sort((a, b) => a - b);
  return { questionId: id, selectedIndices: display };
});
db.close();

let shuffled = 0;
for (const answer of answerKey) {
  if (mapping[answer.questionId].some((v, i) => v !== i)) shuffled++;
  const res = await req(`/api/attempts/${token}`, { method: "PATCH", body: JSON.stringify(answer) });
  if (res.status !== 200) check(`save answer ${answer.questionId.slice(0, 8)}`, false, `status ${res.status}`);
}
check("all answers saved", true);
check("at least one question had shuffled options", shuffled > 0, `${shuffled}/8 shuffled`);

const fresh = await req(`/api/attempts/${token}`);
check(
  "saved answers survive a reload",
  fresh.json?.data?.questions?.every((q) => (fresh.json.data.responses[q.questionId]?.length ?? 0) > 0),
);

r = await req(`/api/attempts/${token}`, {
  method: "PATCH",
  body: JSON.stringify({ questionId: ids[0], selectedIndices: [99] }),
});
check("out-of-range option index rejected", r.status === 409, `got ${r.status}`);

console.log("\n=== 6. submitting and grading ===");
r = await req(`/api/attempts/${token}/submit`, { method: "POST" });
check("submission succeeds", r.status === 200, `status ${r.status} ${r.json?.error?.message ?? ""}`);
const result = r.json?.data;
check("all 8 marked correct", result?.correctAnswers === 8, `${result?.correctAnswers}/8`);
check("score is 100%", result?.percentage === 100, `${result?.percentage}%`);
check("outcome is PASS", result?.passStatus === "PASS", result?.passStatus);
const resultId = result?.resultId;

r = await req(`/api/attempts/${token}`, {
  method: "PATCH",
  body: JSON.stringify({ questionId: ids[0], selectedIndices: [0] }),
});
check("cannot answer after submitting", r.status === 409, `got ${r.status}`);

r = await req(`/api/attempts/${token}/submit`, { method: "POST" });
check("re-submitting is idempotent", r.status === 409 || r.json?.data?.resultId === resultId, `status ${r.status}`);

console.log("\n=== 7. results ===");
r = await req("/api/results");
check("results list contains the new attempt", r.json?.data?.items?.some((x) => x.id === resultId));
check("student only sees their own results", r.json?.data?.scope === "own");

r = await req(`/results/${resultId}`);
check("result page renders", r.status === 200, `got ${r.status}`);
check("result page shows the score", rendered(r.text).includes("100%"));
check("result page shows the answer review", r.text.includes("Answer review"));
check("review shows an explanation", r.text.includes("Explanation"));
// Every question was answered correctly, so all eight review entries should
// carry the green "Correct" badge (the stat *labels* also say "Incorrect", so
// counting badges is the precise check).
const correctBadges = (rendered(r.text).match(/badge-pass">Correct</g) ?? []).length;
check("review marks all 8 questions correct", correctBadges === 8, `${correctBadges} correct badges`);

console.log("\n=== 8. pages render ===");
for (const [p, needle] of [
  ["/", "Welcome back"],
  ["/exams", "Exams"],
  ["/questions", "Question bank"],
  ["/results", "results"],
]) {
  const res = await req(p);
  check(`GET ${p} -> 200`, res.status === 200, `got ${res.status}`);
  check(`GET ${p} shows expected content`, rendered(res.text).includes(needle));
}

console.log("\n=== 9. anonymous access blocked ===");
const savedJar = [...jar];
jar.clear();
r = await req("/api/auth/me");
check("anonymous /me returns null", r.json?.data === null);
r = await req("/api/questions");
check("anonymous cannot list questions (401)", r.status === 401, `got ${r.status}`);
for (const [k, v] of savedJar) jar.set(k, v);

console.log("\n=== 10. instructor workflow ===");
const studentJar = [...jar];
jar.clear();
r = await req("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "instructor@exam.local", password: "Instructor#123" }),
});
check("instructor logs in", r.status === 200);

const csv = [
  "questionText,questionType,difficulty,option1,option2,option3,option4,correctOptionIndices,explanation,marks,subjectSlug,topicSlug,tags,status",
  '"E2E: which port is HTTPS?",SINGLE_CHOICE,EASY,"21","80","443","8080",2,"Port 443.",1,statistics,probability,"e2e",PUBLISHED',
  '"E2E: bad row with no options",SINGLE_CHOICE,EASY,,,,,0,,1,,,"x",PUBLISHED',
].join("\n");

r = await req("/api/import", {
  method: "POST",
  body: JSON.stringify({ fileName: "e2e.csv", fileType: "CSV", content: csv }),
});
check("import endpoint returns 201", r.status === 201, `status ${r.status} ${r.json?.error?.message ?? ""}`);
check("import imported the good row", r.json?.data?.imported === 1, `imported ${r.json?.data?.imported}`);
check(
  "import reported the bad row with its line number",
  r.json?.data?.failedRows?.length === 1 && r.json.data.failedRows[0].row === 2,
  JSON.stringify(r.json?.data?.failedRows),
);

r = await req("/api/questions?q=E2E");
check("imported question is searchable", r.json?.data?.total >= 1, `total ${r.json?.data?.total}`);

r = await req("/admin/audit");
check(
  "instructor is refused the audit log page",
  r.status === 200 && r.text.includes("Administrators only"),
  `status ${r.status}`,
);

// The seeded templates must all be able to fill from the seeded bank.
for (const slug of ["aws-fundamentals-mock", "statistics-foundations", "cloud-certification-full", "machine-learning-drill"]) {
  const res = await req("/exams/" + slug);
  const ready = res.text.includes("Start exam");
  check(`exam ${slug} is startable`, res.status === 200 && ready, `status ${res.status}`);
}

jar.clear();
for (const [k, v] of studentJar) jar.set(k, v);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
