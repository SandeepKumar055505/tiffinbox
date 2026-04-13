/**
 * Centralized contact information for TiffinBox.
 * Use these constants everywhere to ensure data consistency.
 */

export const BUSINESS_NAME = 'TiffinPoint Services';
export const BUSINESS_PHONE = '+91-8901221068';
export const BUSINESS_EMAIL = 'info@mypinnakle.com';

export const WHATSAPP_NUMBER = '918901221068'; // Raw number without symbols for wa.me
export const WHATSAPP_MESSAGE = 'Hi TiffinBox! I need help with my subscription.';

export const BUSINESS_STREET = 'F-102, Sector 48';
export const BUSINESS_LOCALITY = 'Sector 48, Gurugram';
export const BUSINESS_CITY = 'Gurugram';
export const BUSINESS_STATE = 'Haryana';
export const BUSINESS_PINCODE = '122018';
export const BUSINESS_COUNTRY = 'India';
export const BUSINESS_HOURS = 'Mon – Sat, 9:00 AM – 9:00 PM IST';

/**
 * Generates a clean WhatsApp URL with a pre-filled message.
 */
export const getWhatsAppUrl = (message = WHATSAPP_MESSAGE) => {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};
