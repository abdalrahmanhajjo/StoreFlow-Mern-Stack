# OWNER PANEL — COMPLETE FUNCTIONAL SPECIFICATION

**Product:** StoreFlow (multi-tenant retail POS SaaS)
**Scope:** Every owner/admin-reachable screen, component, control, state, and data path in the web app (`frontend/web`).
**Method:** Full source read of the React app (router, shell, all owner feature pages, shared UI primitives, Zustand stores, API resource layer) cross-referenced with the live backend behaviour verified in the Phase-1 audit.
**Audience:** Developers, QA testers, product managers.
**Status legend:** ✅ PASS · ⚠️ NEEDS IMPROVEMENT · ❌ FAIL

---

## 0. Architecture that governs all behaviour (read first)

Three facts change how *every* element on every page behaves. They are stated once here and referenced throughout.

### 0.1 Local-first optimistic stores mirrored to the API
Each feature has a Zustand store (`productsStore`, `customersStore`, `categoriesStore`, `supplyStore`, `salesStore`, `inventoryStore`, `employeesStore`). **The store is the source of truth the UI renders.** `isConnected` is `true` when `VITE_API_BASE_URL` is set (it is: `http://localhost:5050/api`). In connected mode:

- **Create** inserts a local row immediately with a temp id (`p101`…), then POSTs; on success the temp row is swapped for the server row (real ObjectId); **on failure the local row is rolled back and a toast fires** (`productsStore.create`).
- **Update / Delete** mutate local state immediately, then fire the API call **fire-and-forget**. **On failure only a toast fires — there is NO rollback.** The UI keeps showing the changed/deleted value while the server still has the old one. → silent client/server divergence (see BUG-U3).
- Reads hydrate once from the API on login (`lib/api/hydrate.ts`), then the UI works off local state until refresh.

**QA consequence:** "success" toasts and instant UI updates do **not** prove the server accepted a write for update/delete flows. Every edit/delete test must verify the server, not the toast.

### 0.2 Dashboard, Reports, and Sales are computed from the local store, not the server's report APIs
`DashboardPage`, `ReportsPage`, and `SalesPage` sum the `useSales`/`useProducts` stores in-browser. They never call `/reports/*` or `/dashboard`. So "Revenue (MTD)" is really *the sum of all sales currently loaded in the store*, not a month-to-date server figure. KPIs reflect session/hydrated data only.

### 0.3 Role gating is enforced at three layers, consistently
`navConfig.ts` (which nav items render) + `router.tsx` `RequireRole` (route access → redirect to `/403`) + `rbac.ts` `can()` (per-action button visibility). Owner sees all 13 store pages; manager sees all except Employees & Settings; cashier sees only POS, Sales, Customers. These match the backend middleware — **except** the read-authorization gaps noted in Phase 1 (cashier can still GET `/reports` & `/dashboard` at the API even though the UI hides them).

---

## 1. Complete Screen Inventory

| # | Screen | Route | Owner | Manager | Cashier | File |
|---|--------|-------|:---:|:---:|:---:|------|
| 1 | Dashboard | `/dashboard` | ✅ | ✅ | — | `features/dashboard/DashboardPage.tsx` |
| 2 | Point of Sale | `/pos` | ✅ | ✅ | ✅ | `features/pos/PosPage.tsx` (+ `Cart`, `ProductGrid`, `CustomerSearch`) |
| 3 | Sales & invoices | `/sales` | ✅ | ✅ | ✅ (own only) | `features/sales/SalesPage.tsx` |
| 4 | Receipt | `/sales/:invoiceNo/receipt` | ✅ | ✅ | ✅ | `features/sales/ReceiptPage.tsx` |
| 5 | Products | `/products` | ✅ | ✅ | — | `features/products/ProductsPage.tsx` (+ `ProductForm`, `ProductGrid`) |
| 6 | Categories | `/categories` | ✅ | ✅ | — | `features/categories/CategoriesPage.tsx` |
| 7 | Inventory & stock | `/inventory` | ✅ | ✅ | — | `features/inventory/InventoryPage.tsx` |
| 8 | Customers | `/customers` | ✅ | ✅ | ✅ | `features/customers/CustomersPage.tsx` |
| 9 | Customer profile | `/customers/:id` | ✅ | ✅ | ✅ | `features/customers/CustomerProfile.tsx` |
| 10 | Suppliers | `/suppliers` | ✅ | ✅ | — | `features/suppliers/SuppliersPage.tsx` |
| 11 | Purchase orders | `/purchase-orders` | ✅ | ✅ | — | `features/suppliers/PurchaseOrdersPage.tsx` |
| 12 | Reports & analytics | `/reports` | ✅ | ✅ | — | `features/reports/ReportsPage.tsx` |
| 13 | Employees | `/employees` | ✅ | — | — | `features/employees/EmployeesPage.tsx` |
| 14 | Store settings | `/settings` | ✅ | — | — | `features/settings/StoreSettingsPage.tsx` |
| — | Import wizard | *(none — unrouted)* | ❌ | ❌ | ❌ | `features/import/ImportWizard.tsx` (BUG-U5) |

Platform-admin screens (`/admin/*`) are out of scope for the *owner* panel and are listed only for completeness: Overview, Stores & tenants, Store approvals, All users, Subscription plans, Security & sessions, Audit logs, Content moderation, System settings.

---

## 2. Global chrome (present on every owner screen)

### 2.1 App shell — `AppShell.tsx`
- **Desktop (>900px):** fixed 244px sidebar + main column with sticky topbar. **Mobile (≤900px):** sidebar collapses into a slide-in drawer with overlay; body scroll locks while open; Escape closes; route change closes it and smooth-scrolls to top.
- Wraps everything in `StoreProfileGate`, which loads the real store identity (name, currency, tax) and remounts the subtree once currency arrives so money formats correctly. **State:** default / (identity loading → template values) / loaded. ✅

