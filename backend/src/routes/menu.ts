import { Router } from 'express';
import { db } from '../config/db';

const router = Router();

// GET /api/menu/week — formatted grid for subscription builder
router.get('/week', async (_req, res) => {
  const rows = await db('default_menu as dm')
    .join('meal_items as mi', 'mi.id', 'dm.item_id')
    .leftJoin('default_menu_alternatives as dma', 'dma.default_menu_id', 'dm.id')
    .leftJoin('meal_items as alt', 'alt.id', 'dma.item_id')
    .select(
      'dm.weekday', 'dm.meal_type',
      'mi.id as default_id', 'mi.name as default_name', 'mi.image_url as default_image', 'mi.description as default_desc',
      'alt.id as alt_id', 'alt.name as alt_name', 'alt.image_url as alt_image'
    )
    .orderBy(['dm.weekday', 'dm.meal_type']);

  // Reshape into grid
  const grid: Record<number, Record<string, any>> = {};
  for (const row of rows) {
    if (!grid[row.weekday]) grid[row.weekday] = {};
    if (!grid[row.weekday][row.meal_type]) {
      grid[row.weekday][row.meal_type] = {
        default: { id: row.default_id, name: row.default_name, image_url: row.default_image, description: row.default_desc },
        alternatives: [],
      };
    }
    if (row.alt_id) {
      grid[row.weekday][row.meal_type].alternatives.push({
        id: row.alt_id, name: row.alt_name, image_url: row.alt_image,
      });
    }
  }

  res.json(grid);
});

// GET /api/menu — flat list
router.get('/', async (_req, res) => {
  const rows = await db('default_menu as dm')
    .join('meal_items as mi', 'mi.id', 'dm.item_id')
    .select('dm.*', 'mi.name', 'mi.image_url', 'mi.description')
    .orderBy(['dm.weekday', 'dm.meal_type']);
  res.json(rows);
});

export default router;
