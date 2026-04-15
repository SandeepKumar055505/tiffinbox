/**
 * Gourmet Error Translator
 * Maps technical friction into premium sensory narratives.
 * Best in World standard for elite UI/UX.
 */

const GOURMET_DICTIONARY: Record<string, { title: string; message: string }> = {
  // ── Operational Boundaries (Project Diamond) ─────────────────────────────
  'ERR_CAPACITY_FULL': {
    title: 'Highly Coveted',
    message: 'Our boutique selection for this date has been fully reserved by our elite community. We suggest exploring another starting sequence.'
  },
  'ERR_CUTOFF_EXCEEDED': {
    title: 'Chef’s Deadline',
    message: 'Preparation for the upcoming service has already commenced. Our chefs require this window to ensure every ingredient is perfect.'
  },
  'ERR_OVERLAP_SHIELD': {
    title: 'Active Lifecycle',
    message: 'A health journey is already in orbit for this person during the selected dates. Only one gourmet lifecycle can be active at a time.'
  },
  'ERR_GEOFENCE_OUT': {
    title: 'Logistical Orbit',
    message: 'Our current delivery fleet is operating just outside your sphere. We are expanding our reach daily to bring gourmet health to your doorstep.'
  },
  'ERR_LOYALTY_WALL': {
    title: 'Evolution Required',
    message: 'Our 30-day elite tier is reserved for those who have completed their first 7-day or 14-day genesis. Your next plan will unlock this horizon.'
  },
  'ERR_PROMO_EXHAUSTED': {
    title: 'Legendary Code',
    message: 'This specific invitation has reached its usage limit. Stay tuned to our seasonal broadcasts for new culinary offers.'
  },
  'ERR_ADDRESS_MISSING': {
    title: 'Vault Sync',
    message: 'We couldn’t locate your delivery anchor. Please ensure a valid location is set in your profile vault.'
  },
  'ERR_PAUSE_DISABLED': {
    title: 'Temporal Lock',
    message: 'Admins have temporarily synchronized our kitchen rhythms. Pausing is currently restricted to ensure perfect artisanal performance.'
  },
  'ERR_MANIFEST_COLLISION': {
    title: 'Coordinate Overlap',
    message: 'You already have a culinary journey manifested for this specific date and slot. Please choose another temporal coordinates.'
  },
  'ERR_MANIFEST_PAST_DATE': {
    title: 'Temporal Anchoring',
    message: 'We cannot inaugurate future manifests into the past. Please select a journey that lies ahead.'
  },
  'ERR_MAX_GRACE_SKIPS': {
    title: 'Grace Zenith',
    message: 'Your grace threshold for this cycle has reached its peak. Our chefs have already secured the ingredients for your upcoming week.'
  },
  'ERR_MIN_MEALS_REMAINING': {
    title: 'Nutritional Anchor',
    message: 'A minimum plan volume is required to maintain the structural integrity of your health lifecycle.'
  },
  'ERR_SWAP_TIMED_OUT': {
    title: 'Chef’s Lock',
    message: 'The prep-timers have already begun their work on this specific selection. Swapping is restricted once the culinary sequence starts.'
  },
  'ERR_VOUCHER_EXPIRED': {
    title: 'Dissolved Manifest',
    message: 'This voucher has gracefully dissolved back into the digital ether. Manifest your rewards promptly to ensure their vitality.'
  },
  'ERR_CLOUDINARY_DRIFT': {
    title: 'Atmospheric Drift',
    message: 'A temporary signal interference has slowed our proof manifestation. Rest assured, your gourmet record is secure in the vault.'
  },
  'Gourmet Route Blockage': {
    title: 'Culinary Blockage',
    message: 'Our dispatch fleet encountered an unforeseen terrestrial obstacle. Our team is rerouting to minimize temporal wait.'
  },
  'Gate-Cipher Drift': {
    title: 'Cipher Access Drift',
    message: 'Our courier was unable to verify the gate coordinates. Please ensure your access codes are synchronized in your profile.'
  },
  'Recipient Silently Absent': {
    title: 'Sovereign Absence',
    message: 'The recipient was not present at the time of arrival. Our team will contact you for a secondary manifestation.'
  },

  // ── Network & System ───────────────────────────────────────────────────
  'internal_server_error': {
    title: 'Culinary Reset',
    message: 'Our digital systems are currently being refined. Please allow us a moment to perfect the ingredients.'
  },
  'service_unavailable': {
    title: 'Moments of Perfection',
    message: 'TiffinPoint is undergoing scheduled maintenance to ensure world-class service. Check back shortly.'
  },
  'network_error': {
    title: 'Connectivity Drift',
    message: 'We are having trouble reaching our kitchen. Please check your connection to resume your journey.'
  },

  // ── Generic Fallback ─────────────────────────────────────────────────────
  'default': {
    title: 'Boutique Adjustment',
    message: 'Something wasn’t quite perfect with that action. We suggest trying again or reaching out to support.'
  }
};

let dynamicRegistry: Record<string, { title: string; message: string }> = {};

export function setDynamicNarratives(narratives: any[]) {
  const map: Record<string, { title: string; message: string }> = {};
  for (const n of narratives) {
    map[n.error_key] = { title: n.title, message: n.message };
  }
  dynamicRegistry = map;
}

export function translateToGourmet(error: any): { title: string; message: string } {
  // 1. Check for specific backend error_key in dynamic manifest
  const key = error?.response?.data?.error_key;
  if (key && dynamicRegistry[key]) return dynamicRegistry[key];

  // 2. Fallback to hardcoded GOURMET_DICTIONARY
  if (key && GOURMET_DICTIONARY[key]) return GOURMET_DICTIONARY[key];

  // 3. Fallback to older 'error' string or status codes
  const legacyError = error?.response?.data?.error;
  if (legacyError?.includes('Sold Out')) return GOURMET_DICTIONARY['ERR_CAPACITY_FULL'];
  if (legacyError?.includes('Cutoff')) return GOURMET_DICTIONARY['ERR_CUTOFF_EXCEEDED'];

  const status = error?.response?.status;
  if (status === 409) return GOURMET_DICTIONARY['ERR_CAPACITY_FULL']; // Capacity conflict
  if (status === 500) return GOURMET_DICTIONARY['internal_server_error'];
  if (status === 503) return GOURMET_DICTIONARY['service_unavailable'];
  if (error?.message === 'Network Error') return GOURMET_DICTIONARY['network_error'];

  return GOURMET_DICTIONARY['default'];
}