### 2.2 Sidebar — `Sidebar.tsx`
| Element | Behaviour | Notes |
|---|---|---|
| Logo + "StoreFlow" wordmark | Static brand block | ✅ |
| Nav groups (Overview/Sell/Catalog/Relationships/Business) | Rendered from `navForRole(role)`; grouped by `group` | Owner shows all groups |
| Nav item (`NavLink`) | Active route gets a left accent bar + raised bg + `aria-current="page"` | ✅ keyboard/focus friendly |
| Approvals badge | Count pill — **platform-admin only** (`/admin/approvals`) | Not shown to owners |
| User chip (initials, name, role) | Static footer; role shown with `_`→space | No dropdown/menu — clicking does nothing ⚠️ (no profile menu) |

**Edge:** Long store/user names ellipsize. No "collapse sidebar" affordance on desktop. Nav has **no icons** (text-only labels) — intentional minimalist choice.

### 2.3 Topbar — `Topbar.tsx`
| Element | Type | Action | States | Status |
|---|---|---|---|---|
| Hamburger | Button (mobile only) | Toggles drawer; animates to X; `aria-expanded` | open/closed | ✅ |
| Page title | Text | Mirrors `NAV` label for current path; falls back to "StoreFlow" | — | ✅ |
| Theme toggle | Button | Flips light/dark via `setTheme`; `aria-pressed`; persists (localStorage in `lib/theme`) | light/dark | ✅ |
| Log out | Button (ghost) | `authService.logout()` → clears session → `/login` | idle only (no loading state) | ⚠️ no spinner; double-click could double-post logout |

### 2.4 Shared primitives
- **Button** (`Button.tsx`): variants primary/ghost/dark/danger; sizes sm/md; `isLoading` shows spinner + disables; `disabled`/loading set `cursor:not-allowed`, opacity .7, `aria-busy`. ✅ Loading state is opt-in per caller (many callers don't pass it — see per-page notes).
- **Input** (`Input.tsx`): label + `htmlFor`, error via `role="alert"` + `aria-invalid` + `aria-describedby`, hint text, password show/hide toggle, optional left icon, required asterisk. ✅ Strong a11y.
- **Modal** (`Modal.tsx`): portal dialog, `role="dialog"` + `aria-modal`, focus moves in on open, **Tab focus trap**, Escape + overlay-click close, body-scroll lock, focus restored on close. ✅ Also exports legacy `confirmDialog()` = native `window.confirm` (used by several pages — inconsistent with the styled `confirm()`; see BUG-U6).
- **ConfirmDialog** (`confirm()` + `<ConfirmDialogHost/>`): promise-based styled confirm, focuses Cancel for `danger`. ✅ **But most pages call the native `confirmDialog()` instead**, so the styled one is under-used.
- **DataTable** (`DataTable.tsx`): generic table with sticky header, loading skeleton rows, error row, empty-text row, hidden caption for a11y. ⚠️ **Not actually used by the owner CRUD pages** — every list page hand-rolls its own grid/card layout, so DataTable's loading/error states don't apply there.
- **Toast** (`Toast.tsx`): `toast(msg)` / `toast.success(title,desc)` / `toast.error(title,desc)` / info / warning. Global `<Toaster/>` host. This is the primary feedback channel for nearly every action.

---

## 3. Screen-by-screen element analysis

> For each screen: purpose, access, then every interactive element with behaviour, validation, states, edge cases, permissions, and a test verdict.

---

## SCREEN 1 — Dashboard (`/dashboard`)

**Purpose:** At-a-glance store health: onboarding progress, KPIs, low-stock, 7-day trend, recent sales, alerts.
**Access:** owner, manager. (Cashier lands on `/pos`.)
**Data source:** local `useSales` + `useProducts` stores (§0.2).

### Elements

**Onboarding checklist card**
- Type: card with 5 checkboxes + progress bar + Dismiss button.
- Behaviour: `done` is **local component state**, first item hard-coded `true`; toggling is cosmetic and **not persisted** — reload resets it. Dismiss only appears when 4/5+ done; hides the card for the session only.
- States: default (shows while <5 done) / all-done ("🎉 All set!") / dismissed.
- Verdict: ⚠️ Purely decorative; doesn't reflect real setup (e.g. checking "Add your first product" does nothing to the catalog, and having products doesn't auto-check it).

**KPI grid (4 tiles):** Revenue (MTD), Invoices, Products, Total stock.
- Revenue = Σ`sale.total` of loaded sales (labelled "MTD" but is all-time of loaded set — ⚠️ mislabel). Others are `.length` / Σ`stock`.
- States: values render 0 cleanly on empty. Verdict: ✅ compute correct / ⚠️ label.

**Low-stock alert banner** — shows when any `stock ≤ reorderPoint`; "View inventory" button → `/inventory`. ✅
**Sales-trend chart (7 bars)** — pure CSS bars from per-day sums; day labels Mon–Sun; scaled to max. Empty → flat min-height bars. ✅ No tooltip/hover value per bar (⚠️ minor).
**Low-stock side panel** — up to 6 rows, each a clickable row → `/inventory`; red badge if 0, amber otherwise; "All" button → `/inventory`; green empty state. ✅
**Recent sales list** — up to 5, each row/card clickable → `/sales/:invoiceNo/receipt`; "All sales" → `/sales`. Empty → "No sales yet — head to the POS." ✅ (desktop table vs mobile cards.)
**Alerts & activity** — synthesised list (low-stock / no-sales / no-products / invoice count); clickable rows route to the relevant page. ✅

**Edge cases:** empty DB → every panel shows its own empty state (no crash). Very large trend values scale correctly. **Permissions:** manager sees the identical page.
**Verdict:** ✅ functional / ⚠️ onboarding checklist and "MTD" label are misleading.

---

## SCREEN 2 — Point of Sale (`/pos`)

**Purpose:** Ring up a sale: pick products, attach a customer, discount, redeem points, take payment, print receipt.
**Access:** owner, manager, cashier.
**Composed of:** `PosPage` (layout + tax load) → `ProductGrid` (left) + `Cart` (right). Mobile: product grid full-screen, floating cart bar → full-screen cart overlay.

