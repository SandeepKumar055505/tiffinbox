import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

import { db } from '../config/db';

export async function runMigrations() {
  await db.raw(`
    CREATE TABLE IF NOT EXISTS migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = await db('migrations').pluck('filename') as string[];

  for (const file of files) {
    if (applied.includes(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying: ${file}`);
    await db.raw(sql);
    await db('migrations').insert({ filename: file });
    console.log(`  ✓ Done`);
  }

  console.log('All migrations applied.');
}

// Run as standalone script
if (require.main === module) {
  runMigrations()
    .then(() => db.destroy())
    .catch(err => {
      console.error('Migration failed:', err.message);
      process.exit(1);
    });
}
