import Knex from 'knex';
import { env } from './env';

export const db = Knex({
  client: 'pg',
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 10000,
    statement_timeout: 10000,
  },
  pool: {
    min: 0,
    max: 5,
    acquireTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    propagateCreateError: false,
  },
  acquireConnectionTimeout: 8000,
});
