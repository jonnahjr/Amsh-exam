const { Pool } = require("pg");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Seed script for Cyber Security Professional IV - 200 Challenging MCQs.
 *
 * Configures the category, subject, topics, 200-question bank, and the
 * 200-question exam template named after the source PDF.
 * Works with both SQLite (prisma/exam.db) and Supabase PostgreSQL (DATABASE_URL).
 *
 * Usage:
 *   node --env-file=.env scripts/seed-cyber-security-professional-iv.cjs
 */

const BANK_DIR = path.resolve(__dirname, "../cyber-security-professional-iv");
const BANK_PATH = path.join(BANK_DIR, "cyber-security-professional-iv.json");
const CATEGORY_SLUG = "cyber-security";
const CATEGORY_NAME = "Cyber Security";
const CATEGORY_CODE = "CSP4";
const CATEGORY_DESC =
  "Cyber security management, awareness, audit and vulnerability remediation, continuous monitoring, and hardening.";
const SUBJECT_SLUG = "cyber-security-professional-iv";
const SUBJECT_NAME = "Cyber Security Professional IV Bank";
const TEMPLATE_SLUG = "cyber-security-professional-iv-200-mcqs";
const QUESTION_CODE_PREFIX = "CSP4";
const DURATION_MINUTES = 200;
const PASS_THRESHOLD = 70;
const FORCE = process.argv.includes("--force");

const bank = JSON.parse(fs.readFileSync(BANK_PATH, "utf8"));
const questions = bank.questions;
const topics = bank.topics;
const TEMPLATE_NAME = bank.examName;
const TOTAL_QUESTIONS = questions.length;

function fail(message) {
  throw new Error(message);
}

function validate() {
  if (questions.length !== 200) fail(`Expected 200 questions, got ${questions.length}`);

  const numbers = new Set();
  for (const question of questions) {
    if (numbers.has(question.num)) fail(`Duplicate question number ${question.num}`);
    numbers.add(question.num);
    if (!question.text || !question.text.trim()) fail(`Q${question.num} has no text`);
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      fail(`Q${question.num} must have exactly four options`);
    }
    if (question.options.some((opt) => !opt || !opt.trim())) {
      fail(`Q${question.num} has an empty option`);
    }
    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      fail(`Q${question.num} has an invalid correctIndex`);
    }
    if ("ABCD"[question.correctIndex] !== question.correctAnswer) {
      fail(`Q${question.num} has a correctAnswer/index mismatch`);
    }
    if (!question.topicSlug) fail(`Q${question.num} has no topicSlug`);
  }

  const topicSlugs = new Set(topics.map((t) => t.slug));
  if (topicSlugs.size !== topics.length) fail("Topic slugs are not unique");

  const perTopic = {};
  for (const question of questions) {
    if (!topicSlugs.has(question.topicSlug)) fail(`Q${question.num} references an unknown topic`);
    perTopic[question.topicSlug] = (perTopic[question.topicSlug] ?? 0) + 1;
  }
  return perTopic;
}

