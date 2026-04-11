import { db } from './src/config/db';

async function clean() {
  try {
    const r = await db.raw('SELECT 1 as is_up');
    console.log('Database connected.', r.rows);
    
    console.log('Cleaning ledger_entries...');
    await db('ledger_entries').del();
    console.log('Cleaning payment_attempts...');
    await db('payment_attempts').del();
    console.log('Cleaning payments...');
    await db('payments').del();
    console.log('Cleaning skip_requests...');
    await db('skip_requests').del().catch(()=>console.log('no skip_requests table'));
    console.log('Cleaning meal_cells...');
    await db('meal_cells').del();
    console.log('Cleaning subscriptions...');
    await db('subscriptions').del();
    console.log('Cleaning persons...');
    await db('persons').del();
    console.log('Cleaning ratings...');
    await db('ratings').del().catch(()=>console.log('no ratings table'));
    console.log('Cleaning audit_logs...');
    await db('audit_logs').del().catch(()=>console.log('no audit_logs table'));
    console.log('Cleaning support_tickets...');
    await db('support_ticket_messages').del().catch(()=>console.log('no support_ticket_messages'));
    await db('support_tickets').del().catch(()=>console.log('no support_tickets table'));
    console.log('Cleaning users...');
    await db('users').del();
    
    console.log('Successfully cleaned all test arrays and user records. Admin creds remain.');
  } catch (e) {
    console.error('Failed to clean database:', e);
  } finally {
    process.exit(0);
  }
}

clean();
