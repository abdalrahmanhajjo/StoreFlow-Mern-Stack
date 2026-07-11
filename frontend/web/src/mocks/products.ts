import type { BusinessType, ProductSummary } from '@/lib/contracts/types';
import supermarket from '@/data/businessTypes/supermarket/products.json';
import pharmacy from '@/data/businessTypes/pharmacy/products.json';
import restaurant from '@/data/businessTypes/restaurant/products.json';
import boutique from '@/data/businessTypes/boutique/products.json';
import convenience from '@/data/businessTypes/convenience/products.json';
import electronics from '@/data/businessTypes/electronics/products.json';

// Representative catalogue per business type, sourced from JSON in
// `src/data/businessTypes/<type>/products.json`. `unit` drives weighing
// (kg/litre), `prescriptionRequired` and `ageRestricted` drive the regulated /
// age-gated workflows. Each array is validated against `productSummarySchema`
// in src/test/mocks.test.ts.
export const MOCK_PRODUCTS: Record<BusinessType, ProductSummary[]> = {
  supermarket: supermarket as ProductSummary[],
  pharmacy: pharmacy as ProductSummary[],
  restaurant: restaurant as ProductSummary[],
  boutique: boutique as ProductSummary[],
  convenience: convenience as ProductSummary[],
  electronics: electronics as ProductSummary[],
};
