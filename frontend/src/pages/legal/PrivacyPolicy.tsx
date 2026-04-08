import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-12 animate-glass">
        <header className="space-y-4">
          <Link to="/" className="btn-ghost !text-[10px] w-fit">← Back to Home</Link>
          <h1 className="text-h1 !text-4xl">Privacy Policy</h1>
          <p className="text-body-sm opacity-50">Last Updated: April 2026</p>
        </header>

        <section className="glass p-8 md:p-12 space-y-8 leading-relaxed">
          <div className="space-y-3">
            <p className="t-text-secondary">
              This Privacy Policy explains how M/S TiffinPoint Services ("TiffinPoint", "we", "us", "our") collects, uses, shares, and protects information about you when you use our website <strong>mytiffinpoint.com</strong> and the meal subscription services offered through it.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">1. Information We Collect</h2>
            <p className="t-text-secondary">We collect the following categories of information:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2 t-text-secondary">
              <li><strong>Account information:</strong> name, email address, phone number, and profile photo (via Google Sign-In).</li>
              <li><strong>Delivery information:</strong> delivery addresses, person names, dietary preferences.</li>
              <li><strong>Payment information:</strong> processed entirely by Razorpay. We store only the Razorpay order ID, payment ID, and status. We never see or store your full card number, UPI PIN, CVV, or bank credentials.</li>
              <li><strong>Usage information:</strong> pages viewed, actions taken (skip, subscribe, support messages), device/browser type, IP address.</li>
              <li><strong>Support information:</strong> messages you send to our support team.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">2. How We Use Your Information</h2>
            <ul className="list-disc ml-6 mt-2 space-y-2 t-text-secondary">
              <li>To provide meal subscription services, process orders, and deliver meals.</li>
              <li>To process payments and issue receipts.</li>
              <li>To send transactional notifications (order confirmations, delivery updates, refund credits, plan expiry reminders).</li>
              <li>To respond to support queries and complaints.</li>
              <li>To improve our services, prevent fraud, and comply with legal obligations.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">3. Sharing of Information</h2>
            <p className="t-text-secondary">
              We do not sell your personal information. We share information only with:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2 t-text-secondary">
              <li><strong>Razorpay</strong> — our payment gateway, for processing payments and refunds.</li>
              <li><strong>Google</strong> — for sign-in authentication.</li>
              <li><strong>Delivery partners</strong> — name, phone, and address needed to deliver your meals.</li>
              <li><strong>Hosting and infrastructure providers</strong> — Render (application hosting), Neon (database), Cloudinary (images), for the sole purpose of operating the service.</li>
              <li><strong>Law enforcement or courts</strong> — when legally required.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">4. Data Retention</h2>
            <p className="t-text-secondary">
              We retain your account information for as long as your account is active. Order, payment, and invoice records are retained for 8 years, as required under Indian tax and accounting laws. You may request deletion of your account at any time by writing to <strong>support@mytiffinpoint.com</strong>; we will delete personal data except records we are legally required to keep.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">5. Your Rights</h2>
            <p className="t-text-secondary">
              Under the Digital Personal Data Protection Act, 2023, you have the right to access, correct, or request deletion of your personal data, and to withdraw consent. To exercise these rights, email <strong>support@mytiffinpoint.com</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">6. Security</h2>
            <p className="t-text-secondary">
              We use HTTPS/TLS encryption for all data in transit, bcrypt for password hashing, and signed JWT tokens for sessions. Payment data is handled by Razorpay, a PCI-DSS Level 1 certified provider. While we take reasonable measures, no system is 100% secure; we cannot guarantee absolute security.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">7. Cookies</h2>
            <p className="t-text-secondary">
              We use essential cookies and localStorage to keep you signed in and remember your preferences (theme, language). We do not use advertising or third-party tracking cookies.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">8. Children</h2>
            <p className="t-text-secondary">
              Our services are not directed to children under 18. We do not knowingly collect personal information from children.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">9. Changes to This Policy</h2>
            <p className="t-text-secondary">
              We may update this Privacy Policy from time to time. The "Last Updated" date at the top will reflect the latest revision. Material changes will be notified via email or in-app notification.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">10. Grievance Officer</h2>
            <p className="t-text-secondary">
              For any complaints or concerns about your personal data, please contact our Grievance Officer:<br />
              <strong>Name:</strong> Sandeep Kumar<br />
              <strong>Email:</strong> support@mytiffinpoint.com<br />
              <strong>Address:</strong> M/S TiffinPoint Services, Delhi NCR, India
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
