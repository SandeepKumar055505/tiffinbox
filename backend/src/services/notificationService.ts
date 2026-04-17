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

export async function sendNotification(
  userId: number,
  type: NotificationType,
  title: string,
  message: string,
) {
  try {
    const user = await db('users').where({ id: userId }).select('notification_mutes').first();

    if (user?.notification_mutes?.includes(type)) {
      return;
    }

    const [result] = await db('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      is_read: false,
    }).returning('id');

    return result;
  } catch (err: any) {
    console.error(`[Notification] Failed to send to user ${userId}:`, err.message);
  }
}
