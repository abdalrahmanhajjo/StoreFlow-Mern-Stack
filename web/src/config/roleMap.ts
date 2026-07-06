import type { Role } from '@/store/session';
import type { StoreRole } from '@/lib/contracts/types';

// Bridge between the platform auth role (server-issued, authoritative) and the
// store-facing UX role that drives template navigation/density. This mapping is
// presentation-only: it decides what to *show*, never what the user may *do* —
// the server authorises every action regardless of this value.
const AUTH_TO_STORE: Record<Role, StoreRole> = {
  platform_admin: 'admin',
  owner: 'admin',
  manager: 'manager',
  cashier: 'cashier',
};

export function authRoleToStoreRole(role: Role): StoreRole {
  return AUTH_TO_STORE[role];
}
