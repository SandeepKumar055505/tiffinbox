import React from 'react';
import { Link } from 'react-router-dom';

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-12 animate-glass">
        <header className="space-y-4">
          <Link to="/" className="btn-ghost !text-[10px] w-fit">← Back to Home</Link>
          <h1 className="text-h1 !text-4xl">Shipping &amp; Delivery Policy</h1>
          <p className="text-body-sm opacity-50">Last Updated: April 2026</p>
        </header>

        <section className="glass p-8 md:p-12 space-y-8 leading-relaxed">
          <div className="space-y-3">
            <p className="t-text-secondary">
              TiffinPoint (TiffinPoint Services) delivers freshly prepared tiffin meals to customers in Delhi NCR. This policy explains how, when, and where we deliver.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">1. Service Area</h2>
            <p className="t-text-secondary">
              We currently deliver within Delhi NCR (Delhi, Noida, Gurugram, Ghaziabad, and Faridabad). During checkout, your delivery address is checked against our serviceable pincodes. If your pincode is not supported, the order cannot be placed. To request expansion to your area, email <strong>info@mypinnakle.com</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">2. Delivery Windows</h2>
            <p className="t-text-secondary">Meals are delivered within the following windows:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2 t-text-secondary">
              <li><strong>Breakfast:</strong> 7:30 AM – 9:30 AM</li>
              <li><strong>Lunch:</strong> 11:30 AM – 1:30 PM</li>
              <li><strong>Dinner:</strong> 7:00 PM – 9:00 PM</li>
            </ul>
            <p className="t-text-secondary">
              Subscriptions start on the date selected at checkout. The meal grid on your dashboard shows the exact dates and dishes for every meal in your plan.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">3. Delivery Charges</h2>
            <p className="t-text-secondary">
              Delivery within our standard service area is <strong>free</strong> and already included in your subscription price. There are no hidden charges at checkout. Additional fees, if any, will be clearly shown before you confirm payment.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">4. Order Tracking &amp; Confirmation</h2>
            <p className="t-text-secondary">
              You receive an in-app and email confirmation once your subscription is activated. For each delivery, you can see the status (preparing, out for delivery, delivered) live on your dashboard. We notify you via in-app notification when your meal is marked delivered.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">5. Delayed or Missed Deliveries</h2>
            <p className="t-text-secondary">
              We strive for on-time delivery but delays may occur due to weather, traffic, or other unforeseen events. If we miss a delivery or deliver materially late, the meal's full value is credited to your TiffinPoint Wallet automatically. See our <Link to="/refund" className="text-teal-400 underline">Refund Policy</Link> for details.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">6. Skip Cutoffs</h2>
            <p className="t-text-secondary">
              If you will not be home for a meal, skip it before the cutoff to get wallet credit: Breakfast by 12:00 PM the previous day, Lunch by 10:00 AM the same day, Dinner by 6:00 PM the same day.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2 !text-2xl">7. Contact</h2>
            <p className="t-text-secondary">
              Delivery questions? Email <strong>info@mypinnakle.com</strong> or open Support from your dashboard.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