### PosPage-level
- **Tax rate load:** connected mode calls `apiGetStoreSettings()` and sets cart tax = `taxRate/100`; on failure falls back to the business-type template rate. This is the same authoritative rate the server charges (verified Phase 1). ✅
- **Clock:** updates every 30s. Cashier name from session. **Header item counter.** ✅

### ProductGrid (POS variant)
- Product tiles (emoji/photo, name, price, stock). Tap adds to cart. Search field + category filter. Out-of-stock handling relies on the checkout re-check (cart can exceed stock until PAY — see below).

### Cart (`Cart.tsx`) — the densest component in the app

| Element | Type | Behaviour | Validation / limits | Status |
|---|---|---|---|---|
| Customer search | Combobox (`CustomerSearch`) | Select existing or type-to-create; new customer created locally + toast | name ≥ needed by store | ✅ |
| Tier badge + points | Display | Shows `tierFor(points)` + formatted points | — | ✅ |
| **Redeem** button | Button | Toggles redemption; blocked with toast if no customer or points < `POINTS_BLOCK` | disabled < block threshold | ✅ |
| Line qty − / value / + | Buttons | `changeQty(id, ±1)`; `aria-label` Decrease/Increase | qty floored at removal, no explicit max vs stock in cart | ⚠️ no stock ceiling in cart (caught only at PAY) |
| Line remove ✕ | Button | `remove(id)`; hover turns red | — | ✅ |
| Discount toggle | Disclosure button | Expands discount panel; shows −amount when set | — | ✅ |
| Discount mode % / $ | Segmented buttons | Switch percent vs fixed | — | ✅ |
| Discount slider | Range input | `setDiscountRate/​Fixed(v, role)` — **capped by role** via `maxPctForRole`/`maxFixedForRole`; cap shown ("cap 20%") | role-capped max | ✅ role-based discount cap |
| Clear discount ✕ | Button | Resets to 0 | — | ✅ |
| Summary table | Display | items / discount / promo(pts) / tax; tax% label = `taxRate` | — | ⚠️ label grid is visually confusing (headers "Add/Discount/Promo/Tax" then a second row mixing redeem/discount) |
| **PAY N ITEMS** | Primary button | Sets pay method then opens confirm modal | requires items | ✅ |
| Hold ⏸ | Button | Parks the sale (`parkedSalesStore`); resets cart; toast | needs items | ✅ |
| Cash 💵 / Card 💳 quick | Buttons | Set method + open confirm | — | ✅ |
| Parked-sales chip | Button | Opens parked-sales modal | shows count | ✅ |

**Payment confirmation modal:** shows method, total, points-to-earn; Cancel / "Collect $X" (Cash) or "Charge $X" (Card).
- **Cash path:** `finishSale()` immediately → `completeSale()` (POST `/sales`) → toast + navigate to receipt.
- **Card path:** opens **simulated card terminal modal** — 3 steps (insert → "Authorizing…" 1.8s → "APPROVED" 1.2s) then completes. Fake AUTH/REF codes. Cancel only allowed at step 0. ⚠️ It's a **mock terminal**, not a real payment integration.
**Parked-sales modal:** list of parked carts with Resume / delete ✕; empty state. ✅

**Checkout logic (`checkout.ts`):**
- Re-checks stock before posting (prevents oversell) → error toast if short.
- Connected: redeems points first (server validates real balance), then POSTs sale; **if the sale fails after redeem, points are auto-refunded** via adjust. Refreshes products + customers from server truth. ✅ Robust.
- Errors surface as `toast(res.error)` and the sale is not recorded.

**Edge cases:** empty cart PAY blocked; oversell blocked at checkout with server message; discount cap enforced per role; redeem below threshold blocked; network failure → error toast, cart preserved. **Permissions:** cashier has full POS. **Verdict:** ✅ strong / ⚠️ mock terminal, no in-cart stock ceiling, confusing summary grid.

---

## SCREEN 3 — Sales & invoices (`/sales`)

**Purpose:** Browse/search/filter all invoices; open receipts; export CSV.
**Access:** owner, manager, cashier (**cashier sees only their own** — client filter `s.cashier === me`).

| Element | Type | Behaviour | States | Status |
|---|---|---|---|---|
| Export CSV | Button (ghost) | Builds CSV of filtered rows, downloads; toast; disabled when 0 rows | disabled/empty | ✅ |
| Stat tiles ×4 | Display | Total revenue / Invoices / Avg order / Filtered count | — | ✅ |
| Search | Text input | Matches invoice # or customer; URL-synced (`?q=`) | — | ✅ deep-linkable |
| Payment filter | Select | all/Cash/Card/Mobile; URL `?payment=` | — | ✅ |
| Cashier filter | Select | all + unique cashiers; URL `?cashier=` | — | ✅ |
| From / To date | Date inputs | Range filter (To inclusive to 23:59:59); URL synced | — | ✅ |
| Mobile filter toggle | Button | Collapses filter bar; shows active-filter summary | — | ✅ |
| Row / card | Clickable | → `/sales/:invoiceNo/receipt`; keyboard Enter on mobile card | hover raise | ✅ |
| View → | Button | Same nav (stops propagation) | — | ✅ |

**Table columns (desktop):** Invoice, Customer, Items, Cashier, Payment (color badge), Total, View.
**Empty states:** "No sales yet" (0 total) vs "No matches" (filtered to 0). ✅
**Missing:** ❌ **No void / refund / cancel action** anywhere on this page or the receipt (see BUG-U1). No column sorting (only filtering). No pagination (all rows render — ⚠️ scales poorly for large stores, §BUG-U7).
**Verdict:** ⚠️ read/export good; no void UI, no sort, no pagination.

---

## SCREEN 4 — Receipt (`/sales/:invoiceNo/receipt`)

**Purpose:** Printable thermal-style receipt.
**Access:** all store roles.

| Element | Behaviour | Status |
|---|---|---|
| ← New sale | → `/pos` | ✅ |
| Print | `window.print()` (page has `.no-print` on chrome) | ✅ |
| Receipt body | Store name, timestamp, invoice, cashier, customer, line items, subtotal/discount/points/tax/total, payment, points earned, footer | ⚠️ see bugs |

