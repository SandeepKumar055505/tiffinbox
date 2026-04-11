import { db } from './src/config/db';

async function run() {
  try {
    const hasForcePhone = await db.schema.hasColumn('app_settings', 'onboarding_force_phone');
    if (!hasForcePhone) {
      await db.schema.alterTable('app_settings', t => {
        t.boolean('onboarding_force_phone').notNullable().defaultTo(true);
        t.boolean('onboarding_skip_referral_check').notNullable().defaultTo(false);
      });
      console.log('Successfully added onboarding settings to app_settings');
    } else {
      console.log('Onboarding settings already exist');
    }
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
