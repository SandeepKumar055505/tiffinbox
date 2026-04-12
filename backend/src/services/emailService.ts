import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Gracefully skip email if Gmail not configured
const enabled = !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);

const transporter = enabled
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    })
  : null;

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    if (env.isDev) console.log(`[email skipped — no GMAIL config] To: ${to} | ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: `TiffinBox <${env.GMAIL_USER}>`, to, subject, html });
  } catch (err) {
    console.error('[email error]', err);
  }
}

function wrap(body: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#0d9488;padding:20px 24px">
        <h1 style="margin:0;font-size:20px;color:#fff">🍱 TiffinBox</h1>
      </div>
      <div style="padding:24px">
        ${body}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #1e293b;font-size:12px;color:#475569;text-align:center">
        TiffinBox · Fresh meals, delivered daily
      </div>
    </div>`;
}

// ── Transactional emails ──────────────────────────────────────────────────────

export async function sendPaymentReceipt(opts: {
  to: string;
  name: string;
  plan_days: number;
  start_date: string;
  end_date: string;
  amount: number;
  person_name: string;
}): Promise<void> {
  const html = wrap(`
    <h2 style="color:#5eead4;margin-top:0">Payment confirmed ✅</h2>
    <p>Hi ${opts.name},</p>
    <p>Your <strong>${opts.plan_days}-day meal plan</strong> for <strong>${opts.person_name}</strong> is now active.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#94a3b8">Plan</td><td style="padding:6px 0;text-align:right">${opts.plan_days} days</td></tr>
      <tr><td style="padding:6px 0;color:#94a3b8">Dates</td><td style="padding:6px 0;text-align:right">${opts.start_date} → ${opts.end_date}</td></tr>
      <tr style="border-top:1px solid #1e293b"><td style="padding:8px 0;font-weight:bold">Amount paid</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#5eead4">₹${opts.amount}</td></tr>
    </table>
    <p style="color:#94a3b8;font-size:14px">Your meals are scheduled. We'll deliver fresh every day!</p>
  `);
  await send(opts.to, `Receipt: ₹${opts.amount} — ${opts.plan_days}-day plan confirmed`, html);
}

export async function sendDeliveryFailureNotice(opts: {
  to: string;
  name: string;
  meal_type: string;
  date: string;
  credited_amount: number;
}): Promise<void> {
  const html = wrap(`
    <h2 style="color:#fb923c;margin-top:0">Delivery missed 😔</h2>
    <p>Hi ${opts.name},</p>
    <p>We're sorry — your <strong>${opts.meal_type}</strong> delivery on <strong>${opts.date}</strong> could not be completed.</p>
    <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#5eead4">₹${opts.credited_amount} has been credited to your TiffinBox wallet.</p>
      <p style="margin:8px 0 0;font-size:13px;color:#64748b">It will be automatically applied at your next checkout.</p>
    </div>
    <p style="color:#94a3b8;font-size:14px">We apologize for the inconvenience.</p>
  `);
  await send(opts.to, `Wallet credited ₹${opts.credited_amount} — missed ${opts.meal_type}`, html);
}

export async function sendPlanExpiryReminder(opts: {
  to: string;
  name: string;
  end_date: string;
  plan_days: number;
}): Promise<void> {
  const html = wrap(`
    <h2 style="color:#fbbf24;margin-top:0">Your plan ends soon ⏰</h2>
    <p>Hi ${opts.name},</p>
    <p>Your <strong>${opts.plan_days}-day meal plan</strong> expires on <strong>${opts.end_date}</strong>.</p>
    <p>Renew now to keep your meals coming without a gap.</p>
    <a href="${env.FRONTEND_URL}/subscribe"
       style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">
      Renew my plan →
    </a>
  `);
  await send(opts.to, `Your TiffinBox plan ends on ${opts.end_date} — renew now`, html);
}

export async function sendStreakMilestone(opts: {
  to: string;
  name: string;
  streak_days: number;
  wallet_amount?: number;
}): Promise<void> {
  const rewardLine = opts.wallet_amount
    ? `<p style="color:#5eead4">₹${opts.wallet_amount} has been added to your wallet as a reward!</p>`
    : '';
  const html = wrap(`
    <h2 style="color:#fb923c;margin-top:0">${opts.streak_days}-day streak! 🔥</h2>
    <p>Hi ${opts.name},</p>
    <p>Amazing! You've maintained a <strong>${opts.streak_days}-day delivery streak</strong>. Keep it up!</p>
    ${rewardLine}
    <a href="${env.FRONTEND_URL}/wallet"
       style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">
      View wallet →
    </a>
  `);
  await send(opts.to, `🔥 ${opts.streak_days}-day streak reward!`, html);
}

export async function sendSupportReplyEmail(opts: {
  to: string;
  name: string;
  subject: string;
  message: string;
}): Promise<void> {
  const html = wrap(`
    <h2 style="color:#0d9488;margin-top:0">New support reply 💬</h2>
    <p>Hi ${opts.name},</p>
    <p>An administrator has replied to your ticket: <strong>"${opts.subject}"</strong></p>
    <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0;font-style:italic;color:#cbd5e1">
      "${opts.message.length > 200 ? opts.message.substring(0, 200) + '...' : opts.message}"
    </div>
    <a href="${env.FRONTEND_URL}/support"
       style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">
      View full conversation →
    </a>
  `);
  await send(opts.to, `Support Reply: ${opts.subject}`, html);
}

export async function sendVerificationOtpEmail(opts: {
  to: string;
  name: string;
  otp: string;
}): Promise<void> {
  const html = wrap(`
    <h2 style="color:#2dd4bf;margin-top:0">Verify your phone 📱</h2>
    <p>Hi ${opts.name},</p>
    <p>Use the following code to verify your mobile number on TiffinBox:</p>
    <div style="background:#1e293b;border-radius:12px;padding:24px;margin:24px 0;text-align:center">
      <span style="font-size:32px;font-weight:900;letter-spacing:8px;color:#2dd4bf">${opts.otp}</span>
    </div>
    <p style="color:#94a3b8;font-size:12px">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
  `);
  await send(opts.to, `${opts.otp} is your TiffinBox verification code`, html);
}
