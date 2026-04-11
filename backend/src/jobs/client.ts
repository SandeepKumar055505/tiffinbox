import PgBoss from 'pg-boss';
import { env } from '../config/env';

/**
 * Shared PgBoss Client
 * 
 * Initialized in its own module to prevent circular dependencies between 
 * events.ts (the emitter) and index.ts (the consumer).
 */
export const boss = new PgBoss(env.DATABASE_URL);
