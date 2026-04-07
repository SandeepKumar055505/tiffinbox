import { Router } from 'express';
import { requireUser } from '../middleware/auth';
import { getWalletBalance, getWalletHistory } from '../services/ledgerService';

const router = Router();

// GET /api/wallet/balance
router.get('/balance', requireUser, async (req, res) => {
  const balance = await getWalletBalance(req.userId!);
  res.json({ balance, currency: 'INR' });
});

// GET /api/wallet/entries
router.get('/entries', requireUser, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
  const entries = await getWalletHistory(req.userId!, limit);
  res.json(entries);
});

export default router;
