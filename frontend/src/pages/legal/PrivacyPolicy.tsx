import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-12 animate-glass">
        <header className="space-y-4">
          <Link to="/login" className="btn-ghost !text-[10px] w-fit">← Back to Login</Link>
          <h1 className="text-h1 !text-4xl">Privacy Policy</h1>
          <p className="text-body-sm opacity-50">Last Updated: April 2026</p>
        </header>

        <section className="glass p-8 md:p-12 space-y-8 leading-relaxed">
          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">1. Information We Collect</h2>
            <p className="t-text-secondary">
              We collect information you provide directly to us when you create an account, subscribe to a meal plan, or communicate with us. This includes your name, email address, phone number, delivery address, and payment information processing via Razorpay.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">2. How We Use Your Information</h2>
            <p className="t-text-secondary">
              We use the information we collect to:
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Provide, maintain, and improve our meal subscription services.</li>
                <li>Process transactions and send related information, including confirmations and receipts.</li>
                <li>Send you technical notices, updates, and support messages.</li>
                <li>Communicate with you about products, services, and events offered by TiffinBox.</li>
              </ul>
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">3. Sharing of Information</h2>
            <p className="t-text-secondary">
              We do not share your personal information with third parties except as described in this policy, such as with service providers who perform services on our behalf (e.g., payment processing, delivery partners).
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-h2 !text-2xl">4. Security</h2>
            <p className="t-text-secondary">
              We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
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
