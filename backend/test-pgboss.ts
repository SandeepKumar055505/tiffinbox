import { env } from './src/config/env';
import PgBoss from 'pg-boss';

async function test() {
  const boss = new PgBoss(env.DATABASE_URL);
  try {
    await boss.start();
    console.log('Boss started');
    
    // Attempt to schedule
    console.log('Creating queue plan.expiry-check...');
    try { await (boss as any).createQueue('plan.expiry-check'); } catch (e) { console.log('createQueue might not exist or failed', e); }
    
    console.log('Scheduling plan.expiry-check...');
    await boss.schedule('plan.expiry-check', '0 23 * * *', {}, { tz: 'Asia/Kolkata' });
    console.log('Scheduled');
    
    // Attempt to work
    console.log('Working on plan.expiry-check...');
    await boss.work('plan.expiry-check', async (job) => {
      console.log('Job processed');
    });
    console.log('Worker registered');
    
    await boss.stop();
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
