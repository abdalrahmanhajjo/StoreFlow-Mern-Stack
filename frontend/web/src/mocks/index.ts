import type { BusinessType, ProductSummary, StoreProfile } from '@/lib/contracts/types';
import { MOCK_PROFILES } from './profiles';
import { MOCK_PRODUCTS } from './products';

export { MOCK_PROFILES, MOCK_PROFILE_LIST } from './profiles';
export { MOCK_PRODUCTS } from './products';

export interface MockStore {
  profile: StoreProfile;
  products: ProductSummary[];
}

/** Bundle a profile with its catalogue for a given business type. */
export function getMockStore(businessType: BusinessType): MockStore {
  return { profile: MOCK_PROFILES[businessType], products: MOCK_PRODUCTS[businessType] };
}
