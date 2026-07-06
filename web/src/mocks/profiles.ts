import type { BusinessType, StoreProfile } from '@/lib/contracts/types';
import supermarket from '@/data/businessTypes/supermarket/profile.json';
import pharmacy from '@/data/businessTypes/pharmacy/profile.json';
import restaurant from '@/data/businessTypes/restaurant/profile.json';
import boutique from '@/data/businessTypes/boutique/profile.json';
import convenience from '@/data/businessTypes/convenience/profile.json';
import electronics from '@/data/businessTypes/electronics/profile.json';

// One representative StoreProfile per business type, sourced from JSON in
// `src/data/businessTypes/<type>/profile.json`. They differ across every override
// axis — locale, currency, direction, tax, hardware, feature flags and
// compliance — so the template layer produces genuinely different experiences.
// The JSON is validated against `storeProfileSchema` in src/test/mocks.test.ts.
export const MOCK_PROFILES: Record<BusinessType, StoreProfile> = {
  supermarket: supermarket as StoreProfile,
  pharmacy: pharmacy as StoreProfile,
  restaurant: restaurant as StoreProfile,
  boutique: boutique as StoreProfile,
  convenience: convenience as StoreProfile,
  electronics: electronics as StoreProfile,
};

export const MOCK_PROFILE_LIST: StoreProfile[] = Object.values(MOCK_PROFILES);
