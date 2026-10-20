-- ============================================================================
-- Mock Examination Platform - PostgreSQL schema for Supabase
-- Run this once in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/izbexcmclhchqbzchxkz/sql/new
-- ============================================================================

-- ---------------------------------------------------------------- users ----
CREATE TABLE IF NOT EXISTS "User" (
  "id"         TEXT PRIMARY KEY,
  "email"      TEXT NOT NULL UNIQUE,
  "password"   TEXT NOT NULL,
  "name"       TEXT,
  "role"       TEXT NOT NULL DEFAULT 'EMPLOYEE'
                 CHECK ("role" IN ('STUDENT','EMPLOYEE','INSTRUCTOR','ADMINISTRATOR')),
  "createdAt"  TEXT NOT NULL,
  "updatedAt"  TEXT NOT NULL
);

-- ----------------------------------------------------------- taxonomy ------
CREATE TABLE IF NOT EXISTS "Category" (
  "id"           TEXT PRIMARY KEY,
  "slug"         TEXT NOT NULL UNIQUE,
  "name"         TEXT NOT NULL,
  "code"         TEXT,
  "description"  TEXT,
  "subjectCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TEXT NOT NULL,
  "updatedAt"    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Subject" (
  "id"         TEXT PRIMARY KEY,
  "slug"       TEXT NOT NULL UNIQUE,
  "name"       TEXT NOT NULL,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE,
  "createdAt"  TEXT NOT NULL,
  "updatedAt"  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "Subject_categoryId_idx" ON "Subject"("categoryId");

CREATE TABLE IF NOT EXISTS "Topic" (
  "id"         TEXT PRIMARY KEY,
  "slug"       TEXT NOT NULL UNIQUE,
  "name"       TEXT NOT NULL,
  "subjectId"  TEXT NOT NULL REFERENCES "Subject"("id") ON DELETE CASCADE,
  "createdAt"  TEXT NOT NULL,
  "updatedAt"  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "Topic_subjectId_idx" ON "Topic"("subjectId");

CREATE TABLE IF NOT EXISTS "Tag" (
  "id"        TEXT PRIMARY KEY,
  "slug"      TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

-- ---------------------------------------------------------- questions ------
CREATE TABLE IF NOT EXISTS "Question" (
  "id"                   TEXT PRIMARY KEY,
  "questionId"           TEXT UNIQUE,
  "questionText"         TEXT NOT NULL,
  "categoryId"           TEXT REFERENCES "Category"("id") ON DELETE SET NULL,
  "subjectId"            TEXT REFERENCES "Subject"("id")  ON DELETE SET NULL,
  "topicId"              TEXT REFERENCES "Topic"("id")    ON DELETE SET NULL,
  "difficulty"           TEXT NOT NULL DEFAULT 'EASY'
                           CHECK ("difficulty" IN ('EASY','INTERMEDIATE','HARD','EXPERT')),
  "questionType"         TEXT NOT NULL DEFAULT 'SINGLE_CHOICE'
                           CHECK ("questionType" IN ('SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','SHORT_ANSWER','SCENARIO','MATCHING','ESSAY')),
  "options"              TEXT NOT NULL DEFAULT '[]',
  "correctOptionIndices" TEXT NOT NULL DEFAULT '[]',
  "explanation"          TEXT,
  "marks"                REAL NOT NULL DEFAULT 1.00,
  "negativeMarks"        REAL,
  "tags"                 TEXT NOT NULL DEFAULT '[]',
  "learningObjectives"   TEXT,
  "source"               TEXT,
  "authorId"             TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "status"               TEXT NOT NULL DEFAULT 'DRAFT'
                           CHECK ("status" IN ('DRAFT','PUBLISHED','ARCHIVED')),
  "publishedAt"          TEXT,
  "archivedAt"           TEXT,
  "importId"             TEXT UNIQUE,
  "canonicalIndices"     TEXT NOT NULL DEFAULT '[]',
  "createdAt"            TEXT NOT NULL,
  "updatedAt"            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "Question_status_idx"       ON "Question"("status");
CREATE INDEX IF NOT EXISTS "Question_categoryId_idx"   ON "Question"("categoryId");
CREATE INDEX IF NOT EXISTS "Question_subjectId_idx"    ON "Question"("subjectId");
CREATE INDEX IF NOT EXISTS "Question_topicId_idx"      ON "Question"("topicId");
CREATE INDEX IF NOT EXISTS "Question_difficulty_idx"   ON "Question"("difficulty");
CREATE INDEX IF NOT EXISTS "Question_authorId_idx"     ON "Question"("authorId");
CREATE INDEX IF NOT EXISTS "Question_status_subjectId_idx" ON "Question"("status","subjectId");

CREATE TABLE IF NOT EXISTS "QuestionTag" (
  "questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE,
  "tagId"      TEXT NOT NULL REFERENCES "Tag"("id")      ON DELETE CASCADE,
  PRIMARY KEY ("questionId","tagId")
);
CREATE INDEX IF NOT EXISTS "QuestionTag_tagId_idx" ON "QuestionTag"("tagId");

CREATE TABLE IF NOT EXISTS "QuestionMark" (
  "id"          TEXT PRIMARY KEY,
  "questionId"  TEXT NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE,
  "weight"      REAL NOT NULL,
  "description" TEXT,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "QuestionMark_questionId_idx" ON "QuestionMark"("questionId");

-- ------------------------------------------------------- exam templates ----
CREATE TABLE IF NOT EXISTS "ExamTemplate" (
  "id"                     TEXT PRIMARY KEY,
  "slug"                   TEXT NOT NULL UNIQUE,
  "name"                   TEXT NOT NULL,
  "categoryId"             TEXT REFERENCES "Category"("id") ON DELETE SET NULL,
  "subjectId"              TEXT REFERENCES "Subject"("id")  ON DELETE SET NULL,
  "topicWeights"           TEXT,
  "totalQuestions"         INTEGER NOT NULL DEFAULT 10 CHECK ("totalQuestions" > 0),
  "durationMinutes"        INTEGER NOT NULL DEFAULT 30 CHECK ("durationMinutes" > 0),
  "marksPerQuestion"       REAL NOT NULL DEFAULT 1.00,
  "negativeMarking"        BOOLEAN NOT NULL DEFAULT FALSE,
  "difficultyDistribution" TEXT,
  "randomizeQuestions"     BOOLEAN NOT NULL DEFAULT TRUE,
  "randomizeOptions"       BOOLEAN NOT NULL DEFAULT TRUE,
  "avoidPreviouslySeen"    BOOLEAN NOT NULL DEFAULT FALSE,
  "allowReuse"             BOOLEAN NOT NULL DEFAULT FALSE,
  "autoSubmitOnExpiry"     BOOLEAN NOT NULL DEFAULT TRUE,
  "passThresholdPercent"   INTEGER NOT NULL DEFAULT 0,
  "description"            TEXT,
  "isPublic"               BOOLEAN NOT NULL DEFAULT TRUE,
  "publishedAt"            TEXT,
  "createdAt"              TEXT NOT NULL,
  "updatedAt"              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "ExamTemplate_subjectId_idx"  ON "ExamTemplate"("subjectId");
CREATE INDEX IF NOT EXISTS "ExamTemplate_categoryId_idx" ON "ExamTemplate"("categoryId");

CREATE TABLE IF NOT EXISTS "DifficultyDistribution" (
  "id"          TEXT PRIMARY KEY,
  "templateId"  TEXT NOT NULL REFERENCES "ExamTemplate"("id") ON DELETE CASCADE,
  "difficulty"  TEXT NOT NULL
                  CHECK ("difficulty" IN ('EASY','INTERMEDIATE','HARD','EXPERT')),
  "weight"      REAL NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "DifficultyDistribution_templateId_idx"
  ON "DifficultyDistribution"("templateId");

-- ---------------------------------------------------------- attempts -------
CREATE TABLE IF NOT EXISTS "ExamAttempt" (
  "id"                  TEXT PRIMARY KEY,
  "attemptToken"        TEXT NOT NULL UNIQUE,
  "templateId"          TEXT NOT NULL REFERENCES "ExamTemplate"("id") ON DELETE CASCADE,
  "userId"              TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "selectedQuestionIds" TEXT NOT NULL DEFAULT '[]',
  "optionMapping"       TEXT,
  "directionState"      TEXT NOT NULL DEFAULT 'FORWARD'
                          CHECK ("directionState" IN ('FORWARD','BACKWARD')),
  "flags"               TEXT NOT NULL DEFAULT '{}',
  "responses"           TEXT NOT NULL DEFAULT '{}',
  "previouslySeen"      TEXT NOT NULL DEFAULT '[]',
  "startedAt"           TEXT,
  "expiresAt"           TEXT,
  "submittedAt"         TEXT,
  "completedAt"         TEXT,
  "status"              TEXT NOT NULL DEFAULT 'ACTIVE'
                          CHECK ("status" IN ('ACTIVE','SUBMITTED','EXPIRED','CANCELLED')),
  "startedByUserId"     TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "configSnapshot"      TEXT,
  "createdAt"           TEXT NOT NULL,
  "updatedAt"           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "ExamAttempt_userId_idx"     ON "ExamAttempt"("userId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_templateId_idx" ON "ExamAttempt"("templateId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_status_idx"     ON "ExamAttempt"("status");
CREATE INDEX IF NOT EXISTS "ExamAttempt_user_template_status_idx" ON "ExamAttempt"("userId","templateId","status");

CREATE TABLE IF NOT EXISTS "AttemptQuestion" (
  "id"          TEXT PRIMARY KEY,
  "attemptId"   TEXT NOT NULL REFERENCES "ExamAttempt"("id") ON DELETE CASCADE,
  "questionId"  TEXT NOT NULL REFERENCES "Question"("id")    ON DELETE CASCADE,
  "optionOrder" INTEGER NOT NULL DEFAULT 0,
  "response"    TEXT,
  "isFlagged"   BOOLEAN NOT NULL DEFAULT FALSE,
  "position"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TEXT NOT NULL,
  UNIQUE ("attemptId","questionId")
);
CREATE INDEX IF NOT EXISTS "AttemptQuestion_attemptId_idx" ON "AttemptQuestion"("attemptId");

-- ----------------------------------------------------------- results -------
CREATE TABLE IF NOT EXISTS "Result" (
  "id"                  TEXT PRIMARY KEY,
  "attemptId"           TEXT NOT NULL UNIQUE REFERENCES "ExamAttempt"("id") ON DELETE CASCADE,
  "userId"              TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "totalQuestions"      INTEGER NOT NULL,
  "correctAnswers"      INTEGER NOT NULL,
  "incorrectAnswers"    INTEGER NOT NULL,
  "unansweredQuestions" INTEGER NOT NULL,
  "earnedMarks"         REAL NOT NULL,
  "maxMarks"            REAL NOT NULL,
  "percentage"          REAL NOT NULL,
  "durationSeconds"     INTEGER,
  "status"              TEXT NOT NULL DEFAULT 'PENDING'
                          CHECK ("status" IN ('PENDING','COMPLETED')),
  "passStatus"          TEXT CHECK ("passStatus" IN ('PASS','FAIL') OR "passStatus" IS NULL),
  "answerReview"        TEXT,
  "submittedAt"         TEXT,
  "createdAt"           TEXT NOT NULL,
  "updatedAt"           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "Result_userId_idx" ON "Result"("userId");

-- ----------------------------------------------------------- imports -------
CREATE TABLE IF NOT EXISTS "ImportJob" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "fileName"    TEXT NOT NULL,
  "fileType"    TEXT NOT NULL CHECK ("fileType" IN ('CSV','JSON')),
  "status"      TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK ("status" IN ('PENDING','RUNNING','COMPLETED','FAILED')),
  "totalRows"   INTEGER NOT NULL DEFAULT 0,
  "imported"    INTEGER NOT NULL DEFAULT 0,
  "skipped"     INTEGER NOT NULL DEFAULT 0,
  "failedRows"  TEXT,
  "startedAt"   TEXT,
  "completedAt" TEXT,
  "createdAt"   TEXT NOT NULL,
  "updatedAt"   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "ImportJob_userId_idx" ON "ImportJob"("userId");

-- ----------------------------------------------------------- audit ---------
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "action"    TEXT NOT NULL,
  "entity"    TEXT,
  "entityId"  TEXT,
  "details"   TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx"    ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- ------------------------------------------------------------- checkin ------
CREATE TABLE IF NOT EXISTS "CheckIn" (
  "id"           TEXT PRIMARY KEY,
  "employeeName" TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'PENDING',
  "checkedInAt"  TEXT NOT NULL,
  "approvedAt"   TEXT,
  "approvedBy"   TEXT,
  "sessionToken" TEXT,
  "notes"        TEXT
);

CREATE INDEX IF NOT EXISTS "idx_checkin_status" ON "CheckIn"("status");
CREATE INDEX IF NOT EXISTS "idx_checkin_employee" ON "CheckIn"("employeeName");
