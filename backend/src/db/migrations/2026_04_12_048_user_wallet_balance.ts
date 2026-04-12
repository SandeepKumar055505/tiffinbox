import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add the column
  await knex.schema.alterTable('users', (table) => {
    table.integer('wallet_balance').defaultTo(0).notNullable();
  });

  // 2. Seed the column from ledger history (The Financial Manifest)
  // We calculate the sum of all credits (+) and debits (-) for each user
  await knex.raw(`
    UPDATE users u
    SET wallet_balance = COALESCE(
      (SELECT SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END)
       FROM ledger_entries
       WHERE user_id = u.id),
      0
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('wallet_balance');
  });
}
