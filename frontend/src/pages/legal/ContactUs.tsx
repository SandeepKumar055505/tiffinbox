import React from 'react';
import { Link } from 'react-router-dom';

// TODO_USER: replace the placeholders below with real phone number and exact address
// before submitting the site for Razorpay KYC review.
const BUSINESS_PHONE = '+91-8901221068';
const BUSINESS_ADDRESS_LINE1 = 'TiffinPoint Services';
const BUSINESS_ADDRESS_LINE2 = 'Gurugram, Haryana, India';
const BUSINESS_HOURS = 'Mon – Sat, 9:00 AM – 9:00 PM IST';

export default function ContactUs() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-12 animate-glass">
        <header className="space-y-4">
          <Link to="/" className="btn-ghost !text-[10px] w-fit">← Back to Home</Link>
          <h1 className="text-h1 !text-4xl">Contact Us</h1>
          <p className="text-body-sm opacity-50">We are here to help. Reach us any time.</p>
        </header>

        <section className="glass p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 leading-relaxed">
          <div className="space-y-6">
            <h2 className="text-h2 !text-2xl">Get in Touch</h2>
            <div className="space-y-4 text-body-sm t-text-secondary">
              <div className="space-y-1">
                <p className="font-bold text-teal-400 uppercase tracking-widest text-[10px]">Email</p>
                <a href="mailto:info@mypinnakle.com" className="hover:text-teal-400">info@mypinnakle.com</a>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-teal-400 uppercase tracking-widest text-[10px]">Phone</p>
                <a href={`tel:${BUSINESS_PHONE.replace(/[^+\d]/g, '')}`} className="hover:text-teal-400">{BUSINESS_PHONE}</a>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-teal-400 uppercase tracking-widest text-[10px]">Business Hours</p>
                <p>{BUSINESS_HOURS}</p>
              </div>
              <div className="space-y-1 pt-4">
                <p className="font-bold text-teal-400 uppercase tracking-widest text-[10px]">In-App Support</p>
                <p>Open the Support tab from your dashboard to raise a ticket. Our team responds within 24 hours.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-h2 !text-2xl">Registered Address</h2>
            <div className="space-y-2 text-body-sm t-text-secondary">
              <p className="font-bold">{BUSINESS_ADDRESS_LINE1}</p>
              <p>{BUSINESS_ADDRESS_LINE2}</p>
            </div>

            <div className="pt-4 space-y-2">
              <h3 className="font-bold text-teal-400 uppercase tracking-widest text-[10px]">Grievance Officer</h3>
              <div className="text-body-sm t-text-secondary">
                <p>Sandeep Kumar</p>
                <p><a href="mailto:info@mypinnakle.com" className="hover:text-teal-400">info@mypinnakle.com</a></p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass p-8 md:p-12 space-y-4 leading-relaxed">
          <h2 className="text-h2 !text-2xl">Useful Links</h2>
          <ul className="list-disc ml-6 space-y-1 t-text-secondary text-body-sm">
            <li><Link to="/privacy" className="hover:text-teal-400">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-teal-400">Terms of Service</Link></li>
            <li><Link to="/refund" className="hover:text-teal-400">Refund &amp; Cancellation Policy</Link></li>
            <li><Link to="/shipping" className="hover:text-teal-400">Shipping &amp; Delivery Policy</Link></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
