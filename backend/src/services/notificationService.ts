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

export async function sendNotification(userId: number, type: NotificationType, title: string, message: string) {
  const user = await db('users').where({ id: userId }).select('notification_mutes').first();
  
  if (user?.notification_mutes?.includes(type)) {
    console.log(`[Notification] Muted: User ${userId} has muted ${type}`);
    return;
  }

  return db('notifications').insert({
    user_id: userId,
    title,
    message,
    is_read: false
  });
}
