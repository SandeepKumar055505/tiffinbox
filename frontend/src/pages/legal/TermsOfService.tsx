import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-12 animate-glass">
        <header className="space-y-4">
          <Link to="/" className="btn-ghost !text-[10px] w-fit">← Back to Home</Link>
          <h1 className="text-h1 !text-4xl">Terms of Service</h1>
          <p className="text-body-sm opacity-50">Last Updated: April 2026</p>
        </header>

        <section className="glass p-8 md:p-12 space-y-8 leading-relaxed">
          <div className="space-y-3">
            <p className="t-text-secondary">
              These Terms of Service ("Terms") govern your use of the website <strong>mytiffinpoint.com</strong> and the meal subscription services offered by TiffinPoint Services ("TiffinPoint", "we", "us", "our"). By creating an account or placing an order, you agree to be bound by these Terms.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">1. Eligibility</h2>
            <p className="t-text-secondary">
              You must be at least 18 years old and capable of entering into a legally binding contract under Indian law to use our services.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">2. Our Services</h2>
            <p className="t-text-secondary">
              TiffinPoint offers daily tiffin (home-cooked meal) subscription plans for delivery in Delhi NCR. Meals include Breakfast (₹100), Lunch (₹120), and Dinner (₹100). Plans available: 1 day, 1 week, 2 weeks, and (post-first plan) 30 days. Prices and discounts are displayed at the time of checkout and may be revised for new subscriptions with prior notice.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">3. Account &amp; Registration</h2>
            <p className="t-text-secondary">
              You register using Google Sign-In. You are responsible for safeguarding access to your Google account. You must provide accurate delivery information. We may suspend or terminate accounts that provide false information, abuse the service, or violate these Terms.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">4. Orders &amp; Payment</h2>
            <p className="t-text-secondary">
              All payments are processed securely through Razorpay. Accepted methods include UPI, credit/debit cards, net banking, and supported wallets. Your subscription becomes active only after successful payment confirmation. Prices are inclusive of applicable taxes unless otherwise stated. Invoices are available on request at info@mypinnakle.com.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">5. Skip, Pause &amp; Wallet</h2>
            <ul className="list-disc ml-6 mt-2 space-y-2 t-text-secondary">
              <li>You may skip individual meals before the applicable cutoff: Breakfast by 12:00 PM the previous day, Lunch by 10:00 AM the same day, Dinner by 6:00 PM the same day.</li>
              <li>Skipped meals are credited to your TiffinPoint Wallet, usable for any future subscription.</li>
              <li>You may take up to 1 full day off per week without losing the plan.</li>
              <li>Wallet balance is non-transferable and cannot be withdrawn as cash except in the circumstances described in our Refund Policy.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">6. Delivery</h2>
            <p className="t-text-secondary">
              Meals are delivered within published time windows (see our <Link to="/shipping" className="text-teal-400 underline">Shipping &amp; Delivery Policy</Link>). If we fail to deliver a meal due to our fault, the cost of that meal is automatically credited to your TiffinPoint Wallet.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">7. Refunds &amp; Cancellations</h2>
            <p className="t-text-secondary">
              Refund terms are described in our <Link to="/refund" className="text-teal-400 underline">Refund Policy</Link>, which forms part of these Terms.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">8. Acceptable Use</h2>
            <p className="t-text-secondary">
              You agree not to: (a) use the service for any unlawful purpose; (b) attempt to gain unauthorised access to any part of the service; (c) resell meals or subscriptions; (d) abuse promo codes or create multiple accounts to exploit offers; (e) interfere with the service's operation.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">9. Intellectual Property</h2>
            <p className="t-text-secondary">
              All content on mytiffinpoint.com — logos, text, images, software — is owned by TiffinPoint Services or its licensors and is protected by applicable intellectual property laws. You may not copy, modify, or distribute it without our prior written consent.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">10. Limitation of Liability</h2>
            <p className="t-text-secondary">
              To the maximum extent permitted by law, our total liability for any claim arising out of or relating to these Terms or the service shall not exceed the total amount you paid to TiffinPoint in the three (3) months preceding the claim. We are not liable for indirect, incidental, or consequential damages.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">11. Force Majeure</h2>
            <p className="t-text-secondary">
              We are not liable for delays or failures in performance caused by events beyond our reasonable control, including acts of God, natural disasters, strikes, lockdowns, pandemics, power failures, or internet outages.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">12. Governing Law &amp; Dispute Resolution</h2>
            <p className="t-text-secondary">
              These Terms are governed by the laws of India. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts at Delhi, India. Before initiating legal action, you agree to first contact us at info@mypinnakle.com in good faith to attempt resolution.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">13. Changes to These Terms</h2>
            <p className="t-text-secondary">
              We may update these Terms at any time. Continued use of the service after changes means you accept the updated Terms. Material changes will be notified via email or in-app notice.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">14. Contact</h2>
            <p className="t-text-secondary">
              Questions about these Terms? Email <strong>info@mypinnakle.com</strong> or see our <Link to="/contact" className="text-teal-400 underline">Contact Us</Link> page.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
