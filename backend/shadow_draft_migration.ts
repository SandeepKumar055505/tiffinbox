import 'dotenv/config';
import { db } from './src/config/db';

async function migrate() {
  try {
    const hasTable = await db.schema.hasTable('shadow_drafts');
    if (!hasTable) {
      await db.schema.createTable('shadow_drafts', (t) => {
        t.integer('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
        t.jsonb('draft_data').notNullable();
        t.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Successfully created shadow_drafts table');
    } else {
      console.log('shadow_drafts table already exists');
    }
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
