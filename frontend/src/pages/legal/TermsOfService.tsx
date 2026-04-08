import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-12 animate-glass">
        <header className="space-y-4">
          <Link to="/login" className="btn-ghost !text-[10px] w-fit">← Back to Login</Link>
          <h1 className="text-h1 !text-4xl">Terms of Service</h1>
          <p className="text-body-sm opacity-50">Last Updated: April 2026</p>
        </header>

        <section className="glass p-8 md:p-12 space-y-8 leading-relaxed">
          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">1. Acceptance of Terms</h2>
            <p className="t-text-secondary">
              By accessing and using TiffinBox, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our services.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">2. Subscription Services</h2>
            <p className="t-text-secondary">
              TiffinBox provides meal subscription plans. Subscriptions auto-renew until cancelled or paused within the allowed cutoff times (usually 10 PM the night before delivery).
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">3. Payments and Billing</h2>
            <p className="t-text-secondary">
              All payments are processed through Razorpay. You agree to provide current, complete, and accurate purchase and account information for all purchases made via TiffinBox.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">4. Delivery and Cancellations</h2>
            <p className="t-text-secondary">
              We strive to deliver meals within the specified time windows. If we miss a delivery due to our fault, the cost will be credited to your internal TiffinBox wallet. Users can "Skip" meals up to the cutoff time for a full wallet credit.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">5. User Conduct</h2>
            <p className="t-text-secondary">
              You agree not to misuse the service or help anyone else do so. You are responsible for maintaining the confidentiality of your account information.
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
