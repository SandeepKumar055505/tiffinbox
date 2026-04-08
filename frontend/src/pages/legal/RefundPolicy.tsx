import React from 'react';
import { Link } from 'react-router-dom';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-12 animate-glass">
        <header className="space-y-4">
          <Link to="/" className="btn-ghost !text-[10px] w-fit">← Back to Home</Link>
          <h1 className="text-h1 !text-4xl">Refund &amp; Cancellation Policy</h1>
          <p className="text-body-sm opacity-50">Last Updated: April 2026</p>
        </header>

        <section className="glass p-8 md:p-12 space-y-8 leading-relaxed">
          <div className="space-y-3">
            <p className="t-text-secondary">
              This Refund Policy explains how refunds and cancellations work for subscriptions placed on <strong>mytiffinpoint.com</strong>, operated by M/S TiffinPoint Services. By placing an order you agree to the terms below.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">1. Skip Credits (before cutoff)</h2>
            <p className="t-text-secondary">
              If you skip a meal before the applicable cutoff time — Breakfast by 12:00 PM the previous day, Lunch by 10:00 AM the same day, Dinner by 6:00 PM the same day — the full cost of that meal is automatically credited to your TiffinPoint Wallet. Wallet credits appear instantly and can be used against any future subscription.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">2. Missed, Late, or Unsatisfactory Deliveries</h2>
            <p className="t-text-secondary">
              If we fail to deliver a meal, deliver it materially late, or the meal is damaged, spoiled, or incorrect, please contact us at <strong>support@mytiffinpoint.com</strong> or via the in-app support within 4 hours of the delivery window. Once verified, the full cost of the affected meal will be credited to your TiffinPoint Wallet within 24 hours.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">3. Subscription Cancellation</h2>
            <p className="t-text-secondary">
              You may cancel an active subscription at any time from your dashboard. On cancellation:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2 t-text-secondary">
              <li>Meals already delivered are non-refundable.</li>
              <li>The value of all remaining undelivered meals, minus any plan-level discounts proportionally applied, is credited to your TiffinPoint Wallet within 24 hours.</li>
              <li>If you request a bank refund instead of wallet credit (see Section 4), we will process it through the original payment method.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">4. Bank Refunds to Original Payment Method</h2>
            <p className="t-text-secondary">
              Direct refunds to your original payment method are available in the following cases:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2 t-text-secondary">
              <li>A duplicate charge or failed transaction where money was deducted but no subscription was activated.</li>
              <li>Service discontinuation in your delivery area.</li>
              <li>Unused wallet balance at account closure, upon written request.</li>
            </ul>
            <p className="t-text-secondary">
              To request a bank refund, email <strong>support@mytiffinpoint.com</strong> with your order ID and reason. Approved refunds are initiated within 2 business days and are credited to your original payment method (UPI, card, or bank account) by Razorpay within <strong>5–7 business days</strong>, depending on your bank.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">5. Failed Payments</h2>
            <p className="t-text-secondary">
              If your payment was deducted but your subscription did not activate (e.g., due to a network failure during checkout), the amount is auto-reversed by Razorpay to your bank within 5–7 business days. If it does not reach you, contact us with your Razorpay transaction ID and we will assist with a manual refund.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">6. Promo Codes &amp; Wallet-Applied Orders</h2>
            <p className="t-text-secondary">
              Any portion of an order paid from wallet balance is refunded back to your wallet, not to your bank account. Any portion paid via Razorpay is refunded as described in Sections 3 and 4.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">7. How to Reach Us</h2>
            <p className="t-text-secondary">
              Email: <strong>support@mytiffinpoint.com</strong><br />
              In-app: Open the Support section from your dashboard.<br />
              See our <Link to="/contact" className="text-teal-400 underline">Contact Us</Link> page for full details.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
