const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
}

async function fixPostgres() {
  console.log('--- Updating Supabase PostgreSQL constraint ---');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Dropping existing User_role_check constraint...');
    await client.query('ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_role_check"');

    console.log('Adding new User_role_check constraint allowing STUDENT, EMPLOYEE, INSTRUCTOR, ADMINISTRATOR...');
    await client.query(`
      ALTER TABLE "User" ADD CONSTRAINT "User_role_check"
      CHECK ("role" IN ('STUDENT', 'EMPLOYEE', 'INSTRUCTOR', 'ADMINISTRATOR'))
    `);

    await client.query('COMMIT');
    console.log('Successfully updated PostgreSQL constraint!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to update PostgreSQL constraint:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

fixPostgres().catch((err) => {
  console.error(err);
  process.exit(1);
});
