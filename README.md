# Mock Examination Platform

A self-contained mock examination platform built with **Next.js 14 (App Router)**, **TypeScript**, and **SQLite via Node's built-in `node:sqlite`**. There is no ORM and no external database to run: the whole app is a single Node process plus one `.db` file.

Instructors author a question bank and assemble exam templates. Students sit randomized, timed exams and get a marked result with a full answer review.

---

## Requirements

| Requirement | Version | Why |
|---|---|---|
| Node.js | **>= 22.5.0** | `node:sqlite` (`DatabaseSync`) is a built-in module; it does not exist in older Node versions. Node 22.5–23.3 need `--experimental-sqlite`; Node 23.4+ and 24+ do not. |

Check with `node -v`. A `ExperimentalWarning: SQLite is an experimental feature` line on startup is expected and harmless.

---

## Quick start

```bash
cd exam-platform

npm install          # install dependencies
npm run db:setup     # create the SQLite database and load demo content
npm run dev          # start the dev server
```

Then open <http://localhost:3000> and sign in with one of the seeded accounts.

### Environment

`npm run db:setup` and `npm run dev` need a `.env` file. Copy the example and generate a secret:

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Put that value in `AUTH_SECRET`. The app refuses to issue sessions without it.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_PATH` | `./prisma/exam.db` | SQLite file location, relative to the project root. |
| `AUTH_SECRET` | — | HMAC key for session tokens. **Required**, minimum 16 characters. |
| `SESSION_COOKIE_NAME` | `exam_session` | Name of the session cookie. |

### Demo accounts

Seeded by `npm run db:seed`:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@exam.local` | `Admin#12345` |
| Instructor | `instructor@exam.local` | `Instructor#123` |
| Student | `student@exam.local` | `Student#12345` |

Students can also self-register from `/register`; new accounts always get the `STUDENT` role.

---

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server on port 3000. |
| `npm run build` | Production build. |
| `npm start` | Serve a production build (run `build` first). |
| `npm run typecheck` | `tsc --noEmit` across the whole project. |
| `npm run lint` | ESLint via `next lint`. |
| `npm run db:create` | Create the schema from `prisma/schema.sql`. Idempotent. |
| `npm run db:migrate` | Apply `schema.sql` and record a hash of it. Idempotent; does not alter existing columns. |
| `npm run db:seed` | Load demo users, taxonomy, questions, and exams. Refuses if the bank already has rows. |
| `npm run db:seed -- --force` | Wipe all rows and re-seed. |
| `npm run db:reset` | **Destructive.** Delete the database file, recreate it, and re-seed. Needs `-- --force`. |
| `npm run db:setup` | `db:create` then `db:seed`. The normal first-time command. |
| `npm run db:seed:bc1000` | Load the 1,000-question Behavioral Competency bank and the 100-question randomized exam. |
| `npm run db:migrate:randomized` | Add the composite indexes used by randomized paper selection and attempt resume. |
| `npm test` | Run the Jest suite. |
| `npm run test:coverage` | Run tests with coverage for `src/lib` and `src/server`. |
| `npm run smoke` | End-to-end smoke test against a **running** dev server. Signs in, sits a whole exam, and checks the result. |

`db:reset` deliberately refuses to run without `--force` so it can never fire inside a scripted pipeline by accident.

---

## Project structure

```
prisma/
  schema.sql          Source of truth for the database (SQLite DDL)
  schema.prisma       Data-model reference only; not used to generate anything
  _shared.cjs         Shared helpers for the plain-node database scripts
  init-db.cjs         db:create
  migrate.cjs         db:migrate
  seed.cjs            db:seed
  reset.cjs           db:reset

src/
  app/
    (app)/            Standard pages: dashboard, exams, questions, results, admin
      layout.tsx      Renders the top navigation
    (exam)/           Exam-taking shell with no site navigation
      attempt/[token]/
    api/              Route handlers (the JSON API)
    globals.css       The entire stylesheet; no CSS framework
  components/         UI, mostly server components plus the interactive few
  lib/
    db.ts             node:sqlite connection + typed query helpers
    auth.ts           bcrypt hashing, jose JWT sessions, role guards
    validation.ts     Every zod schema used by the API
    json.ts           Parsing for the TEXT columns that hold JSON
    http.ts           Response envelope and error translation
    errors.ts         AppError hierarchy carrying HTTP status
    client.ts         Browser fetch helper (unwraps the envelope)
    csv-template.ts   Client-safe CSV constants
  server/
    exam-engine.ts    Pure logic: selection, option shuffling, grading
    questions.ts      Question repository
    templates.ts      Exam template repository
    attempts.ts       Start / resume / save / submit
    results.ts        Results and statistics
    import.ts         CSV and JSON import
    audit.ts          Audit log
    taxonomy.ts       Categories, subjects, topics

tests/                Jest suite (pure unit tests + one DB integration test)
```

---

## How an exam works

### Selection

