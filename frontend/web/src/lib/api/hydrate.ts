/**
 * Fills the workspace stores from the API once a store-staff session exists,
 * replacing the demo seed data. Each resource loads independently — one
 * failing endpoint (e.g. /users is owner-only) must not blank the rest.
 *
 * Import this module once (SessionBootstrap does) — the session subscription
 * at the bottom does the rest, covering login, silent refresh, and logout.
 */
import { useSession } from '@/store/session';
import { useProducts } from '@/features/products/productsStore';
import { useCategories } from '@/features/categories/categoriesStore';
import { useCustomers } from '@/features/customers/customersStore';
import { useSupply } from '@/features/suppliers/supplyStore';
import { useSales } from '@/features/sales/salesStore';
import { useInventory } from '@/features/inventory/inventoryStore';
import { useEmployees } from '@/features/employees/employeesStore';
import { useTenants, useApprovals, usePlatformUsers } from '@/features/admin/adminStore';
import { useSecurity, useAudit } from '@/features/admin/securityStore';
import {
  isConnected,
  apiListProducts,
  apiListCategories,
  apiListCustomers,
  apiListSuppliers,
  apiListPurchaseOrders,
  apiListSales,
  apiListAdjustments,
  apiListEmployees,
  apiListStoresRaw,
  tenantFromStore,
  applicationFromStore,
  apiListPlatformUsers,
  apiListLoginAttempts,
  apiListSessions,
  apiListAuditLogs,
} from './resources';

async function load(name: string, task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (err) {
    // Leave whatever the store currently holds; surface for diagnosis only.
    console.warn(`[hydrate] ${name} failed`, err);
  }
}

export async function refreshProducts() {
  useProducts.getState().hydrate(await apiListProducts());
}

export async function refreshCategories() {
  useCategories.getState().hydrate(await apiListCategories());
}

export async function refreshCustomers() {
  useCustomers.getState().hydrate(await apiListCustomers());
}

export async function refreshSuppliers() {
  useSupply.getState().hydrateSuppliers(await apiListSuppliers());
}

export async function refreshPurchaseOrders() {
  useSupply.getState().hydratePurchaseOrders(await apiListPurchaseOrders());
}

export async function refreshSales() {
  useSales.getState().hydrate(await apiListSales());
}

export async function refreshAdjustments() {
  useInventory.getState().hydrate(await apiListAdjustments());
}

export async function refreshEmployees() {
  useEmployees.getState().hydrate(await apiListEmployees());
}

/** Stores + users together: tenants list needs per-store user counts, users
 * list needs store names, approvals are the pending stores. */
export async function refreshAdminStores() {
  const stores = await apiListStoresRaw();
  const storeNames = new Map(stores.map((s) => [s.id, s.name]));
  const users = await apiListPlatformUsers(storeNames);

  const countByStore = new Map<string, number>();
  for (const u of users) {
    if (u.store !== '—') countByStore.set(u.store, (countByStore.get(u.store) ?? 0) + 1);
  }

  useTenants.getState().hydrate(
    stores.filter((s) => s.status !== 'pending').map((s) => tenantFromStore(s, countByStore.get(s.name) ?? 0))
  );
  useApprovals.getState().hydrate(stores.filter((s) => s.status === 'pending').map(applicationFromStore));
  usePlatformUsers.getState().hydrate(users);
}

export async function refreshSecurity() {
  const [attempts, sessions] = await Promise.all([apiListLoginAttempts(), apiListSessions()]);
  useSecurity.getState().hydrate({ attempts, sessions });
}

export async function refreshAudit() {
  useAudit.getState().hydrate(await apiListAuditLogs());
}

let hydratedForUser: string | null = null;

/** Pull every workspace resource. Safe to call repeatedly. */
export async function hydrateWorkspace(): Promise<void> {
  const user = useSession.getState().user;
  if (!isConnected || !user) return;

  // Platform admins get the platform view; store staff get their workspace.
  if (user.role === 'platform_admin') {
    await Promise.all([
      load('admin-stores', refreshAdminStores),
      load('security', refreshSecurity),
      load('audit', refreshAudit),
    ]);
    return;
  }

  if (!user.storeId) return;

  const jobs = [
    load('products', refreshProducts),
    load('categories', refreshCategories),
    load('customers', refreshCustomers),
    load('suppliers', refreshSuppliers),
    load('purchase-orders', refreshPurchaseOrders),
    load('sales', refreshSales),
    load('adjustments', refreshAdjustments),
  ];
  // Staff listing is owner-scoped on the server.
  if (user.role === 'owner') jobs.push(load('employees', refreshEmployees));

  await Promise.all(jobs);
}

if (isConnected) {
  useSession.subscribe((state) => {
    const key = state.status === 'authenticated' && state.user ? state.user.id : null;
    if (key && key !== hydratedForUser) {
      hydratedForUser = key;
      void hydrateWorkspace();
    }
    if (!key && state.status === 'unauthenticated') {
      hydratedForUser = null;
      // Next sign-in may be a different store — drop the cached identity.
      void import('./storeIdentity').then((m) => m.useStoreIdentity.getState().clear());
    }
  });
}