**BUGS on this screen:**
- ❌ **BUG-U2: store name hard-coded** — `const store = user?.storeId ? 'Blue Palm Grocers' : 'StoreFlow'`. Every logged-in store's receipt prints "Blue Palm Grocers" regardless of the real store name. Ignores the configured `storeName`.
- ⚠️ Footer text hard-coded "Thank you for shopping with us!" — ignores the configurable `receiptFooter` store setting.
- ⚠️ Redeemed-points value shown as `(pointsRedeemed/100)*5` — a magic conversion not tied to any setting.
- Edge: unknown invoice → "Receipt {no} not found." + Back to POS. ✅
**Verdict:** ❌ store-name bug makes printed receipts wrong for every real store.

---

## SCREEN 5 — Products (`/products`)

**Purpose:** Catalog CRUD.
**Access:** owner, manager (write). `writable = can(role,'product.write')`.

### Page controls
| Element | Type | Behaviour | Status |
|---|---|---|---|
| + Add product | Button | Opens `ProductForm` (new); only if `writable` | ✅ |
| Search | `SearchField` | name/SKU/barcode; has barcode-scan hook (`onBarcodeScan` just sets query) | ✅ |
| Stock filter | Select | any / in / low / out | ✅ |
| Category pills | `CategoryPills` | Filter by category with counts | ✅ |
| Product grid | `ProductGrid` | Renders products; row → Edit when writable | ✅ |

### ProductForm (modal) — the most validated form in the app
Fields: **Name*, SKU*, Barcode, Category* (select), Price*, Cost*, Stock, Reorder at**, plus an **image picker** (URL / Upload / Emoji tabs).
- **Validation** (`lib/validation/product.ts` via zod, per-field on blur + on submit): name 2–100 + charset; SKU 2–50 + charset; barcode optional charset; price/cost ≥ 0; stock/reorder integers ≥ 0; category required.
- **Error UX:** invalid submit shows a red summary panel listing bad fields as **clickable chips that focus+scroll to the field**, plus a shake animation and an error toast. Per-field inline errors with `aria-invalid`. ✅ Excellent.
- **Duplicate SKU:** local check first (`create` returns `{ok:false,error:'SKU already exists'}`) → inline error on SKU. If a dupe exists only on the server (not in local state), the POST 500s and the raw Mongo error surfaces in a toast (Phase-1 BUG-3). ⚠️
- **Image picker:**
  - URL tab: input + Apply (disabled when blank); `safeImageUrl()` sanitises.
  - Upload tab: click-or-drag dropzone, accepts png/jpeg/webp/avif, **2 MB cap** enforced with error toast; stored as data-URL.
  - Emoji tab: categorised emoji grid (10 groups), selecting one clears the image.
- Buttons: Cancel (disabled while submitting), Add/Save (shows "Saving…", `isLoading`).
- **States:** default / per-field error / submitting / duplicate / success (toast + close).
**Edge cases:** huge image → rejected; negative numbers blocked by `min=0`+zod; category list empty → defaults to "Beverages" placeholder; editing keys the form by product id so switching rows resets it.
**Verdict:** ✅ best-in-app form. ⚠️ inherits the server dup-SKU 500 for cross-session dupes; update path has no rollback (§0.1).

---

## SCREEN 6 — Categories (`/categories`)

**Purpose:** Manage product categories.
**Access:** owner, manager (write).

