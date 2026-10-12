const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pool.query(`
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
  `);
  console.log('CheckIn table created in Supabase successfully!');
  await pool.end();
}

run().catch(console.error);
