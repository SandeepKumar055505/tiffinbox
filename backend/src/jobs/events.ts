import { boss } from './client';

export enum DomainEvent {
  SUBSCRIPTION_CREATED = 'subscription.created',
  PAYMENT_SUCCESS      = 'payment.success',
  PAYMENT_FAILED       = 'payment.failed',
  MEAL_SKIPPED         = 'meal.skipped',
  DELIVERY_FAILED      = 'delivery.failed',
  DELIVERY_COMPLETED   = 'delivery.completed',
  PLAN_EXPIRING        = 'plan.expiring',
  SKIP_REQUEST_CREATED = 'skip_request.created',
  STREAK_MILESTONE     = 'streak.milestone',
  PERSON_UPDATED       = 'person.updated',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  UPI_PAYMENT_SUBMITTED  = 'upi_payment.submitted',
  UPI_PAYMENT_APPROVED   = 'upi_payment.approved',
  UPI_PAYMENT_DENIED     = 'upi_payment.denied',
}

export async function emitEvent(event: DomainEvent, payload: object): Promise<void> {
  await boss.send(event, payload);
}
