-- Phase Ω.6: Sovereign Narrative Manifest
-- Moves gourmet strings from code to a dynamic administrative port.

CREATE TABLE IF NOT EXISTS gourmet_narratives (
  id           SERIAL PRIMARY KEY,
  error_key    VARCHAR(100) UNIQUE NOT NULL,
  title        VARCHAR(255) NOT NULL,
  message      TEXT NOT NULL,
  category     VARCHAR(50) DEFAULT 'operational', -- operational, sensorial, system
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by   INTEGER REFERENCES admins(id)
);

-- Seed with the 'Legendary Manifest' from GourmetTranslator
INSERT INTO gourmet_narratives (error_key, title, message, category) VALUES
('ERR_CAPACITY_FULL', 'Highly Coveted', 'Our boutique selection for this date has been fully reserved by our elite community. We suggest exploring another starting sequence.', 'operational'),
('ERR_CUTOFF_EXCEEDED', 'Chef’s Deadline', 'Preparation for the upcoming service has already commenced. Our chefs require this window to ensure every ingredient is perfect.', 'operational'),
('ERR_OVERLAP_SHIELD', 'Active Lifecycle', 'A health journey is already in orbit for this person during the selected dates. Only one gourmet lifecycle can be active at a time.', 'operational'),
('ERR_GEOFENCE_OUT', 'Logistical Orbit', 'Our current delivery fleet is operating just outside your sphere. We are expanding our reach daily to bring gourmet health to your doorstep.', 'operational'),
('ERR_LOYALTY_WALL', 'Evolution Required', 'Our 30-day elite tier is reserved for those who have completed their first 7-day or 14-day genesis. Your next plan will unlock this horizon.', 'operational'),
('ERR_PROMO_EXHAUSTED', 'Legendary Code', 'This specific invitation has reached its usage limit. Stay tuned to our seasonal broadcasts for new culinary offers.', 'operational'),
('ERR_ADDRESS_MISSING', 'Vault Sync', 'We couldn’t locate your delivery anchor. Please ensure a valid location is set in your profile vault.', 'operational'),
('ERR_PAUSE_DISABLED', 'Temporal Lock', 'Admins have temporarily synchronized our kitchen rhythms. Pausing is currently restricted to ensure perfect artisanal performance.', 'operational'),
('ERR_MANIFEST_COLLISION', 'Coordinate Overlap', 'You already have a culinary journey manifested for this specific date and slot. Please choose another temporal coordinates.', 'operational'),
('ERR_MANIFEST_PAST_DATE', 'Temporal Anchoring', 'We cannot inaugurate future manifests into the past. Please select a journey that lies ahead.', 'operational'),
('ERR_MAX_GRACE_SKIPS', 'Grace Zenith', 'Your grace threshold for this cycle has reached its peak. Our chefs have already secured the ingredients for your upcoming week.', 'operational'),
('ERR_MIN_MEALS_REMAINING', 'Nutritional Anchor', 'A minimum plan volume is required to maintain the structural integrity of your health lifecycle.', 'operational'),
('ERR_SWAP_TIMED_OUT', 'Chef’s Lock', 'The prep-timers have already begun their work on this specific selection. Swapping is restricted once the culinary sequence starts.', 'operational'),
('ERR_VOUCHER_EXPIRED', 'Dissolved Manifest', 'This voucher has gracefully dissolved back into the digital ether. Manifest your rewards promptly to ensure their vitality.', 'sensorial'),
('ERR_CLOUDINARY_DRIFT', 'Atmospheric Drift', 'A temporary signal interference has slowed our proof manifestation. Rest assured, your gourmet record is secure in the vault.', 'system')
ON CONFLICT (error_key) DO UPDATE SET title = EXCLUDED.title, message = EXCLUDED.message;
