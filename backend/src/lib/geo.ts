import { db } from '../config/db';

/**
 * Checks if a given pincode is within the serviceable zones defined in app_settings.
 * If no pincodes are defined, assumes the service is open to all zones.
 */
export async function isPincodeServiceable(address: string): Promise<{ is_serviceable: boolean; message?: string }> {
  const match = address.match(/\b\d{6}\b/);
  if (!match) return { is_serviceable: false, message: 'Invalid address: 6-digit Pincode not found.' };

  const pincode = match[0];
  const settings = await db('app_settings').where({ id: 1 }).first();
  
  if (!settings?.serviceable_pincodes) return { is_serviceable: true };

  const allowed = settings.serviceable_pincodes.split(',').map((p: string) => p.trim());
  
  if (allowed.length === 0 || allowed.includes(pincode)) {
    return { is_serviceable: true };
  }

  return { 
    is_serviceable: false, 
    message: `Sorry, we do not currently deliver to pincode ${pincode}.` 
  };
}