/** Stable UUID-shaped ids so re-running the seed updates the same rows idempotently. */
function stableId(seed) {
  const hex = crypto.createHash("sha1").update(`csp4-200:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Paper allocation per topic = the exact number of questions each section holds. */
function topicWeightsFor(topicIds, perTopic) {
  return Object.fromEntries(
    topics.map((topic) => [topicIds[topic.slug], perTopic[topic.slug] ?? 0]),
  );
}

function questionTags(question) {
  return JSON.stringify([question.section, "Cyber Security", "Cyber Security Professional IV"]);
}

function questionCode(num) {
  return `${QUESTION_CODE_PREFIX}-${String(num).padStart(4, "0")}`;
}

function findAuthor(db, sqlite) {
  if (sqlite) {
    return (
      db.prepare("SELECT id FROM User WHERE email = ?").get("admin@exam.local") ??
      db.prepare("SELECT id FROM User WHERE role = 'ADMINISTRATOR' LIMIT 1").get() ??
      db.prepare("SELECT id FROM User LIMIT 1").get()
    );
  }
  return null;
}

async function seedSqlite(context, perTopic) {
  const dbPath = path.resolve(__dirname, "../prisma/exam.db");
  if (!fs.existsSync(dbPath)) {
    console.log("SQLite database file not found at", dbPath);
    return;
  }

  const db = new DatabaseSync(dbPath);
  try {
    const authorRow = findAuthor(db, true);
    if (!authorRow) fail("No author user exists in SQLite. Run `npm run db:setup` first.");
    const authorId = authorRow.id;
    const now = new Date().toISOString();

    let categoryRow = db.prepare("SELECT id FROM Category WHERE slug = ?").get(CATEGORY_SLUG);
    let categoryId;
    if (!categoryRow) {
      categoryId = stableId("category");
      db.prepare(
        "INSERT INTO Category (id,slug,name,code,description,subjectCount,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)",
      ).run(categoryId, CATEGORY_SLUG, CATEGORY_NAME, CATEGORY_CODE, CATEGORY_DESC, 1, now, now);
    } else {
      categoryId = categoryRow.id;
      db.prepare("UPDATE Category SET name = ?, code = ?, description = ?, updatedAt = ? WHERE id = ?").run(
        CATEGORY_NAME,
        CATEGORY_CODE,
        CATEGORY_DESC,
        now,
        categoryId,
      );
    }

    let subjectRow = db.prepare("SELECT id FROM Subject WHERE slug = ?").get(SUBJECT_SLUG);
    let subjectId;
    if (!subjectRow) {
      subjectId = stableId("subject");
      db.prepare("INSERT INTO Subject (id,slug,name,categoryId,createdAt,updatedAt) VALUES (?,?,?,?,?,?)").run(
        subjectId,
        SUBJECT_SLUG,
        SUBJECT_NAME,
        categoryId,
        now,
        now,
      );
    } else {
      subjectId = subjectRow.id;
      db.prepare("UPDATE Subject SET name = ?, categoryId = ?, updatedAt = ? WHERE id = ?").run(
        SUBJECT_NAME,
        categoryId,
        now,
        subjectId,
      );
    }

    const topicIds = {};
    for (const topic of topics) {
      const existing = db.prepare("SELECT id FROM Topic WHERE slug = ?").get(topic.slug);
      if (existing) {
        topicIds[topic.slug] = existing.id;
        db.prepare("UPDATE Topic SET name = ?, subjectId = ?, updatedAt = ? WHERE id = ?").run(
          topic.name,
          subjectId,
          now,
          existing.id,
        );
      } else {
        const topicId = stableId(`topic:${topic.slug}`);
        db.prepare("INSERT INTO Topic (id,slug,name,subjectId,createdAt,updatedAt) VALUES (?,?,?,?,?,?)").run(
          topicId,
          topic.slug,
          topic.name,
          subjectId,
          now,
          now,
        );
        topicIds[topic.slug] = topicId;
      }
    }

    const priorTemplate = db.prepare("SELECT id FROM ExamTemplate WHERE slug = ?").get(TEMPLATE_SLUG);
    if (priorTemplate && !FORCE) {
      const attempts = db
        .prepare("SELECT COUNT(*) AS n FROM ExamAttempt WHERE templateId = ?")
        .get(priorTemplate.id).n;
      if (Number(attempts) > 0) {
        fail(
          `Template ${TEMPLATE_SLUG} already has ${attempts} attempt(s). Re-run with --force to replace the bank anyway.`,
        );
      }
    }

    const topicWeights = topicWeightsFor(topicIds, perTopic);

    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM Question WHERE subjectId = ?").run(subjectId);

      const insert = db.prepare(`
        INSERT INTO Question (
          id, questionId, questionText, categoryId, subjectId, topicId, difficulty, questionType,
          options, correctOptionIndices, explanation, marks, negativeMarks, tags,
          learningObjectives, source, authorId, status, publishedAt, archivedAt,
          importId, canonicalIndices, createdAt, updatedAt
        ) VALUES (?,?,?,?,?,?, 'HARD', 'SINGLE_CHOICE', ?,?,?,1,NULL,?, NULL,?,?, 'PUBLISHED',?,NULL, NULL,'[0,1,2,3]',?,?)
      `);

      for (const question of questions) {
        insert.run(
          stableId(`question:${question.num}`),
          questionCode(question.num),
          question.text,
          categoryId,
          subjectId,
          topicIds[question.topicSlug],
          JSON.stringify(question.options),
          JSON.stringify([question.correctIndex]),
          question.explanation,
          questionTags(question),
          bank.source,
          authorId,
          now,
          now,
          now,
        );
      }

      const existingTemplate = db.prepare("SELECT id FROM ExamTemplate WHERE slug = ?").get(TEMPLATE_SLUG);
      const templateId = existingTemplate ? existingTemplate.id : stableId("template");
      const description = `All 200 questions from “${TEMPLATE_NAME}”, covering the position purpose and the four results expected of the Cyber Security Professional IV role.`;

      if (existingTemplate) {
        db.prepare(`
          UPDATE ExamTemplate SET
            name = ?, categoryId = ?, subjectId = ?, topicWeights = ?, totalQuestions = ?,
            durationMinutes = ?, marksPerQuestion = 1, negativeMarking = 0,
            difficultyDistribution = '{"HARD":1}', randomizeQuestions = 1, randomizeOptions = 1,
            avoidPreviouslySeen = 0, allowReuse = 0, autoSubmitOnExpiry = 1,
            passThresholdPercent = ?, description = ?, isPublic = 1, publishedAt = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          TEMPLATE_NAME,
          categoryId,
          subjectId,
          JSON.stringify(topicWeights),
          TOTAL_QUESTIONS,
          DURATION_MINUTES,
          PASS_THRESHOLD,
          description,
          now,
          now,
          templateId,
        );
      } else {
        db.prepare(`
          INSERT INTO ExamTemplate (
            id, slug, name, categoryId, subjectId, topicWeights, totalQuestions, durationMinutes,
            marksPerQuestion, negativeMarking, difficultyDistribution, randomizeQuestions,
            randomizeOptions, avoidPreviouslySeen, allowReuse, autoSubmitOnExpiry,
            passThresholdPercent, description, isPublic, publishedAt, createdAt, updatedAt
          ) VALUES (?,?,?,?,?,?,?,?,1,0,'{"HARD":1}',1,1,0,0,1,?,?,1,?,?,?)
        `).run(
          templateId,
          TEMPLATE_SLUG,
          TEMPLATE_NAME,
          categoryId,
          subjectId,
          JSON.stringify(topicWeights),
          TOTAL_QUESTIONS,
          DURATION_MINUTES,
          PASS_THRESHOLD,
          description,
          now,
          now,
          now,
        );
      }

      db.prepare("DELETE FROM DifficultyDistribution WHERE templateId = ?").run(templateId);
      db.prepare(
        'INSERT INTO DifficultyDistribution (id, templateId, difficulty, weight, "order") VALUES (?,?,?,?,?)',
      ).run(stableId("difficulty:HARD"), templateId, "HARD", 1, 0);

      db.exec("COMMIT");
      console.log(
        `SQLite: Seeded ${questions.length} questions across ${topics.length} topics into '${TEMPLATE_NAME}' (${TEMPLATE_SLUG}).`,
      );
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    context.sqlite = { categoryId, subjectId };
  } finally {
    db.close();
  }
}

