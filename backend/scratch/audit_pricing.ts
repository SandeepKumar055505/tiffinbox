import { db } from './src/config/db';

async function audit() {
  try {
    const settings = await db('app_settings').where({ id: 1 }).first();
    console.log('--- App Settings Audit ---');
    console.log('Breakfast Price:', settings.breakfast_price);
    console.log('Lunch Price:', settings.lunch_price);
    console.log('Dinner Price:', settings.dinner_price);
    console.log('Signup Bonus:', settings.signup_wallet_credit);
    
    const discounts = await db('plan_discounts').select('*');
    console.log('\n--- Plan Discounts Audit ---');
    discounts.forEach(d => {
      console.log(`Plan: ${d.plan_days} days, Meals: ${d.meals_per_day}, Discount: ${d.discount_amount} (Unit: ${typeof d.discount_amount})`);
    });

    console.log('\n--- Culprit Identification ---');
    if (settings.breakfast_price < 500) {
      console.warn('⚠️ WARNING: Breakfast price looks like RUPEES. Logic expects PAISE.');
    } else {
      console.log('✅ Breakfast price looks like PAISE.');
    }

  } catch (err: any) {
    console.error('Audit failed:', err.message);
  } finally {
    process.exit(0);
  }
}

audit();