`src/server/exam-engine.ts` picks the questions. It is pure — no database, no clock — so the rules are testable in isolation.

1. Questions are drawn from every **published** question matching the template's scope (a subject, or a category, or the whole bank).
2. If the template sets `avoidPreviouslySeen`, questions this student has already been shown for that template are excluded. If that leaves too few, `allowReuse` decides whether they come back in or the attempt is refused.
3. If the template has `topicWeights`, those weights are turned into whole question counts first, so a chapter/section-balanced paper is produced. Within each topic the `difficultyDistribution` (when configured) is applied, then the topic is topped up from its own remaining questions.
4. Without `topicWeights`, the `difficultyDistribution` weights are turned into whole question counts using **largest-remainder rounding**, so the parts always sum to exactly `totalQuestions`. A short difficulty bucket is topped up from whatever is left over.
5. The selected ids are de-duplicated and the result is refused unless it contains exactly `totalQuestions` distinct questions. If the bank genuinely cannot fill the exam, it throws a descriptive error rather than quietly handing out a shorter exam. The exam page shows "needs N more questions" before you ever click start.
6. The chosen ids and their per-attempt option mapping are stored on `ExamAttempt`, so a refresh resumes the same paper.

### Option shuffling

Each attempt stores an `optionMapping`: `questionId → array where displayIndex gives the canonical option index`. Students answer with display indices, and everything is translated back before marking. Because the mapping is stored per attempt, a reload or a second device shows the same order.

### Marking policy

Deliberately simple, and in one place (`gradeAttempt`):

| Situation | Result |
|---|---|
| Exactly matches the answer key | Full marks |
| Answered, but not an exact match | Zero, or a deduction when the template enables negative marking |
| Unanswered | Zero — **never** a deduction |

The deduction is the question's `negativeMarks`, falling back to 25% of its marks. Partial credit for partially-correct multi-select answers is **not** awarded; change `gradeAttempt` if you want it. The percentage is clamped at 0, so negative marking cannot display a negative score.

The template configuration is snapshotted onto the attempt at start time, so editing an exam later cannot change how an in-flight attempt is marked.

### Timing

`expiresAt` is set when the attempt starts. Reopening the exam **resumes** the existing attempt rather than restarting the clock. When the timer runs out, the attempt auto-submits with whatever answers were saved. Submitting is idempotent: a repeat call returns the same result instead of marking the paper twice.

### Behavioral Competency 1,000-question bank

The repository ships `behavioral-1000/behavioral-1000.json` with 1,000 authored MCQs across 16 chapters. The seed script creates the chapter topics and a public exam template:

```bash
npm run db:migrate:randomized   # indexes for pool lookup and resume
npm run db:seed:bc1000          # questions + template (SQLite and PostgreSQL when DATABASE_URL is set)
```

| Setting | Value |
|---|---|
| Exam slug | `mock-exam-1` |
| Exam name | Mock Exam 1 |
| Questions | 100 drawn from the 1,000-question bank |
| Composition | equal topic weight across all 16 chapters (6–7 questions each) |
| Difficulty | `INTERMEDIATE` for the whole bank, with `{"INTERMEDIATE":1}` configured |
| Duration / pass | 120 minutes / 70% |

The script rebuilds only this bank's questions and refuses to re-seed once the template has recorded attempts unless `--force` is passed.

---

## API

All endpoints return `{ "data": … }` on success and `{ "error": { message, code, details } }` on failure. Status codes are conventional: `401` unauthenticated, `403` wrong role, `404` missing, `409` conflict (for example an exam that is already submitted), `422` validation failure with per-field details.

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create a STUDENT account and sign in. |
| `POST` | `/api/auth/login` | — | Sign in, setting the session cookie. |
| `POST` | `/api/auth/logout` | any | Clear the session. |
| `GET` | `/api/auth/me` | any | Current user, or `null`. |
| `GET` | `/api/questions` | any | Paginated, filterable question list. |
| `POST` | `/api/questions` | INSTRUCTOR+ | Create a question. |
| `GET` | `/api/questions/:id` | any | One question. |
| `PATCH` | `/api/questions/:id` | INSTRUCTOR+ | Update a question. |
| `DELETE` | `/api/questions/:id` | INSTRUCTOR+ | Delete a question (refused if it appears in an attempt). |
| `GET` | `/api/templates` | any | Exam templates; students see only published ones. |
| `POST` | `/api/templates` | INSTRUCTOR+ | Create a template. |
| `PATCH` | `/api/templates/:id` | INSTRUCTOR+ | Update a template. |
| `DELETE` | `/api/templates/:id` | INSTRUCTOR+ | Delete a template (refused once anyone has attempted it). |
| `POST` | `/api/attempts` | any | Start or resume an attempt. |
| `GET` | `/api/attempts/:token` | owner | Current attempt state (answers stripped). |
| `PATCH` | `/api/attempts/:token` | owner | Auto-save one answer and/or flag. |
| `POST` | `/api/attempts/:token/submit` | owner | Submit and mark. |
| `GET` | `/api/results` | any | Own results, or all results for staff. |
| `POST` | `/api/import` | INSTRUCTOR+ | Bulk import questions. |
| `GET` | `/api/import` | INSTRUCTOR+ | Recent import jobs. |

