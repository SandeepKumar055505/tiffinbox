import React from 'react';
import { Link } from 'react-router-dom';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-12 animate-glass">
        <header className="space-y-4">
          <Link to="/login" className="btn-ghost !text-[10px] w-fit">← Back to Login</Link>
          <h1 className="text-h1 !text-4xl">Refund Policy</h1>
          <p className="text-body-sm opacity-50">Last Updated: April 2026</p>
        </header>

        <section className="glass p-8 md:p-12 space-y-8 leading-relaxed">
          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">1. Skip Credits</h2>
            <p className="t-text-secondary">
              If you skip a meal before the cutoff time (10 PM the night before delivery), the meal cost is automatically credited to your TiffinBox Wallet. This credit can be used for future subscriptions but is not directly refundable to your bank account.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">2. Missing or Damaged Meals</h2>
            <p className="t-text-secondary">
              If a meal is missing, incomplete, or damaged, please contact support within 4 hours of the delivery window. If verified, we will issue a full credit for that meal to your TiffinBox Wallet.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">3. Subscription Cancellations</h2>
            <p className="t-text-secondary">
              If you wish to cancel an active subscription entirely, we will calculate the remaining value of the unconsumed meals. A refund of the remaining balance (minus any applied discounts) will be made to your TiffinBox Wallet. 
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">4. Bank Refunds</h2>
            <p className="t-text-secondary">
              Direct refunds to your bank account/original payment method are only processed in exceptional circumstances (e.g., permanent service discontinuation in your area). In such cases, processing may take 5-7 business days via Razorpay.
            </p>
          </div>

          <div className="space-y-4 pt-8 border-t border-border/10">
            <p className="text-body-sm italic opacity-50 text-center">
              This is a template policy for TiffinBox. Please consult legal counsel to ensure compliance with local regulations.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