| Element | Type | Behaviour | Validation | Status |
|---|---|---|---|---|
| + Add category | Button | Opens modal (new) | writable only | ✅ |
| Category card | Card | Shows emoji/image, name, description, product-count badge | — | ✅ |
| Edit | Button (hover-reveal) | Opens modal (edit) | — | ✅ |
| Delete | Button (hover-reveal) | Blocked (disabled + "N in use") if `count>0`; else `confirmDialog` (native) then remove | **dependency guard** | ✅ |
| Modal: Name | Input | required ≥ 2 (toast "Enter a category name") | 2+ | ✅ |
| Modal: Emoji | Input + picker grid | maxLength 4; categorised grid | — | ✅ |
| Modal: Description | Input | optional | — | ✅ |
| Modal: Image | File picker | image/* , 2 MB cap, preview, Remove | 2 MB | ✅ |
| Save / Cancel | Buttons | create/update with dup-name guard (toast) | unique name | ✅ |

**Empty state:** folder icon + "No categories yet". **Edge:** deleting an in-use category is blocked in the UI *and* server (Phase 1). **Verdict:** ✅. ⚠️ uses native `window.confirm` (BUG-U6). No loading state on Save.

---

## SCREEN 7 — Inventory & stock (`/inventory`)

**Purpose:** Monitor low stock and log stock adjustments.
**Access:** owner, manager.

| Element | Type | Behaviour | Status |
|---|---|---|---|
| + Adjust stock | Button | Opens adjust modal (blank) | ✅ |
| Stat tiles ×4 | Total / In stock / Low / Out | ✅ |
| Low-stock cards | Per product: stock/reorder, progress bar, "Order +N" suggestion, **Quick adjust** (prefills modal) | ✅ |
| History search | Text input | Filter by product name | ✅ |
| History reason filter | Segmented buttons | all / Restock / Damage / Recount / Expired | ✅ |
| **Clear** history | Button | `confirmDialog` then `useInventory.clear()`; disabled when empty | ⚠️ clears **local** history only; not tied to server audit |
| History rows/cards | Display | product, ±delta (green/red), reason badge, by, timeAgo | ✅ |

**Adjust-stock modal:**
- Product search (type-ahead dropdown, shows on-hand); select fills the panel.
- **Change (+/−)** number input + quick chips +10/+25/+50/+100.
- **Reason** (4 icon buttons: Restock/Damage/Recount/Expired).
- Note (optional). Live **Result preview** (`stock → new`).
- Apply disabled unless product selected AND delta ≠ 0. Client guard: rejects negative-resulting stock with a toast. Maps to server `adjustmentType` increase/decrease (Phase 1 verified).
**Empty states:** "All stocked up" (no low stock) / "No adjustments yet". **Verdict:** ✅ well-built. ⚠️ "Clear" wipes local history but the server keeps its stock-adjustment records → list can silently repopulate/differ on reload.

---

## SCREEN 8 — Customers (`/customers`)

**Purpose:** Customer list with loyalty tiers; add/edit/delete.
**Access:** owner, manager, cashier (`customer.create` allows all three).

| Element | Type | Behaviour | Status |
|---|---|---|---|
| + Add customer | Button | Opens modal (new) | writable only |
| Stat tiles ×3 | Total / points issued / avg spent | ✅ |
| Search | Input | name or phone | ✅ |
| Tier filter | Segmented | all/Bronze/Silver/Gold | ✅ |
| Customer card | Card | avatar initial, tier badge, points, **tier progress bar**, orders count, spent | ✅ |
| View | Button | → `/customers/:id` | ✅ |
| Edit | Button | Opens modal (name + phone only) | writable |
| Delete | Button | Blocked (disabled + "N linked") if the customer has sales; else `confirmDialog` | **dependency guard** ✅ |
| Modal fields | Name* (≥2), Phone (optional) | toast on empty name | ✅ |

**Empty states:** "No customers yet" vs "No matches". **Note:** the edit modal exposes only name + phone (not email/loyalty) — those are server-managed. **Verdict:** ✅. ⚠️ native confirm; no loading state.

---

## SCREEN 9 — Customer profile (`/customers/:id`)

**Purpose:** Single-customer detail (points, tier, history).
**Access:** all store roles.
**Note:** Reached via "View". Renders customer detail + loyalty from the store. (If the id is unknown it shows a not-found/empty treatment consistent with the other detail pages.) **Verdict:** ✅ (read-only view; deeper edit happens on the list modal).

---

## SCREEN 10 — Suppliers (`/suppliers`)

**Purpose:** Manage suppliers and link products.
**Access:** owner, manager.

| Element | Type | Behaviour | Status |
|---|---|---|---|
| + Add supplier | Button | Opens modal (new) | ✅ |
| Supplier card | Card | initial avatar, name, phone/email, product-count badge, **open-PO badge**, address | ✅ |
| Edit / Remove | Buttons (hover) | Remove blocked (disabled + "N linked") if products linked; else `confirmDialog` | dependency guard ✅ |
| Modal: Name* | Input | ≥ 2 (toast) | ✅ |
| Modal: Phone / Email / Address | Inputs | optional | ✅ |
| **Linked products** (edit mode) | Search + list | click to link/unlink (writes `product.supplierId`); shows Linked ✕ / + Link | ✅ nice inline linker |

**Empty state:** "No suppliers yet". **Verdict:** ✅. ⚠️ native confirm; no loading state on Save. Note the product↔supplier link is stored on the product and the attach endpoint shape differs from the array form (Phase-1 note).

---

## SCREEN 11 — Purchase orders (`/purchase-orders`)

**Purpose:** Create POs, receive them (adds stock), delete pending ones.
**Access:** owner, manager.

| Element | Type | Behaviour | Status |
|---|---|---|---|
| + New purchase order | Button | Opens PO modal | ✅ |
| Search | Input | PO # or supplier | ✅ |
| Status filter | Segmented | all / pending / received | ✅ |
| PO row/card | Display | PO#, supplier, units, status badge, ordered/expected dates | ✅ |
| **Receive** | Button (pending only) | `confirmDialog` (summarises units) → `receivePO` → toast "N units added" | ✅ adds stock |
| Delete ✕ | Button (pending only) | Blocked for received PO (toast); else confirm + remove | ✅ |
| Modal: low-stock helper | Banner + **Prefill from low stock** | Auto-adds low-stock lines at suggested qty | ✅ smart |
| Modal: Supplier | Select | from suppliers | required |
| Modal: Product search | Type-ahead | adds line; dedupes (toast if already added) | ✅ |
| Modal: line qty − / input / + | Stepper | min 1 | ✅ |
| Modal: line remove ✕ | Button | removes line | ✅ |
| Modal: Expected delivery | Free-text | free-form ("Next week"); defaults "TBD" | ⚠️ not a real date |
| Modal: Total units | Display | live sum | ✅ |
| Create PO | Button | disabled until ≥1 line | ✅ |

**Empty states:** "No purchase orders yet" vs "No matches". **Note:** received POs can't be deleted/cancelled from the UI (server supports cancel; UI only cancels *pending* via delete). **Verdict:** ✅ strong flow. ⚠️ expected-delivery is free text, not validated.

---

## SCREEN 12 — Reports & analytics (`/reports`)

**Purpose:** Revenue, top products, cashier performance over a date range.
**Access:** owner, manager. (Cashier hidden in UI; API still open — Phase-1 BUG-4.)

| Element | Type | Behaviour | Status |
|---|---|---|---|
| Export CSV | Button | Downloads filtered sales CSV; disabled at 0 | ✅ |
| **Export PDF** | Button | **Stub** — toast "PDF report generation — coming soon" | ❌ not implemented (BUG-U4) |
| From / To date | Date inputs | Range filter | ✅ |
| Clear dates | Button | Resets range (shown only when set) | ✅ |
| Stat tiles ×4 | Revenue / Invoices / Avg order / Units sold | ✅ |
| Top-selling products | List | rank medals 🥇🥈🥉, units, revenue; top 8 | ✅ |
| Cashier performance | List | avatar, invoices, revenue; sorted | ✅ |

**Empty states:** "No sales yet" in each panel. **Data source:** local sales store (§0.2), not `/reports/*`. **Verdict:** ⚠️ CSV works; **PDF is a dead button**; figures are client-computed (won't match a server report for data not loaded in this session).

---

## SCREEN 13 — Employees (`/employees`)

**Purpose:** Invite and manage staff.
**Access:** **owner only** (route + nav). Manager cannot reach it.

| Element | Type | Behaviour | Validation | Status |
|---|---|---|---|---|
| + Add employee | Button | Opens invite modal | owner (`employee.manage`) | ✅ |
| Stat tiles ×3 | Total / Active / Disabled | — | ✅ |
| Search | Input | name or email | — | ✅ |
| Role filter | Segmented | all / Manager / Cashier | — | ✅ |
| Employee card | Card | avatar, name, email, **role badge**, **status badge** | — | ✅ |
| Role select (per card) | Select | owner can set Cashier/Manager; **manager limited to Cashier** (option hidden) | role-capped | ✅ matches backend |
| Deactivate / Activate | Button | `toggleStatus` → `apiUpdateEmployee({isActive})`; toast | — | ✅ (real API) |
| **Reset** password | Button | **Stub** — only `toast('Reset link sent…')`; no API call | — | ❌ fake (BUG-U8) |
| Delete | Button | `confirmDialog` → remove | can't target owner | ✅ |
| Owner card | — | Shows "Store owner" footer, no actions | — | ✅ self-protection |
| Invite modal | Name*, Work email*, Role select | name ≥ 2; email regex; role capped | — | ✅ |

**Data path:** `invite()` → `apiInviteEmployee` (connected) → server emails a set-password link; the hire self-activates (Phase-1 confirmed the invite/accept flow works). This is the **correct** staff path — the broken direct-create-with-password endpoint (Phase-1 BUG-2) is **not** used here.
**Empty state:** "No staff yet". **Verdict:** ✅ core flow solid. ❌ "Reset" button is a no-op that lies ("Reset link sent"). No pending/invited status shown distinctly (invited-but-not-accepted staff representation is limited).

---

## SCREEN 14 — Store settings (`/settings`)

**Purpose:** Store identity, currency, tax, branding, receipts, low-stock threshold, account info.
**Access:** **owner only.**

| Section | Field | Type | Behaviour / validation | Status |
|---|---|---|---|---|
| General | Store name | Input | text | ✅ |
| General | Phone / Email / Address | Inputs | no format validation on phone/email here | ⚠️ |
| General | Currency | Select | USD / EUR / EGP | ✅ |
| General | Tax rate (%) | Number | min 0, step 0.1 | ✅ drives POS/receipt/server |
| Branding | Store logo | File picker | image/*, **2 MB cap**, preview, Remove; data-URL | ✅ |
| Branding | Invoice prefix | Input | text | ✅ (server stores it; receipt UI ignores it — see BUG-U2 family) |
| Branding | Receipt footer | Input | text | ⚠️ saved but Receipt page ignores it |
| Low stock | Default threshold | Number | min 0; drives the **dashboard** low-stock server KPI (which is itself buggy — Phase-1 BUG-5) | ✅ input / ⚠️ downstream |
| Account | Signed in as / Role | Read-only inputs | display only | ✅ |
| Header | Save changes | Button | disabled unless `dirty`; `isLoading`; connected → `apiUpdateStoreSettings` + `apiUpdateMyStore` + identity refresh; toast | ✅ |

**Behaviour:** loads real settings on mount (connected) with an error toast on failure. Save keeps the store document (shell identity, receipts, admin list) in sync and refreshes identity so the currency/name update everywhere. **States:** loaded / dirty (button enabled) / saving / saved / load-error.
**Edge:** password change is intentionally **not** here — directs to "Forgot password". No delete-store / close-account option. **Verdict:** ✅ save flow correct and reactive. ⚠️ phone/email unvalidated; receipt footer & invoice prefix are saved but not honoured by the receipt renderer.

---

## 4. Button specification (consolidated)

| Button | Screen | Action / API | Success | Failure | Disabled when | Loading | Double-click |
|---|---|---|---|---|---|---|---|
| Log out | Topbar | `authService.logout` → `/login` | redirect | (silent) | — | ❌ none | ⚠️ could double-fire |
| Theme | Topbar | localStorage theme | instant | — | — | n/a | idempotent |
| + Add product | Products | opens ProductForm | modal | — | not writable | n/a | opens once |
| Add/Save product | ProductForm | `create/update` (+POST/PUT) | toast + close | inline+toast (create rolls back; **update doesn't**) | while submitting | ✅ "Saving…" | guarded (`submitting`) |
| + Add category / Save | Categories | `create/update` | toast + close | toast | — | ❌ none | ⚠️ unguarded |
| Delete (category/customer/supplier) | resp. | dependency-guarded → confirm → remove | toast | toast | count>0 | n/a | confirm gate |
| + Adjust stock / Apply | Inventory | `adjust` (+POST) | toast + close | toast | no product / delta 0 | ❌ none | ⚠️ unguarded |
| PAY / Cash / Card | POS Cart | `completeSale` (+POST) | toast + receipt | toast, cart kept | empty cart | terminal-sim for card | confirm gate |
| Receive PO | Purchase orders | `receivePO` (+POST) | toast | (local) | received | n/a | confirm gate |
| Create PO | Purchase orders | `createPO` (+POST) | toast + close | toast | 0 lines | ❌ none | ⚠️ unguarded |
| Export CSV | Sales/Reports | client blob download | toast | toast (nothing to export) | 0 rows | n/a | idempotent |
| Export PDF | Reports | **stub** | toast "coming soon" | — | 0 rows | — | ❌ no-op |
| Save changes | Settings | `apiUpdateStoreSettings`+`apiUpdateMyStore` | toast | toast | not dirty / busy | ✅ | guarded (`busy`) |
| Invite employee | Employees | `invite` (+POST) | toast + close | toast | — | ❌ none | ⚠️ unguarded |
| Reset (staff pw) | Employees | **stub** | toast "sent" | — | — | — | ❌ no-op |

**General button findings:** only ProductForm and Settings guard against double-submit with a loading state; most other create/save buttons (Categories, Customers, Suppliers, Inventory Apply, Create PO, Invite) fire synchronously with no loading state → **rapid double-click can double-submit** (mitigated for creates by local SKU/dup guards, but customers/suppliers/POs have no such guard → possible duplicate records). ⚠️ **BUG-U9.**

---

## 5. Input specification (consolidated)

| Field | Screen | Required | Limits / format | Empty | Invalid | Verdict |
|---|---|---|---|---|---|---|
| Product name | ProductForm | ✅ | 2–100, charset regex | inline err | inline err + chip | ✅ |
| SKU | ProductForm | ✅ | 2–50, charset | inline err | inline err; dup → inline | ✅ / ⚠️ cross-session dup 500 |
| Barcode | ProductForm | — | ≤50 charset | ok | inline err | ✅ |
| Price / Cost | ProductForm | ✅ | number ≥ 0 | err | `min=0`+zod | ✅ |
| Stock / Reorder | ProductForm | — | int ≥ 0 | 0 | zod int | ✅ |
| Category name | Categories | ✅ | ≥2, unique | toast | toast dup | ✅ |
| Emoji | Categories | — | maxLength 4 | ok | — | ✅ |
| Customer name | Customers | ✅ | ≥2 | toast | toast | ✅ |
| Customer phone | Customers | — | free text (no format check in UI) | ok | — | ⚠️ server regex may reject |
| Supplier name | Suppliers | ✅ | ≥2 | toast | toast | ✅ |
| Supplier email | Suppliers | — | `type=email` only | ok | browser hint | ⚠️ weak |
| Adjust delta | Inventory | ✅ | number ≠ 0, no-negative-result | toast | toast | ✅ |
| Invite name/email | Employees | ✅ | name ≥2; email regex | toast | toast | ✅ |
| Settings tax rate | Settings | — | number ≥ 0 | 0 | `min=0` | ✅ |
| Settings phone/email | Settings | — | **none** | ok | none | ⚠️ unvalidated |
| PO expected delivery | Purchase orders | — | free text | "TBD" | none | ⚠️ not a date |
| Date range (Sales/Reports) | resp. | — | `type=date` | ignored | n/a | ✅ |

**Cross-cutting:** Copy/paste works everywhere (standard inputs). Mobile inputs use 16px font to prevent iOS zoom. Number inputs rely on `min`/`step` + zod; most text inputs trim on submit. Phone/email validation is inconsistent (strong in ProductForm/Employees, weak/absent in Suppliers/Settings/Customers-phone).

---

## 6. Table / list specification

No owner list uses the shared `DataTable`; each is a bespoke responsive grid (desktop table ↔ mobile cards).

| List | Columns | Sort | Filter | Search | Pagination | Row action | Bulk |
|---|---|---|---|---|---|---|---|
| Sales | Invoice, Customer, Items, Cashier, Payment, Total | ❌ | payment, cashier, dates | ✅ | ❌ | open receipt | ❌ |
| Products (grid) | card tiles | ❌ | stock, category | ✅ | ❌ | edit | ❌ |
| Categories (cards) | — | ❌ | — | ❌ | ❌ | edit/delete | ❌ |
| Inventory history | Product, Change, Reason, By, When | ❌ (time desc fixed) | reason | ✅ | ❌ | — | clear-all |
| Customers (cards) | — | ❌ | tier | ✅ | ❌ | view/edit/delete | ❌ |
| Suppliers (cards) | — | ❌ | — | ❌ | ❌ | edit/remove | ❌ |
| Purchase orders | PO#, Supplier, Items, Status, Ordered, Expected | ❌ | status | ✅ | ❌ | receive/delete | ❌ |
| Employees (cards) | — | ❌ | role | ✅ | ❌ | role/toggle/reset/delete | ❌ |
| Reports (lists) | rank/units/revenue | fixed | date range | ❌ | ❌ | — | ❌ |

**Findings:** ❌ **No column sorting anywhere.** ❌ **No pagination anywhere** — all rows render (the API layer pulls `limit=500`; beyond that, data silently truncates and the list has no "load more"). ❌ **No bulk actions** (except Inventory "Clear history"). Empty and filtered-empty states are consistently handled. For large stores this is a scale problem (§BUG-U7).

---

## 7. Form specification (create/edit/cancel/save/delete)

All create/edit forms are modals with the same skeleton: Cancel (ghost) + primary Save; focus-trapped; Escape/overlay closes.

| Form | Create | Edit | Cancel | Save persistence | Dup prevention |
|---|---|---|---|---|---|
| Product | ✅ validated | ✅ (keyed by id) | ✅ discards | local + POST/PUT (create rolls back on fail; **edit doesn't**) | local SKU + server unique |
| Category | ✅ | ✅ | ✅ | local + POST/PUT | server + local name check |
| Customer | ✅ | ✅ (name/phone) | ✅ | local + POST/PUT | ❌ none (can create dupes) |
| Supplier | ✅ | ✅ (+link products) | ✅ | local + POST/PUT | ❌ none |
| Purchase order | ✅ | — (no edit) | ✅ | local + POST | dedupes lines only |
| Employee invite | ✅ | role/status inline | ✅ | POST invite | server 409 on dup email |
| Settings | — | ✅ (single form) | dirty-gated | POST + identity refresh | n/a |

**Consistency issues:** save-success is always a toast + close; **but edit/delete have no server-failure rollback** (§0.1) so a rejected edit shows as saved. Customers and Suppliers have **no duplicate prevention** client-side.

---

## 8. Navigation audit

**Sidebar (owner) — all resolve, all guarded:**
Overview → Dashboard ✅ · Sell → POS, Sales ✅ · Catalog → Products, Categories, Inventory ✅ · Relationships → Customers, Suppliers, Purchase orders ✅ · Business → Reports, Employees, Store settings ✅.
- Every nav path has a matching `RequireRole` route → correct redirect to `/403` if forced. ✅
- Deep links: `/sales/:invoiceNo/receipt`, `/customers/:id` resolve. ✅
- **Unrouted/orphan:** `features/import/ImportWizard.tsx` has **no route and no nav entry** — reachable only from a test. ❌ (BUG-U5). "Data import/export" therefore does not exist for owners (CSV *export* exists on Sales/Reports; there is no import).
- **No broken links** found in the owner nav. **No profile/account menu** on the user chip (only Settings page + topbar logout).
- Legal/public routes (`/terms`,`/privacy`,`/security`,`/legal`) exist but aren't linked from the owner shell.

---

## 9. Bugs & issues (UI phase)

> Severity: 🔴 High (wrong output / broken core function) · 🟠 Medium · 🟡 Low. Backend bugs from Phase 1 are cross-referenced, not repeated.

**🔴 BUG-U1 — No void/refund/cancel-sale UI.** The backend `PATCH /sales/:id/void` (fully working, reverses stock + points) has **no button anywhere** in the app, and `resources.ts` defines no `apiVoidSale`. An owner literally cannot reverse a mistaken sale from the product. *Fix:* add a Void action on the Receipt/Sales row (owner/manager) wired to the existing endpoint.

**🔴 BUG-U2 — Receipt store name hard-coded to "Blue Palm Grocers."** `ReceiptPage.tsx` line 12. Every real store prints the wrong name on every receipt. Also ignores the configured `receiptFooter` and `invoicePrefix`. *Fix:* pull name/footer from store settings/identity (the `/sales/:id/receipt` API already returns them).

**🟠 BUG-U3 — Update/Delete have no failure rollback.** In `productsStore` (and the sibling stores) `update`/`remove` mutate local state then fire-and-forget; a server rejection only toasts. The UI then shows data the server never accepted (or a row that still exists server-side as deleted locally). *Fix:* reconcile from the server response or re-fetch on error.

**🟠 BUG-U4 — "Export PDF" is a dead button** (Reports). Renders enabled, does nothing but toast "coming soon." *Fix:* implement or remove.

**🟠 BUG-U5 — Import Wizard is unrouted dead code.** Built and unit-tested but unreachable; there is no catalog/customer import path for owners. *Fix:* route it (e.g. `/products/import`) behind owner/manager, or remove.

**🟠 BUG-U8 — Employee "Reset password" is a no-op that claims success.** Only fires `toast('Reset link sent to …')`; no API call. Owner believes a reset was sent when nothing happened. *Fix:* wire to a real reset-trigger endpoint or remove the button.

**🟠 BUG-U9 — Double-submit exposure on unguarded create buttons.** Categories/Customers/Suppliers/Inventory-Apply/Create-PO/Invite have no loading state or in-flight guard; Customers & Suppliers also lack client dup-checks → rapid double-click can create duplicate records. *Fix:* disable + `isLoading` on click (as ProductForm/Settings already do).

**🟡 BUG-U6 — Two different confirm dialogs.** A styled, accessible `confirm()`/`ConfirmDialogHost` exists but most pages use the native `window.confirm` via `confirmDialog()`. Inconsistent UX, not theme-aware, and native confirm can't render the multi-line PO message nicely. *Fix:* standardise on the styled `confirm()`.

**🟡 BUG-U7 — No pagination or sorting on any list.** All rows render (API caps at `limit=500`); large stores silently lose rows past the cap and can't sort. *Fix:* server-side pagination + sortable columns.

**🟡 BUG-U10 — Onboarding checklist is fake.** Local, unpersisted, first item pre-checked, checkboxes don't reflect real store state. *Fix:* derive from real data or drop it.

**🟡 BUG-U11 — "Revenue (MTD)" mislabeled.** It is the sum of all loaded sales, not month-to-date. *Fix:* compute a true MTD window or rename.

**🟡 BUG-U12 — Logout button has no loading/disabled state** → double-click can double-post logout. Minor.

**🟡 BUG-U13 — Inconsistent input validation.** Phone (Customers/Settings) and email (Suppliers/Settings) accept anything client-side; the server may reject on save with a raw message. *Fix:* mirror the server regexes in the UI.

**🟡 BUG-U14 — Inventory "Clear history" clears only local state** while the server retains stock-adjustment records → the "cleared" list can repopulate on reload. Misleading. *Fix:* clarify it's a view reset, or wire to a real archival endpoint.

---

## 10. Missing functionality (product-owner lens)

1. **Void / refund / partial return UI** (backend exists — just unwired). *Highest impact.*
2. **Catalog/customer CSV import** (wizard exists but unrouted).
3. **PDF reports / receipts** (button stubbed).
4. **Column sorting + pagination** on all lists.
5. **Staff password reset that actually sends** (button is fake).
6. **Correct, configurable receipts** (store name, footer, invoice prefix all ignored by the renderer).
7. **Profile/account menu** (change own name, quick logout) from the user chip.
8. **Notifications surface** (low stock, PO received, invite accepted) — data exists, no inbox.
9. **Bulk actions** (bulk price update, bulk category assign, bulk deactivate staff).
10. **Self-service billing/subscription** (no plan/upgrade UI at all).
11. **Real barcode scanning** (the POS/Products "scan" hook just sets the query string).
12. **Optimistic-write reconciliation** so the UI can't drift from the server on failed edits/deletes.

---

## 11. Testing status summary

| Screen | Functional | UX / a11y | Data integrity | Verdict |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ⚠️ fake checklist, MTD label | ⚠️ |
| POS / Cart | ✅ | ✅ | ✅ (server reconcile) | ✅ (mock terminal) |
| Sales | ✅ read/export | ✅ | ⚠️ no void, no paging | ⚠️ |
| Receipt | ⚠️ | ✅ | ❌ hard-coded name | ❌ |
| Products / Form | ✅ | ✅ excellent | ⚠️ no edit rollback | ✅ |
| Categories | ✅ | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ⚠️ clear=local only | ✅ |
| Customers | ✅ | ✅ | ⚠️ no dup guard | ✅ |
| Suppliers | ✅ | ✅ | ⚠️ no dup guard | ✅ |
| Purchase orders | ✅ | ✅ | ✅ | ✅ |
| Reports | ⚠️ | ✅ | ⚠️ client-computed | ⚠️ (PDF dead) |
| Employees | ✅ invite flow | ✅ | ❌ reset is fake | ⚠️ |
| Store settings | ✅ | ✅ | ⚠️ footer/prefix ignored downstream | ✅ |

**Owner-panel UI readiness:** the shell, POS, catalog, inventory, suppliers/POs, and settings are genuinely production-grade in build quality, accessibility, and responsive design. The gaps that block "run my whole business from here" are: **no void/refund UI, wrong receipts, a fake password-reset button, a dead PDF button, an unreachable import wizard, and optimistic writes that can silently diverge from the server.** Fixing BUG-U1, U2, U3, U8 clears the highest-value defects.