async function seedPostgres(context, perTopic) {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found; skipping PostgreSQL seed.");
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  try {
    const authorRes = await pool.query('SELECT id FROM "User" WHERE email = $1', ["admin@exam.local"]);
    let authorId = authorRes.rows[0]?.id;
    if (!authorId) {
      const fallback = await pool.query(
        'SELECT id FROM "User" WHERE role = \'ADMINISTRATOR\' ORDER BY "createdAt" LIMIT 1',
      );
      authorId = fallback.rows[0]?.id;
    }
    if (!authorId) {
      const anyUser = await pool.query('SELECT id FROM "User" ORDER BY "createdAt" LIMIT 1');
      authorId = anyUser.rows[0]?.id;
    }
    if (!authorId) fail("No author user exists in PostgreSQL.");

    const now = new Date().toISOString();

    let categoryRes = await pool.query('SELECT id FROM "Category" WHERE slug = $1', [CATEGORY_SLUG]);
    let categoryId = categoryRes.rows[0]?.id;
    if (!categoryId) {
      categoryId = stableId("category");
      await pool.query(
        'INSERT INTO "Category" (id,slug,name,code,description,"subjectCount","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [categoryId, CATEGORY_SLUG, CATEGORY_NAME, CATEGORY_CODE, CATEGORY_DESC, 1, now, now],
      );
    } else {
      await pool.query(
        'UPDATE "Category" SET name = $1, code = $2, description = $3, "updatedAt" = $4 WHERE id = $5',
        [CATEGORY_NAME, CATEGORY_CODE, CATEGORY_DESC, now, categoryId],
      );
    }

    let subjectRes = await pool.query('SELECT id FROM "Subject" WHERE slug = $1', [SUBJECT_SLUG]);
    let subjectId = subjectRes.rows[0]?.id;
    if (!subjectId) {
      subjectId = stableId("subject");
      await pool.query(
        'INSERT INTO "Subject" (id,slug,name,"categoryId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6)',
        [subjectId, SUBJECT_SLUG, SUBJECT_NAME, categoryId, now, now],
      );
    } else {
      await pool.query('UPDATE "Subject" SET name = $1, "categoryId" = $2, "updatedAt" = $3 WHERE id = $4', [
        SUBJECT_NAME,
        categoryId,
        now,
        subjectId,
      ]);
    }

    const topicIds = {};
    for (const topic of topics) {
      const existing = await pool.query('SELECT id FROM "Topic" WHERE slug = $1', [topic.slug]);
      if (existing.rows[0]) {
        topicIds[topic.slug] = existing.rows[0].id;
        await pool.query('UPDATE "Topic" SET name = $1, "subjectId" = $2, "updatedAt" = $3 WHERE id = $4', [
          topic.name,
          subjectId,
          now,
          existing.rows[0].id,
        ]);
      } else {
        const topicId = stableId(`topic:${topic.slug}`);
        await pool.query(
          'INSERT INTO "Topic" (id,slug,name,"subjectId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6)',
          [topicId, topic.slug, topic.name, subjectId, now, now],
        );
        topicIds[topic.slug] = topicId;
      }
    }

    const priorTemplate = await pool.query('SELECT id FROM "ExamTemplate" WHERE slug = $1', [TEMPLATE_SLUG]);
    if (priorTemplate.rows[0] && !FORCE) {
      const attemptCount = await pool.query(
        'SELECT COUNT(*)::int AS n FROM "ExamAttempt" WHERE "templateId" = $1',
        [priorTemplate.rows[0].id],
      );
      if (attemptCount.rows[0].n > 0) {
        fail(
          `Template ${TEMPLATE_SLUG} already has ${attemptCount.rows[0].n} attempt(s). Re-run with --force to replace the bank anyway.`,
        );
      }
    }

    const topicWeights = topicWeightsFor(topicIds, perTopic);
    const description = `All 200 questions from “${TEMPLATE_NAME}”, covering the position purpose and the four results expected of the Cyber Security Professional IV role.`;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query('DELETE FROM "Question" WHERE "subjectId" = $1', [subjectId]);

      // Batch insert in chunks of 50 for rapid network execution over the Supabase pooler.
      const CHUNK_SIZE = 50;
      for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
        const chunk = questions.slice(i, i + CHUNK_SIZE);
        const values = [];
        const placeholders = [];
        let pIndex = 1;

        for (const question of chunk) {
          values.push(
            stableId(`question:${question.num}`),
            questionCode(question.num),
            question.text,
            categoryId,
            subjectId,
            topicIds[question.topicSlug],
            JSON.stringify(question.options),
            JSON.stringify([question.correctIndex]),
            question.explanation,
            questionTags(question),
            bank.source,
            authorId,
            now,
            now,
            now,
          );
          placeholders.push(`(
            $${pIndex}, $${pIndex + 1}, $${pIndex + 2}, $${pIndex + 3}, $${pIndex + 4}, $${pIndex + 5},
            'HARD', 'SINGLE_CHOICE',
            $${pIndex + 6}, $${pIndex + 7}, $${pIndex + 8}, 1, NULL, $${pIndex + 9},
            NULL, $${pIndex + 10}, $${pIndex + 11}, 'PUBLISHED', $${pIndex + 12}, NULL,
            NULL, '[0,1,2,3]', $${pIndex + 13}, $${pIndex + 14}
          )`);
          pIndex += 15;
        }

        await client.query(
          `INSERT INTO "Question" (
            id, "questionId", "questionText", "categoryId", "subjectId", "topicId", difficulty, "questionType",
            options, "correctOptionIndices", explanation, marks, "negativeMarks", tags,
            "learningObjectives", source, "authorId", status, "publishedAt", "archivedAt",
            "importId", "canonicalIndices", "createdAt", "updatedAt"
          ) VALUES ${placeholders.join(", ")}`,
          values,
        );
      }

      const existingTemplate = await client.query('SELECT id FROM "ExamTemplate" WHERE slug = $1', [
        TEMPLATE_SLUG,
      ]);
      const templateId = existingTemplate.rows[0]?.id ?? stableId("template");

      if (existingTemplate.rows[0]) {
        await client.query(
          `UPDATE "ExamTemplate" SET
            name = $1, "categoryId" = $2, "subjectId" = $3, "topicWeights" = $4,
            "totalQuestions" = $5, "durationMinutes" = $6, "marksPerQuestion" = 1,
            "negativeMarking" = false, "difficultyDistribution" = '{"HARD":1}',
            "randomizeQuestions" = true, "randomizeOptions" = true,
            "avoidPreviouslySeen" = false, "allowReuse" = false, "autoSubmitOnExpiry" = true,
            "passThresholdPercent" = $7, description = $8, "isPublic" = true,
            "publishedAt" = $9, "updatedAt" = $10
          WHERE id = $11`,
          [
            TEMPLATE_NAME,
            categoryId,
            subjectId,
            JSON.stringify(topicWeights),
            TOTAL_QUESTIONS,
            DURATION_MINUTES,
            PASS_THRESHOLD,
            description,
            now,
            now,
            templateId,
          ],
        );
      } else {
        await client.query(
          `INSERT INTO "ExamTemplate" (
            id, slug, name, "categoryId", "subjectId", "topicWeights", "totalQuestions", "durationMinutes",
            "marksPerQuestion", "negativeMarking", "difficultyDistribution", "randomizeQuestions",
            "randomizeOptions", "avoidPreviouslySeen", "allowReuse", "autoSubmitOnExpiry",
            "passThresholdPercent", description, "isPublic", "publishedAt", "createdAt", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,1,false,'{"HARD":1}',true,true,false,false,true,$9,$10,true,$11,$12,$13
          )`,
          [
            templateId,
            TEMPLATE_SLUG,
            TEMPLATE_NAME,
            categoryId,
            subjectId,
            JSON.stringify(topicWeights),
            TOTAL_QUESTIONS,
            DURATION_MINUTES,
            PASS_THRESHOLD,
            description,
            now,
            now,
            now,
          ],
        );
      }

      await client.query('DELETE FROM "DifficultyDistribution" WHERE "templateId" = $1', [templateId]);
      await client.query(
        'INSERT INTO "DifficultyDistribution" (id, "templateId", difficulty, weight, "order") VALUES ($1,$2,$3,$4,$5)',
        [stableId("difficulty:HARD"), templateId, "HARD", 1, 0],
      );

      await client.query("COMMIT");
      console.log(
        `PostgreSQL: Seeded ${questions.length} questions across ${topics.length} topics into '${TEMPLATE_NAME}' (${TEMPLATE_SLUG}).`,
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    context.postgres = { categoryId, subjectId };
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log("Validating the 200-question Cyber Security Professional IV bank...");
  const perTopic = validate();
  console.log("Validation passed. Questions per topic:", perTopic);

  const context = {};
  console.log("Seeding SQLite...");
  await seedSqlite(context, perTopic);

  console.log("Seeding PostgreSQL...");
  await seedPostgres(context, perTopic);

  console.log(`\nDone! '${TEMPLATE_NAME}' is ready with all ${TOTAL_QUESTIONS} questions.`);
}

main().catch((err) => {
  console.error("Fatal seed error:", err.message);
  process.exit(1);
});
