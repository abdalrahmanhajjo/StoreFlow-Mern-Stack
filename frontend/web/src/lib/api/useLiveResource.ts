import { useEffect } from 'react';
import { isConnected } from './resources';
import {
  refreshProducts,
  refreshCategories,
  refreshCustomers,
  refreshSuppliers,
  refreshPurchaseOrders,
  refreshSales,
  refreshAdjustments,
  refreshEmployees,
} from './hydrate';

/** Workspace resources an owner page can keep live. */
export type LiveResource =
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'sales'
  | 'inventory'
  | 'employees';

const REFRESHERS: Record<LiveResource, Array<() => Promise<void>>> = {
  // Products render category names, so both stay in sync.
  products: [refreshProducts, refreshCategories],
  customers: [refreshCustomers],
  suppliers: [refreshSuppliers, refreshPurchaseOrders],
  sales: [refreshSales, refreshProducts],
  inventory: [refreshAdjustments, refreshProducts],
  employees: [refreshEmployees],
};

/** Don't hammer the API when the user tabs back and forth. */
const MIN_REFRESH_INTERVAL_MS = 15_000;
const lastRefreshAt: Partial<Record<LiveResource, number>> = {};

async function refresh(resource: LiveResource, force = false): Promise<void> {
  if (!isConnected) return;
  const now = Date.now();
  if (!force && now - (lastRefreshAt[resource] ?? 0) < MIN_REFRESH_INTERVAL_MS) return;
  lastRefreshAt[resource] = now;
  // Each refresher already swallows its own errors upstream (hydrate keeps
  // the last good data and logs), so a failing endpoint never blanks a page.
  await Promise.allSettled(REFRESHERS[resource].map((fn) => fn()));
}

/**
 * Keeps a workspace resource in sync with the database while a page using it
 * is open: refetches when the page mounts and whenever the window regains
 * focus (throttled). The page keeps rendering the last good data during
 * refreshes, so there is no flicker and no loading gate.
 */
export function useLiveResource(...resources: LiveResource[]): void {
  // Stable dependency: the spread array gets a new identity every render,
  // but the set of resources a page watches never changes at runtime.
  const key = resources.join(',');
  useEffect(() => {
    const list = key.split(',') as LiveResource[];
    list.forEach((r) => void refresh(r, true));

    const onFocus = () => list.forEach((r) => void refresh(r));
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [key]);
}
