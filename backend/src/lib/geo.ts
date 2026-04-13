import { db } from '../config/db';

/**
 * Checks if a given address is within the active delivery zones.
 * geo_check_enabled must be explicitly true (set in admin settings) for any blocking to occur.
 * When disabled (default), all addresses are accepted.
 *
 * When enabled:
 *  - Extracts a 6-digit pincode from the address string
 *  - Checks if that pincode belongs to any active zone in the `areas` table
 *  - If no zones have pincodes configured, all addresses pass through
 */
export async function isPincodeServiceable(address: string): Promise<{ is_serviceable: boolean; message?: string }> {
  const settings = await db('app_settings').where({ id: 1 }).first();

  // If geo check is not explicitly enabled by admin, accept all addresses
  if (!settings?.geo_check_enabled) return { is_serviceable: true };

  const match = address.match(/\b\d{6}\b/);
  if (!match) {
    return {
      is_serviceable: false,
      message: 'Please include your 6-digit pincode in the address so we can confirm delivery coverage.',
    };
  }

  const pincode = match[0];

  // Collect all pincodes from active zones
  const activeAreas = await db('areas').where({ is_active: true });
  const allowed = activeAreas
    .flatMap((a: any) => (a.pincodes ?? '').split(','))
    .map((p: string) => p.trim())
    .filter(Boolean);

  // If no zones have pincodes configured, allow all
  if (allowed.length === 0) return { is_serviceable: true };

  if (allowed.includes(pincode)) return { is_serviceable: true };

  return {
    is_serviceable: false,
    message: `Sorry, we don't deliver to pincode ${pincode} yet. Check our active delivery zones.`,
  };
}