Roles are hierarchical (`ADMINISTRATOR` > `INSTRUCTOR` > `STUDENT`), so `requireRole("INSTRUCTOR")` also admits administrators.

---

## Importing questions

`/admin/import` accepts a CSV or JSON file (read in the browser and posted as JSON). Every row is validated and inserted independently: valid rows are imported, invalid rows are reported with their row number so you can fix and re-upload just those.

**CSV.** The header row is matched by name, case- and separator-insensitively. Provide the options as `option1…optionN`, and the answers as zero-based indices in `correctOptionIndices` (`0` or `0|2`). Use slugs for the taxonomy columns.

```csv
questionText,questionType,difficulty,option1,option2,option3,option4,correctOptionIndices,explanation,marks,subjectSlug,topicSlug,tags,status
"Which port does HTTPS use by default?",SINGLE_CHOICE,EASY,"21","80","443","8080",2,"HTTPS uses TCP port 443.",1,aws-fundamentals,s3,"network",PUBLISHED
```

Quoted fields, escaped quotes (`""`), embedded commas and newlines, and CRLF line endings are all handled.

**JSON.** An array of the same objects, with `options` as a real array, plus optional `subjectSlug`, `topicSlug`, or explicit ids.

---

## Testing

```bash
npm test
```

- **Pure unit tests** cover the exam engine (allocation, selection, shuffling, marking, review building), the zod rules, the CSV parser, and password/JWT handling.
- **Integration tests** (`tests/attempt-flow.test.ts`) exercise the whole lifecycle — start, resume, answer, flag, submit, grade, review, re-submit — against a real SQLite database built from the production `prisma/schema.sql`. They use a throwaway temp file, so they never touch your dev database. They also verify that a 100-question paper contains 100 distinct ids, that different students receive different sets, and that answers are not present in the pre-submission payload.
- **Bank tests** (`tests/behavioral-1000.test.ts`) validate the imported 1,000-question artifact: unique numbering, four options, valid answers, explanations, and all 16 topics.

Two things there are worth knowing about:

- The schema comes from the real DDL, so the tests fail if the schema and the application drift apart.
- The option mapping is read **straight out of the row** with `JSON.parse` rather than through the app's own helper. An earlier version reused the helper on both sides and passed while grading was silently marking shuffled exams against the authored option order. Tests that share the implementation's helper can agree with a bug.

`tests/attempt-flow.test.ts` finishes with two tests that answer every question of a fully shuffled exam — all correct, then all wrong — so shuffling cannot regress unnoticed.

### End-to-end smoke test

With the dev server running in another terminal:

```bash
npm run smoke
```

It walks the real HTTP API as a real user: signs in, starts an exam, reads the
stored option mapping to work out which *displayed* option is the correct one,
answers everything correctly, submits, and asserts the result comes back at
100%. It also checks role protection, anonymous access, idempotent submission,
and a CSV import with one good and one bad row.

It is deliberately independent of the application's own parsing helpers, so it
catches bugs the unit tests agree with by sharing.

> It writes test data (attempts, results, a couple of imported questions) into
the database it points at, so run it against a development database, not one
you care about.

---

## Troubleshooting

**`ExperimentalWarning: SQLite is an experimental feature`** — expected. `node:sqlite` is still flagged experimental; it is not an error.

**`Cannot find module './vendor-chunks/…'` when starting the dev server** — a stale `.next` directory, usually caused by running `npm run build` and `npm run dev` against the same folder. Clear it:

```bash
rm -rf .next && npm run dev
```

**`The database at … has no schema`** — run `npm run db:setup` before starting the server.

**`AUTH_SECRET is missing or too short`** — copy `.env.example` to `.env` and set a long random value.

**Port 3000 already in use** — `npm run dev -- -p 3001`.

---

## Notes and limitations

- **`node:sqlite` is marked experimental.** It prints a warning on startup. The API used here (`DatabaseSync`, `prepare`, `run`, `get`, `all`) has been stable across Node 22–25, but a future Node release could change it.
- **`next@14.2.23` has a published security advisory.** It was pinned by the original project scaffolding. Upgrading to a patched 14.2.x is worthwhile before deploying anywhere public.
- **`prisma/schema.prisma` is not used.** It is kept only as a readable description of the data model. The database is defined by `prisma/schema.sql` and accessed through `node:sqlite`; Prisma is not a dependency.
- **SQLite is single-writer.** Fine for a single Node process and the WAL journal mode used here, but it is not a multi-instance production database.
- **Short answer, essay, and matching questions** can be stored in the bank but are not auto-gradable. If one appears in an exam it is recorded as unanswered and the student is told so on screen.
