import { db } from '../config/db';

export enum NotificationType {
  DELIVERY = 'delivery',
  STREAK = 'streak',
  PAYMENTS = 'payments',
  PROMO = 'promo',
  SUPPORT = 'support',
  SYSTEM = 'system',
  OFFER = 'offer'
}

export async function sendNotification(userId: number, type: NotificationType, defaultTitle: string, defaultMessage: string, narrativeKey?: string) {
  const user = await db('users').where({ id: userId }).select('notification_mutes').first();
  
  if (user?.notification_mutes?.includes(type)) {
    console.log(`[Notification] Muted: User ${userId} has muted ${type}`);
    return;
  }

  // Ω.13: Fetch Dynamic Narrative
  let title = defaultTitle;
  let message = defaultMessage;
  if (narrativeKey || type) {
    const narrative = await db('gourmet_narratives').where({ error_key: narrativeKey || type }).first();
    if (narrative?.title) title = narrative.title;
    if (narrative?.message) message = narrative.message;
  }

  const result = await db('notifications').insert({
    user_id: userId,
    title,
    message,
    is_read: false
  }).returning('id');

  // Ω.13: Manifest the Delivery Outcome in the pulse
  try {
    await db('audit_logs').insert({
      action: `notification.delivered.${type}`,
      target_type: 'user',
      target_id: userId,
      after_value: JSON.stringify({ title, notification_id: result[0]?.id || result[0] }),
    });
  } catch (err: any) {
    console.error(`[audit] Failed to log notification delivery:`, err.message);
  }

  return result;
}
