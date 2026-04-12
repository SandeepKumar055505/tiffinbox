import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('phone_verifications', (table) => {
    table.increments('id').primary();
    table.string('phone').notNullable().index();
    table.string('otp_code', 6).notNullable();
    table.timestamp('expires_at').notNullable();
    table.integer('attempts').defaultTo(0);
    table.string('ip_address');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('phone_verifications');
}
