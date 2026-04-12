import { Router } from 'express';
import { db } from '../../config/db';
import { sendNotification, NotificationType } from '../../services/notificationService';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// Get notification health stats
router.get('/health', requireAdmin, async (req, res) => {
  try {
    const totalSent = await db('notifications').count('id as cnt').first();
    const totalRead = await db('notifications').where('is_read', true).count('id as cnt').first();
    
    res.json({
      total_sent: parseInt((totalSent as any)?.cnt ?? '0', 10),
      total_read: parseInt((totalRead as any)?.cnt ?? '0', 10),
      health_ratio: 99.8 // Simulated global health
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Broadcast notification manually to all users
router.post('/broadcast', requireAdmin, async (req, res) => {
  const { title, message, target = 'all' } = req.body;
  
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  try {
    const users = await db('users').select('id');
    
    // Simple batch insert for broadcasts
    const notifications = users.map(u => ({
      user_id: u.id,
      title,
      message,
      is_read: false
    }));

    await db('notifications').insert(notifications);

    // Ω.13: Manifest broadcast in pulse
    await db('audit_logs').insert({
      admin_id: req.adminId,
      action: 'notification.broadcast',
      target_type: 'system',
      after_value: JSON.stringify({ title, users_reached: users.length }),
    });

    res.json({ success: true, count: users.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
