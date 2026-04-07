import * as dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { db } from '../config/db';
import { env } from '../config/env';

async function seed() {
  // Admin account
  const existing = await db('admins').where({ email: env.ADMIN_SEED_EMAIL }).first();
  if (!existing) {
    const hash = await bcrypt.hash(env.ADMIN_SEED_PASSWORD, 12);
    await db('admins').insert({ name: 'Admin', email: env.ADMIN_SEED_EMAIL, password_hash: hash });
    console.log(`✓ Admin created: ${env.ADMIN_SEED_EMAIL}`);
  } else {
    console.log('  Admin already exists, skipping');
  }

  // Sample meal items
  const meals = [
    { name: 'Poha', description: 'Flattened rice with onion, peanuts and spices', type: 'breakfast', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian'] },
    { name: 'Upma', description: 'Semolina cooked with vegetables and curry leaves', type: 'breakfast', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian'] },
    { name: 'Paratha + Dahi', description: 'Whole wheat flatbread with curd', type: 'breakfast', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian'] },
    { name: 'Idli + Sambar', description: 'Steamed rice cakes with lentil soup', type: 'breakfast', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian','vegan'] },
    { name: 'Dal Makhani + Roti', description: 'Creamy black lentils with whole wheat bread', type: 'lunch', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian'] },
    { name: 'Rajma Chawal', description: 'Kidney bean curry with steamed rice', type: 'lunch', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian','vegan'] },
    { name: 'Chole Bhature', description: 'Spiced chickpeas with fried bread', type: 'lunch', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian'] },
    { name: 'Paneer Sabzi + Rice', description: 'Cottage cheese curry with basmati rice', type: 'lunch', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian'] },
    { name: 'Khichdi', description: 'Lentil and rice comfort food with ghee', type: 'dinner', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian'] },
    { name: 'Dosa + Chutney', description: 'Crispy rice crepe with coconut chutney', type: 'dinner', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian','vegan'] },
    { name: 'Roti + Sabzi', description: 'Whole wheat bread with seasonal vegetable curry', type: 'dinner', image_url: '', price: 0, is_available: true, is_extra: false, tags: ['vegetarian'] },
    // Extras
    { name: 'Raita', description: 'Yogurt with cucumber and spices', type: 'extra', image_url: '', price: 1500, is_available: true, is_extra: true, tags: ['vegetarian'] },
    { name: 'Masala Papad', description: 'Crispy lentil wafer with toppings', type: 'extra', image_url: '', price: 2000, is_available: true, is_extra: true, tags: ['vegetarian','vegan'] },
    { name: 'Gulab Jamun (2pc)', description: 'Soft milk solids in rose-flavoured syrup', type: 'extra', image_url: '', price: 2500, is_available: true, is_extra: true, tags: ['vegetarian'] },
  ];

  for (const meal of meals) {
    const exists = await db('meal_items').where({ name: meal.name, type: meal.type }).first();
    if (!exists) await db('meal_items').insert(meal);
  }
  console.log('✓ Sample meal items seeded');

  // Default weekly menu (Mon-Sun × B/L/D)
  // Uses first items of each type as defaults, spread across the week
  const breakfastItems = await db('meal_items').where({ type: 'breakfast', is_extra: false }).orderBy('id');
  const lunchItems = await db('meal_items').where({ type: 'lunch', is_extra: false }).orderBy('id');
  const dinnerItems = await db('meal_items').where({ type: 'dinner', is_extra: false }).orderBy('id');

  for (let weekday = 0; weekday <= 6; weekday++) {
    const b = breakfastItems[weekday % breakfastItems.length];
    const l = lunchItems[weekday % lunchItems.length];
    const d = dinnerItems[weekday % dinnerItems.length];

    for (const [meal_type, item] of [['breakfast', b], ['lunch', l], ['dinner', d]] as const) {
      if (!item) continue;
      await db('default_menu')
        .insert({ weekday, meal_type, item_id: item.id })
        .onConflict(['weekday', 'meal_type'])
        .ignore();
    }
  }
  console.log('✓ Default weekly menu seeded');

  console.log('\nSeed complete.');
  await db.destroy();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
