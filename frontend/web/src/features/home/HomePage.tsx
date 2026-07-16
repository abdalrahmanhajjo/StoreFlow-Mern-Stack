import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui';
import { landingRouteForRole } from '@/app/navConfig';
import { money } from '@/lib/format';
import { useSession } from '@/store/session';
import { getMockStore } from '@/mocks';
import { api } from '@/lib/axios';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/contracts/types';
import tenantsData from '@/data/tenants.json';
import productsData from '@/data/products.json';
import suppliersData from '@/data/suppliers.json';
import purchaseOrdersData from '@/data/purchaseOrders.json';
import inventoryAdjustmentsData from '@/data/inventoryAdjustments.json';
import loginAttemptsData from '@/data/loginAttempts.json';
import customersData from '@/data/customers.json';
import './HomePage.css';

interface Tenant {
  id: string;
  name: string;
  initials: string;
  color: string;
  owner: string;
  type: string;
  plan: string;
  users: number;
  salesMtd: number;
  status: 'active' | 'suspended';
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  reorderPoint: number;
  emoji: string;
  image: string;
  category: string;
}

interface Supplier {
  id: string;
  name: string;
  productCount: number;
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  supplier: string;
  lines: { productId: string; name: string; qty: number }[];
  status: 'pending' | 'received';
  expected: string;
}

interface InventoryAdjustment {
  id: string;
  productName: string;
  delta: number;
  reason: string;
  by: string;
  daysAgo: number;
}

interface LoginAttempt {
  id: string;
  account: string;
  ip: string;
  when: string;
  result: 'Success' | 'Failed' | 'Blocked';
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  spent: number;
}

const customers = customersData as Customer[];
const tenants = tenantsData as Tenant[];
const products = productsData as Product[];
const suppliers = suppliersData as Supplier[];
const purchaseOrders = purchaseOrdersData as PurchaseOrder[];
const inventoryAdjustments = inventoryAdjustmentsData as InventoryAdjustment[];
const loginAttempts = loginAttemptsData as LoginAttempt[];

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Services', href: '#services' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Contact', href: '#contact' },
];

/* Fallback copy of the official plans (src/scripts/seedPlans.ts). The live
 * values are fetched from the database via /v1/billing/plans so marketing
 * never drifts from what the backend actually enforces; this static copy is
 * used only when the API is unreachable (or in mock mode). */
type HomePlan = { key: string; price: string; period: string; blurb: string; cta: string; featured: boolean };
type HomeMatrixRow = { feature: string; values: string[] };

const FALLBACK_PLANS: HomePlan[] = [
  { key: 'Free', price: '$0', period: 'forever', blurb: '1 staff, 1 register, up to 50 products. Core POS only.', cta: 'Start free', featured: false },
  { key: 'Pro', price: '$49', period: 'per month', blurb: 'Up to 10 staff, suppliers, purchase orders, full reporting.', cta: 'Start with Pro', featured: true },
  { key: 'Enterprise', price: '$99', period: 'per month', blurb: 'Unlimited staff, advanced analytics, multi-branch, priority support.', cta: 'Start with Enterprise', featured: false },
];

const FALLBACK_MATRIX: HomeMatrixRow[] = [
  { feature: 'Product limit', values: ['50', 'Unlimited', 'Unlimited'] },
  { feature: 'Staff accounts', values: ['1', '10', 'Unlimited'] },
  { feature: 'Suppliers & purchase orders', values: ['—', '✓', '✓'] },
  { feature: 'Advanced analytics', values: ['—', '—', '✓'] },
  { feature: 'Multi-branch', values: ['—', '—', '✓'] },
  { feature: 'Priority support', values: ['—', '—', '✓'] },
];

const limitLabel = (v: number | null | undefined): string =>
  v === null || v === undefined || v < 0 ? 'Unlimited' : String(v);
const featureMark = (on: boolean | undefined): string => (on ? '✓' : '—');

/** Wire shape of a public plan as returned by GET /v1/billing/plans. */
interface ApiPlan {
  name?: string;
  description?: string;
  displayOrder?: number;
  isRecommended?: boolean;
  billing?: { monthlyPriceMinor?: number };
  limits?: { productsPerStore?: number | null; membersPerStore?: number | null };
  features?: {
    supplierManagement?: boolean;
    advancedAnalytics?: boolean;
    multiStore?: boolean;
    prioritySupport?: boolean;
  };
}

/** Builds the pricing cards + comparison rows from the database plans. */
function planViewFromApi(apiPlans: ApiPlan[]): { plans: HomePlan[]; matrix: HomeMatrixRow[] } | null {
  const list = apiPlans
    .filter((p): p is ApiPlan & { name: string; billing: NonNullable<ApiPlan['billing']> } =>
      Boolean(p?.name && p?.billing))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  if (list.length < 2) return null;

  const plans: HomePlan[] = list.map((p) => {
    const monthly = p.billing.monthlyPriceMinor ?? 0;
    const dollars = monthly % 100 === 0 ? `$${monthly / 100}` : `$${(monthly / 100).toFixed(2)}`;
    return {
      key: p.name,
      price: dollars,
      period: monthly === 0 ? 'forever' : 'per month',
      blurb: p.description ?? '',
      cta: monthly === 0 ? 'Start free' : `Start with ${p.name}`,
      featured: !!p.isRecommended,
    };
  });

  const matrix: HomeMatrixRow[] = [
    { feature: 'Product limit', values: list.map((p) => limitLabel(p.limits?.productsPerStore)) },
    { feature: 'Staff accounts', values: list.map((p) => limitLabel(p.limits?.membersPerStore)) },
    { feature: 'Suppliers & purchase orders', values: list.map((p) => featureMark(p.features?.supplierManagement)) },
    { feature: 'Advanced analytics', values: list.map((p) => featureMark(p.features?.advancedAnalytics)) },
    { feature: 'Multi-branch', values: list.map((p) => featureMark(p.features?.multiStore)) },
    { feature: 'Priority support', values: list.map((p) => featureMark(p.features?.prioritySupport)) },
  ];

  return { plans, matrix };
}

const TYPE_LABEL: Record<BusinessType, string> = {
  supermarket: 'Supermarket',
  pharmacy: 'Pharmacy',
  restaurant: 'Restaurant',
  boutique: 'Boutique',
  convenience: 'Convenience',
  electronics: 'Electronics',
};

const TYPE_WORD: Record<BusinessType, string> = {
  supermarket: 'supermarket',
  pharmacy: 'pharmacy',
  restaurant: 'restaurant',
  boutique: 'boutique',
  convenience: 'corner store',
  electronics: 'tech shop',
};

/** Presentational only — emoji fallbacks per per-type category. */
const CATEGORY_EMOJI: Record<string, string> = {
  'supermarket:dairy': '🥛', 'supermarket:produce': '🍌', 'supermarket:bakery': '🍞', 'supermarket:alcohol': '🍺',
  'pharmacy:otc': '💊', 'pharmacy:antibiotic': '💊', 'pharmacy:supplement': '🧴', 'pharmacy:controlled': '💉',
  'restaurant:mains': '🍽️', 'restaurant:starters': '🥗', 'restaurant:drinks': '☕',
  'boutique:dresses': '👗', 'boutique:accessories': '🧣', 'boutique:bags': '👜', 'boutique:shoes': '👠', 'boutique:outerwear': '🧥',
  'convenience:drinks': '🥤', 'convenience:snacks': '🍿', 'convenience:tobacco': '🚬', 'convenience:services': '📲',
  'electronics:phones': '📱', 'electronics:computers': '💻', 'electronics:audio': '🎧', 'electronics:accessories': '🔌', 'electronics:wearables': '⌚',
};

/** Presentational only — landing portraits for the seeded store owners
 * (verified Unsplash face crops; initials + brand color stay as fallback). */
const OWNER_PHOTOS: Record<string, string> = {
  t1: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=faces&auto=format',
  t2: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&h=160&fit=crop&crop=faces&auto=format',
  t3: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=faces&auto=format',
  t4: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=160&fit=crop&crop=faces&auto=format',
};

/** Stores the movie rotates through (the Arabic RTL pharmacy is excluded). */
const TOUR_TYPES: readonly BusinessType[] = BUSINESS_TYPES.filter((t) => t !== 'pharmacy');

/** The hero belt: the store names drifting under the scanner — the places
 * that run on StoreFlow. Computed once from static seed data. */
const BELT_PLACES = BUSINESS_TYPES.map((t) => {
  const s = getMockStore(t);
  return { id: t, name: s.profile.name, label: TYPE_LABEL[t] };
});

/** The counter movie: one full sale, start to finish, as timed chapters. */
const CHAPTERS = [
  { title: 'Ring it up', desc: 'Scan or search — the basket builds itself.', dur: 5200 },
  { title: 'Attach a customer', desc: 'Loyalty finds the tier and points instantly.', dur: 3400 },
  { title: 'Apply a discount', desc: 'Role-capped, logged, recalculated live.', dur: 3400 },
  { title: 'Take payment', desc: 'Cash or card — approval in seconds.', dur: 3800 },
  { title: 'Receipt & restock', desc: 'Stock decrements and the ledger updates itself.', dur: 5200 },
];

/** Full runtime of one sale, all chapters — shown in the tour kicker. */
const TOUR_RUNTIME = CHAPTERS.reduce((sum, c) => sum + c.dur, 0);

const SERVICES = [
  'Point of Sale',
  'Inventory & Stock',
  'Suppliers & Purchasing',
  'Customers & Loyalty',
  'Reports & Analytics',
  'Security & Audit',
];

const QUOTES = [
  '“StoreFlow has improved our inventory accuracy and gives us instant sales and stock insights.”',
  '“We ring sales in seconds and the counts just stay right. Closing the till got twenty minutes shorter.”',
  '“One workspace for the counter, the shelf and the books — my managers finally see the same numbers I do.”',
];

interface ThumbSource {
  name: string;
  image?: string;
  emoji: string;
}

const formatShortMoney = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

/** Reveal-on-scroll: content is visible by default; the observer only adds a
 * class that plays an entrance animation. */
function useReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** Floating pill nav: plain bar at top, condenses into a floating capsule on scroll. */
function useScrolledNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
}

/** Scroll-driven focus list: each line brightens and grows as it passes the
 * viewport center (evolvion-style). Reduced motion leaves everything static. */
function useFocusList(ref: React.RefObject<HTMLUListElement | null>) {
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lines = Array.from(list.querySelectorAll<HTMLElement>('.sf-focus-line'));
    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      const mid = window.innerHeight / 2;
      for (const el of lines) {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const d = Math.min(1, Math.abs(center - mid) / (window.innerHeight * 0.42));
        el.style.opacity = (1 - d * 0.85).toFixed(3);
        el.style.transform = `scale(${(1 - d * 0.08).toFixed(4)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [ref]);
}

export default function HomePage() {
  const user = useSession((s) => s.user);
  // Live plans from the database — the same records the backend enforces.
  const [planView, setPlanView] = useState<{ plans: HomePlan[]; matrix: HomeMatrixRow[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.get('/v1/billing/plans')
      .then((res) => {
        const built = planViewFromApi(res.data?.data ?? []);
        if (!cancelled && built) setPlanView(built);
      })
      .catch(() => { /* fall back to the static copy */ });
    return () => { cancelled = true; };
  }, []);
  const PLANS = planView?.plans ?? FALLBACK_PLANS;
  const PLAN_MATRIX = planView?.matrix ?? FALLBACK_MATRIX;
  const [biz, setBiz] = useState<BusinessType>('supermarket');
  const [stageBiz, setStageBiz] = useState<BusinessType>('supermarket');
  const [stagePaused, setStagePaused] = useState(false);
  const [tourBiz, setTourBiz] = useState<BusinessType>('restaurant');
  const [scene, setScene] = useState(0);
  const [tourPaused, setTourPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [tourInView, setTourInView] = useState(false);
  const tourRef = useRef<HTMLDivElement>(null);
  const [quotePage, setQuotePage] = useState(0);
  const [quotesPaused, setQuotesPaused] = useState(false);
  const scrolled = useScrolledNav();
  const focusRef = useRef<HTMLUListElement>(null);
  useReveal();
  useFocusList(focusRef);

  const activeTenants = tenants.filter((tenant) => tenant.status === 'active');
  const totalSales = tenants.reduce((sum, tenant) => sum + tenant.salesMtd, 0);

  /** Picking a business type anywhere restarts the movie in that store
   * (except the RTL pharmacy, which stays out of the movie rotation). */
  const pickBiz = (t: BusinessType) => {
    setBiz(t);
    if (TOUR_TYPES.includes(t)) {
      setTourBiz(t);
      setScene(0);
    }
  };

  // The movie starts on its own the moment it scrolls into view, restarts on
  // re-entry, and stands still while off screen. The low threshold matters on
  // phones, where the section fills more than a viewport.
  useEffect(() => {
    const el = tourRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setTourInView(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      setTourInView(visible);
      if (visible) setScene(0);
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Hover/focus pausing is a pointer-with-hover affordance. On touch, the
   * emulated mouseenter after a tap would pause the movie forever. */
  const pauseTour = (on: boolean) => {
    if (window.matchMedia('(hover: hover)').matches) setTourPaused(on);
  };

  const pauseStage = (on: boolean) => {
    if (window.matchMedia('(hover: hover)').matches) setStagePaused(on);
  };

  const pauseQuotes = (on: boolean) => {
    if (window.matchMedia('(hover: hover)').matches) setQuotesPaused(on);
  };

  // The storefront gallery drifts through the six stores on its own. The
  // timer resets on every change, so a tapped store holds for a full beat.
  useEffect(() => {
    if (stagePaused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => {
      setStageBiz((s) => BUSINESS_TYPES[(BUSINESS_TYPES.indexOf(s) + 1) % BUSINESS_TYPES.length]);
    }, 4200);
    return () => clearTimeout(id);
  }, [stagePaused, stageBiz]);

  // Testimonials advance on their own; pause on hover, respect reduced motion.
  useEffect(() => {
    if (quotesPaused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      setQuotePage((p) => (p + 1) % Math.max(1, activeTenants.length));
    }, 6000);
    return () => clearInterval(id);
  }, [quotesPaused, activeTenants.length]);

  // The movie: chapters advance on a timeline while visible; at the end of a
  // full sale the next store takes the counter. Hover/focus pauses, reduced
  // motion stops autoplay entirely.
  useEffect(() => {
    if (!tourInView || tourPaused || userPaused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => {
      if (scene < CHAPTERS.length - 1) {
        setScene(scene + 1);
      } else {
        const idx = TOUR_TYPES.indexOf(tourBiz);
        setTourBiz(TOUR_TYPES[(idx + 1) % TOUR_TYPES.length]);
        setScene(0);
      }
    }, CHAPTERS[scene].dur);
    return () => clearTimeout(id);
  }, [scene, tourBiz, tourPaused, userPaused, tourInView]);

  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.users, 0);
  const pendingOrders = purchaseOrders.filter((order) => order.status === 'pending');
  const blockedAttempts = loginAttempts.filter((attempt) => attempt.result !== 'Success');
  const dashboardHref = user ? landingRouteForRole(user.role) : '/login';
  const dashboardLabel = user ? 'Open app' : 'Sign in';

  // The movie's store: everything below is real seed data for that vertical.
  const tourStore = getMockStore(tourBiz);
  const tp = tourStore.profile;
  const tourFmt = new Intl.NumberFormat(tp.locale, { style: 'currency', currency: tp.currency });
  const tourItems = tourStore.products.slice(0, 3).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    thumb: { name: p.name, image: p.imageUrl, emoji: CATEGORY_EMOJI[`${tourBiz}:${p.categoryId}`] ?? '🛍️' } as ThumbSource,
  }));
  const tourSubtotal = tourItems.reduce((sum, item) => sum + item.price, 0);
  const tourDiscount = tourSubtotal * 0.1;
  const tourTotal = tourSubtotal - tourDiscount;
  const tourTax = `${tp.taxProfile.label} ${Math.round(tp.taxProfile.defaultRate * 100)}%`;
  const tourCustomer = customers[0];
  const tourTier = tourCustomer.points >= 500 ? 'Gold' : tourCustomer.points >= 100 ? 'Silver' : 'Bronze';
  const tourPoints = Math.floor(tourTotal);
  const tourCaps = [
    tp.featureFlags.prescriptionModule && 'Prescription workflows',
    tp.featureFlags.tableService && 'Table service & kitchen tickets',
    tp.featureFlags.serialTracking && 'Serial number tracking',
    tp.featureFlags.ageVerification && 'Age verification at the till',
    tp.featureFlags.loyalty && 'Loyalty points on every basket',
    tp.featureFlags.offlineQueue && 'Offline sales queue',
    tp.hardwareProfile.scale && 'Weighing scale, kg pricing',
    tp.hardwareProfile.kitchenDisplay && 'Kitchen display screen',
    tp.hardwareProfile.barcodeScanner && 'Barcode scanning',
    tp.hardwareProfile.cardTerminal && 'Card terminal',
  ].filter((c): c is string => Boolean(c)).slice(0, 4);

  const adjustment = inventoryAdjustments[0];
  const spotlight = activeTenants[quotePage % activeTenants.length];
  const spotlightPhoto = OWNER_PHOTOS[spotlight?.id]?.replace('w=160&h=160', 'w=760&h=920');

  // Contact form state feeds the live receipt preview.
  const [contact, setContact] = useState({ name: '', email: '', phone: '', country: '', company: '', website: '' });
  const [contactSent, setContactSent] = useState(false);
  const editContact = (key: keyof typeof contact) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setContact((c) => ({ ...c, [key]: e.target.value }));
      setContactSent(false);
    };
  const receiptLines: [string, string][] = [
    ['Name', contact.name],
    ['Email', contact.email],
    ['Phone', contact.phone],
    ['Country', contact.country],
    ['Company', contact.company],
    ['Website', contact.website],
  ];

  return (
    <main className="sf-home">
      <header className={`sf-home-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="sf-home-nav-pill">
          <Link
            to="/"
            className="sf-home-brand"
            aria-label="StoreFlow home"
            // Already on "/", so navigation is a no-op — clicking the brand
            // should visibly do something: return to the top of the page.
            onClick={(e) => {
              e.preventDefault();
              const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
            }}
          >
            <Logo size={28} />
            <span>StoreFlow</span>
          </Link>
          <nav className="sf-home-links" aria-label="Homepage">
            {navItems.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
          </nav>
          <div className="sf-home-nav-cta">
            <Link className="sf-home-ghost" to={dashboardHref}>{dashboardLabel}</Link>
            <Link className="sf-home-solid" to={user ? landingRouteForRole(user.role) : '/register'}>
              {user ? 'Dashboard' : 'Sign up'}
            </Link>
          </div>
        </div>
      </header>

      <section className="sf-hero" aria-label="StoreFlow overview">
        <a className="sf-hero-badge" href="#features">
          <span>{BUSINESS_TYPES.length} business types</span>
          See it in action <i aria-hidden>›</i>
        </a>
        <h1 className="display">
          Run the <em>Whole Store</em><br />from One Counter
        </h1>
        <p className="sf-hero-sub">
          Point of sale, inventory, suppliers and loyalty in one workspace — built
          for supermarkets, pharmacies, restaurants, boutiques, convenience and
          electronics stores alike.
        </p>
        <div className="sf-hero-cta">
          <a className="sf-home-ghost lg" href="#contact">Contact us</a>
          <Link className="sf-home-solid lg" to={user ? landingRouteForRole(user.role) : '/register'}>
            {user ? 'Open your dashboard' : 'Start free'}
          </Link>
        </div>
        <div className="sf-hero-trust">
          <div className="sf-hero-avatars" aria-hidden>
            {activeTenants.map((t) => (
              <OwnerAvatar key={t.id} tenant={t} />
            ))}
          </div>
          <p>Trusted by {activeTenants.length} active stores · {totalUsers} staff signed in</p>
        </div>

        <div className="sf-belt" aria-hidden>
          <span className="sf-belt-chip mono">
            <i /> {BUSINESS_TYPES.length} stores · one counter
          </span>
          <div className="sf-belt-clip">
            <div className="sf-belt-track">
              {[...BELT_PLACES, ...BELT_PLACES, ...BELT_PLACES, ...BELT_PLACES].map((place, i) => (
                <span key={`${place.id}-${i}`} className="sf-belt-place">
                  <b dir="auto">{place.name}</b>
                  <small>{place.label}</small>
                </span>
              ))}
            </div>
          </div>
          <span className="sf-belt-scanner" />
        </div>

        {/* Tonal water under the counter: one filled swell + two hairline sines,
            drifting at different speeds and directions. Inline SVG so the
            strokes/fills pick up theme tokens in both light and dark. */}
        <div className="sf-hero-waves" aria-hidden>
          <svg className="w1" viewBox="0 0 1440 160" preserveAspectRatio="none">
            <path d="M0,80 C120,40 240,40 360,80 C480,120 600,120 720,80 C840,40 960,40 1080,80 C1200,120 1320,120 1440,80 L1440,160 0,160 Z" />
          </svg>
          <svg className="w2" viewBox="0 0 1440 160" preserveAspectRatio="none">
            <path vectorEffect="non-scaling-stroke" d="M0,84 C120,124 240,124 360,84 C480,44 600,44 720,84 C840,124 960,124 1080,84 C1200,44 1320,44 1440,84" />
          </svg>
          <svg className="w3" viewBox="0 0 1440 160" preserveAspectRatio="none">
            <path vectorEffect="non-scaling-stroke" d="M0,110 C120,86 240,86 360,110 C480,134 600,134 720,110 C840,86 960,86 1080,110 C1200,134 1320,134 1440,110" />
          </svg>
        </div>
      </section>

      <section id="features" className="sf-features">
        <div className="sf-shell">
          <div className="sf-section-head centered" data-reveal>
            <span className="sf-kicker mono">Product tour · one sale in ~{Math.round(TOUR_RUNTIME / 1000)} seconds</span>
            <h2 className="display">Watch the <em>Full Process</em></h2>
            <p>
              One sale, start to finish, on real seed data — now playing at{' '}
              <span dir="auto">{tp.name}</span>, the {TYPE_LABEL[tourBiz].toLowerCase()}.
            </p>
          </div>

          <div
            ref={tourRef}
            className={`sf-tour${tourPaused || userPaused ? ' paused' : ''}${tourInView && !tourPaused && !userPaused ? ' playing' : ''}`}
            data-reveal
            onMouseEnter={() => pauseTour(true)}
            onMouseLeave={() => pauseTour(false)}
            onFocusCapture={() => pauseTour(true)}
            onBlurCapture={() => pauseTour(false)}
          >
            <div className="sf-duo">
              <div
                className="sf-tour-screen"
                id="tour-screen"
                role="tabpanel"
                aria-labelledby={`tour-tab-${scene}`}
              >
                <div className="sf-tour-chrome">
                  <b dir="auto">{tp.name}</b>
                  <span className="mono">{TYPE_LABEL[tourBiz]} · {tp.locale} · {tp.currency} · {tourTax}</span>
                </div>

                <div className="sf-tour-body" dir={tp.direction} key={`${tourBiz}-${tourInView ? 'live' : 'idle'}`}>
                  <div className="sf-movie-search" aria-hidden>
                    <span key={`type-${tourBiz}-${scene === 0 ? 'on' : 'off'}`} className={scene === 0 ? 'typing' : undefined}>
                      {tourItems[0]?.name}
                    </span>
                    <b>Search</b>
                  </div>

                  <div className="sf-movie-pos" aria-hidden>
                    <div className="sf-movie-grid">
                      {scene === 0 && <i className="sf-scan-beam" aria-hidden />}
                      {tourItems.map((item, i) => (
                        <div
                          key={item.id}
                          className={`sf-movie-tile${scene === 0 ? ' tap' : ' rung'}`}
                          style={scene === 0 ? { animationDelay: `${1.15 + i * 0.7}s` } : undefined}
                        >
                          <HomeThumb product={item.thumb} fill />
                          <div className="sf-movie-tile-meta">
                            <span>{item.name}</span>
                            <b className="mono">{tourFmt.format(item.price)}</b>
                          </div>
                          {scene === 0 && (
                            <i className="sf-tap-ring" style={{ animationDelay: `${1.15 + i * 0.7}s` }} />
                          )}
                          <em className="sf-movie-qty" style={scene === 0 ? { animationDelay: `${1.35 + i * 0.7}s` } : undefined}>1</em>
                        </div>
                      ))}
                    </div>

                    <div className="sf-tile-cart">
                      {tourItems.map((item, i) => (
                        <div
                          key={item.id}
                          className={`sf-tile-cart-row${scene === 0 ? ' enter' : ''}`}
                          style={scene === 0 ? { animationDelay: `${1.4 + i * 0.7}s` } : undefined}
                        >
                          <HomeThumb product={item.thumb} size={26} />
                          <span>{item.name}</span>
                          <b className="mono">{tourFmt.format(item.price)}</b>
                        </div>
                      ))}

                      {scene >= 1 && (
                        <div className={`sf-movie-customer${scene === 1 ? ' enter' : ''}`}>
                          <i aria-hidden>{tourCustomer.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</i>
                          <span>
                            <b>{tourCustomer.name}</b>
                            <small>{tourCustomer.points} pts on file</small>
                            <i className="sf-points-bar" aria-hidden>
                              <em style={{ width: `${Math.min(100, (tourCustomer.points / 500) * 100)}%` }} />
                            </i>
                          </span>
                          <em className={`sf-tier t-${tourTier.toLowerCase()}`}>{tourTier}</em>
                        </div>
                      )}

                      {scene >= 2 && (
                        <div className={`sf-tile-cart-row sf-movie-discount${scene === 2 ? ' enter' : ''}`}>
                          <span>Discount 10%</span>
                          <b className="mono">−{tourFmt.format(tourDiscount)}</b>
                        </div>
                      )}

                      <div className={`sf-tile-cart-pay${scene === 3 ? ' paying' : ''}`}>
                        {scene < 3 && <span>Pay {tourItems.length} items</span>}
                        {scene === 3 && <span>Card · terminal open</span>}
                        {scene >= 4 && <span>✓ Paid</span>}
                        <b className="mono">{tourFmt.format(scene >= 2 ? tourTotal : tourSubtotal)}</b>
                      </div>
                    </div>
                  </div>

                  {scene === 3 && (
                    <div className="sf-movie-terminal" aria-hidden>
                      <div className="sf-terminal-head">
                        <i /> Secure terminal · RF-01
                      </div>
                      <div className="sf-terminal-pad">
                        <span className="sf-nfc"><i /><i /><i /></span>
                        <i className="sf-term-card"><b /><em /></i>
                      </div>
                      <div className="sf-terminal-phases">
                        <span className="ph-a">Insert or tap card</span>
                        <span className="ph-b">Authorizing transaction…</span>
                        <span className="ph-c">✓ APPROVED</span>
                      </div>
                      <b className="mono">{tourFmt.format(tourTotal)}</b>
                    </div>
                  )}

                  {scene >= 4 && (
                    <div className="sf-movie-receipt" aria-hidden>
                      <b dir="auto">{tp.name}</b>
                      <small className="mono">Receipt · {tourTax}{tp.taxProfile.inclusive ? ' inclusive' : ''}</small>
                      <ul>
                        {tourItems.map((item, i) => (
                          <li key={item.id} style={{ animationDelay: `${0.35 + i * 0.14}s` }}>
                            <span>{item.name}</span>
                            <b className="mono">{tourFmt.format(item.price)}</b>
                          </li>
                        ))}
                        <li className="dis" style={{ animationDelay: `${0.35 + tourItems.length * 0.14}s` }}>
                          <span>Discount 10%</span>
                          <b className="mono">−{tourFmt.format(tourDiscount)}</b>
                        </li>
                        <li className="tot" style={{ animationDelay: `${0.5 + tourItems.length * 0.14}s` }}>
                          <span>Total</span>
                          <b className="mono">{tourFmt.format(tourTotal)}</b>
                        </li>
                      </ul>
                      <em className="sf-receipt-paid">PAID</em>
                      <p dir="ltr">+{tourPoints} pts for {tourCustomer.name.split(' ')[0]} · stock −1 each · sale in the audit log</p>
                      <small dir="ltr">
                        Back office already knows: {formatShortMoney(totalSales)} rung up platform-wide MTD,
                        last adjustment {adjustment.productName} {adjustment.delta} by {adjustment.by}.
                      </small>
                    </div>
                  )}
                </div>
              </div>

              <div className="sf-office" aria-hidden key={`office-${tourBiz}-${tourInView ? 'live' : 'idle'}`}>
                <div className="sf-office-head">
                  <b>Back office</b>
                  <span className="mono"><i /> live</span>
                </div>
                <div className="sf-office-feed">
                  {tourItems.map((item, i) => (
                    <div
                      key={item.id}
                      className={`sf-office-row${scene === 0 ? ' enter' : ''}`}
                      style={scene === 0 ? { animationDelay: `${1.7 + i * 0.7}s` } : undefined}
                    >
                      <em>Stock</em>
                      <span dir="auto">{item.name} · {item.stock - 1} left</span>
                    </div>
                  ))}
                  {scene >= 1 && (
                    <div className={`sf-office-row${scene === 1 ? ' enter' : ''}`} style={scene === 1 ? { animationDelay: '.6s' } : undefined}>
                      <em>CRM</em>
                      <span>{tourCustomer.name} attached · {tourCustomer.points} pts · {tourTier}</span>
                    </div>
                  )}
                  {scene >= 2 && (
                    <div className={`sf-office-row${scene === 2 ? ' enter' : ''}`} style={scene === 2 ? { animationDelay: '.6s' } : undefined}>
                      <em>Audit</em>
                      <span>10% discount approved · −{tourFmt.format(tourDiscount)}</span>
                    </div>
                  )}
                  {scene >= 3 && (
                    <div className={`sf-office-row${scene === 3 ? ' enter' : ''}`} style={scene === 3 ? { animationDelay: '2.9s' } : undefined}>
                      <em>Ledger</em>
                      <span>Card authorized · {tourFmt.format(tourTotal)}</span>
                    </div>
                  )}
                  {scene >= 4 && (
                    <div className={`sf-office-row${scene === 4 ? ' enter' : ''}`} style={scene === 4 ? { animationDelay: '.8s' } : undefined}>
                      <em>Report</em>
                      <span>MTD +{tourFmt.format(tourTotal)} · +{tourPoints} pts · receipt printed</span>
                    </div>
                  )}
                </div>
                <div className="sf-office-foot">Every line above wrote itself — nothing re-entered.</div>
              </div>
            </div>

              <div className="sf-player">
                <div className="sf-player-bar">
                  <button
                    type="button"
                    className="sf-play-btn"
                    onClick={() => setUserPaused((p) => !p)}
                    aria-label={userPaused ? 'Play the tour' : 'Pause the tour'}
                  >
                    {userPaused ? (
                      <svg viewBox="0 0 16 16" aria-hidden><path d="M5.2 3.2v9.6l8-4.8z" fill="currentColor" /></svg>
                    ) : (
                      <svg viewBox="0 0 16 16" aria-hidden><path d="M4.4 3.2h2.7v9.6H4.4zM8.9 3.2h2.7v9.6H8.9z" fill="currentColor" /></svg>
                    )}
                  </button>
                  <div className="sf-player-now">
                    <i aria-hidden />
                    <span>
                      Now playing · <b dir="auto">{tp.name}</b> · {TYPE_LABEL[tourBiz]}
                    </span>
                    <em>{CHAPTERS[scene].desc}</em>
                  </div>
                </div>
                <div className="sf-player-chapters" role="tablist" aria-label="Chapters of the sale">
                  {CHAPTERS.map((chapter, i) => (
                    <button
                      key={chapter.title}
                      type="button"
                      role="tab"
                      id={`tour-tab-${i}`}
                      aria-selected={scene === i}
                      aria-controls="tour-screen"
                      className={scene === i ? 'active' : i < scene ? 'done' : undefined}
                      onClick={() => setScene(i)}
                    >
                      <span>
                        <small className="mono">0{i + 1}</small>
                        {chapter.title}
                      </span>
                      <i className="sf-chap-track" aria-hidden>
                        {scene === i && (
                          <em
                            key={`${tourBiz}-${i}-${tourPaused}-${userPaused}-${tourInView}`}
                            style={{ animationDuration: `${chapter.dur}ms` }}
                          />
                        )}
                      </i>
                    </button>
                  ))}
                </div>
                <div className="sf-player-stores" role="group" aria-label="Pick the store the tour plays in">
                  {TOUR_TYPES.map((t) => {
                    const prof = getMockStore(t).profile;
                    return (
                      <button
                        key={t}
                        type="button"
                        className={t === tourBiz ? 'active' : undefined}
                        aria-pressed={t === tourBiz}
                        onClick={() => pickBiz(t)}
                      >
                        <b dir="auto">{prof.name}</b>
                        <small>{TYPE_LABEL[t]}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sf-tour-foot sf-swap" key={`foot-${tourBiz}`}>
                <span>Built for the {TYPE_WORD[tourBiz]}:</span>
                {tourCaps.map((capability) => (
                  <em key={capability}>{capability}</em>
                ))}
              </div>
          </div>
        </div>
      </section>

      <section id="services" className="sf-focus-section">
        <div className="sf-shell">
          <div className="sf-section-head centered" data-reveal>
            <h2 className="display">Complete <em>Store Management</em></h2>
            <p>From the till to the stockroom to the back office — one system, every counter.</p>
          </div>
          <ul className="sf-focus-list" ref={focusRef} aria-label="StoreFlow services">
            {SERVICES.map((service) => (
              <li key={service} className="sf-focus-line display">{service}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sf-showcase" aria-label="StoreFlow across business types">
        <div className="sf-shell">
          <div className="sf-section-head centered" data-reveal>
            <h2 className="display">Every Kind of <em>Counter</em></h2>
            <p>Six storefronts on the same system — open one and the whole page follows it.</p>
          </div>
        </div>
        <div className="sf-shell wide">
          <div
            className="sf-stage"
            onMouseEnter={() => pauseStage(true)}
            onMouseLeave={() => pauseStage(false)}
          >
            {BUSINESS_TYPES.map((t) => (
              <StagePanel
                key={t}
                biz={t}
                expanded={stageBiz === t}
                selected={biz === t}
                onHover={() => {
                  if (window.matchMedia('(hover: hover)').matches) setStageBiz(t);
                }}
                onPick={() => {
                  setStageBiz(t);
                  pickBiz(t);
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="sf-pricing">
        <div className="sf-shell">
          <div className="sf-section-head centered" data-reveal>
            <h2 className="display">Simple <em>Store-Sized</em> Pricing</h2>
            <p>Free for a single register. Upgrade when the counter gets busy — every plan runs the same workspace.</p>
          </div>
          <div className="sf-plan-grid">
            {PLANS.map((plan, i) => {
              const storesOn = tenants.filter((t) => t.plan === plan.key && t.status === 'active').length;
              return (
                <article key={plan.key} className={`sf-plan-card${plan.featured ? ' featured' : ''}`} data-reveal>
                  {plan.featured && <span className="sf-plan-flag">Most popular</span>}
                  <h3>{plan.key}</h3>
                  <div className="sf-plan-price">
                    <b className="display">{plan.price}</b>
                    <span>{plan.period}</span>
                  </div>
                  <p>{plan.blurb}</p>
                  <ul>
                    {PLAN_MATRIX.map((row) => (
                      <li key={row.feature} className={row.values[i] === '—' ? 'off' : undefined}>
                        <span>{row.feature}</span>
                        <b className={row.values[i] === '✓' ? 'tick' : undefined}>{row.values[i]}</b>
                      </li>
                    ))}
                  </ul>
                  <Link className={plan.featured ? 'sf-plan-cta' : 'sf-home-ghost'} to={user ? landingRouteForRole(user.role) : '/register'}>
                    {user ? 'Open your dashboard' : plan.cta}
                  </Link>
                  {storesOn > 0 && <small>{storesOn} of our live stores run {plan.key}</small>}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="reviews" className={`sf-reviews${quotesPaused ? ' paused' : ''}`}>
        <div className="sf-shell">
          <div className="sf-section-head centered" data-reveal>
            <h2 className="display">What Our <em>Store Owners</em> Say</h2>
            <p>{money(totalSales)} rung up month-to-date across every kind of counter.</p>
          </div>

          <div
            className="sf-voice"
            data-reveal
            onMouseEnter={() => pauseQuotes(true)}
            onMouseLeave={() => pauseQuotes(false)}
            onFocusCapture={() => pauseQuotes(true)}
            onBlurCapture={() => pauseQuotes(false)}
          >
            <div className="sf-voice-portrait sf-swap" key={`portrait-${spotlight.id}`}>
              {spotlightPhoto ? (
                <img src={spotlightPhoto} alt={spotlight.owner} />
              ) : (
                <span className="sf-voice-fallback" style={{ background: spotlight.color }} aria-hidden>
                  {spotlight.initials}
                </span>
              )}
              <span className="sf-voice-overlay">
                <b>{spotlight.owner}</b>
                <small>{spotlight.type} · {spotlight.name}</small>
              </span>
            </div>

            <div className="sf-voice-main">
              <blockquote className="display sf-swap" key={`quote-${spotlight.id}`}>
                {QUOTES[quotePage % QUOTES.length]}
              </blockquote>
              <p className="sf-voice-meta sf-swap" key={`meta-${spotlight.id}`}>
                <b className="mono">{money(spotlight.salesMtd)}</b> rung up MTD · {spotlight.plan} plan · {spotlight.name}
              </p>
              <div className="sf-voice-rail" role="tablist" aria-label="Store owners">
                {activeTenants.map((tenant, i) => (
                  <button
                    key={tenant.id}
                    type="button"
                    role="tab"
                    aria-selected={i === quotePage % activeTenants.length}
                    aria-label={`${tenant.owner}, ${tenant.name}`}
                    onClick={() => setQuotePage(i)}
                  >
                    <OwnerAvatar tenant={tenant} />
                    <i className="sf-voice-track" aria-hidden>
                      {i === quotePage % activeTenants.length && (
                        <em
                          key={`${quotePage}-${quotesPaused}`}
                          style={{ animationDuration: '6000ms' }}
                        />
                      )}
                    </i>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="sf-faq-section">
        <div className="sf-shell narrow">
          <div className="sf-section-head centered" data-reveal>
            <h2 className="display">Frequently Asked <em>Questions</em></h2>
            <p>Everything here is backed by live seed data — sign in and check.</p>
          </div>
          <div className="sf-faq-list" data-reveal>
            <FaqItem title="What is the maximum number of team members that can enter a store workspace?">
              StoreFlow is seeded with {totalUsers} users across {activeTenants.length} active stores, and every plan can invite owner, manager, and cashier roles.
            </FaqItem>
            <FaqItem title="How do I set up the StoreFlow POS system?" open>
              Start with your product catalog, connect supplier lists, then open POS to sell from live inventory. Seed data already includes {products.length} products and {suppliers.length} suppliers.
            </FaqItem>
            <FaqItem title="Does StoreFlow integrate purchasing with inventory?">
              Yes. Pending purchase orders such as {pendingOrders[0]?.poNo ?? 'PO-0418'} sync expected stock with supplier and product lines.
            </FaqItem>
            <FaqItem title="Can I track sales performance?">
              Yes. StoreFlow tracks sales, stock health, reports, and month-to-date tenant performance like {money(activeTenants[0]?.salesMtd ?? 0)} for {activeTenants[0]?.name ?? 'your store'}.
            </FaqItem>
            <FaqItem title="How much does StoreFlow cost?">
              Free forever for a single register with up to 50 products. Pro is {PLANS[1].price} per month and Enterprise is {PLANS[2].price} per month — today {tenants.filter((t) => t.plan === 'Pro' && t.status === 'active').length} of our live stores run Pro and {tenants.filter((t) => t.plan === 'Free' && t.status === 'active').length} run Free.
            </FaqItem>
            <FaqItem title="Can I monitor security events?">
              Yes. Security views include login attempts, blocked IPs, and audit activity. This dataset currently shows {blockedAttempts.length} failed or blocked attempts.
            </FaqItem>
          </div>
        </div>
      </section>

      <section id="contact" className="sf-contact-section">
        <div className="sf-shell sf-contact-grid">
          <div className="sf-contact-main" data-reveal>
            <h2 className="display">Tell us about<br />your store</h2>
            <p className="sf-contact-lead">
              Questions, pricing, or a setup like yours — write to us and your
              message gets rung up on the right.
            </p>

            <form className="sf-contact-form" onSubmit={(e) => { e.preventDefault(); setContactSent(true); }}>
              <label>
                Full name
                <input type="text" placeholder="Enter your name" value={contact.name} onChange={editContact('name')} />
              </label>
              <div className="sf-form-row">
                <label>
                  Email
                  <input type="email" placeholder="example@mail.com" value={contact.email} onChange={editContact('email')} />
                </label>
                <label>
                  Phone number
                  <input type="tel" placeholder="+1 555 0100" value={contact.phone} onChange={editContact('phone')} />
                </label>
              </div>
              <label>
                Country
                <select value={contact.country} onChange={editContact('country')}>
                  <option value="" disabled>Select country</option>
                  <option>United States</option>
                  <option>Lebanon</option>
                  <option>France</option>
                </select>
              </label>
              <div className="sf-form-row">
                <label>
                  Company name
                  <input type="text" placeholder={activeTenants[1]?.name ?? 'Company name'} value={contact.company} onChange={editContact('company')} />
                </label>
                <label>
                  Website URL
                  <input type="url" placeholder="Link to website" value={contact.website} onChange={editContact('website')} />
                </label>
              </div>
              <button type="submit">{contactSent ? 'Message sent ✓' : 'Send message'}</button>
            </form>
          </div>

          <aside className="sf-contact-receipt" data-reveal aria-hidden>
            <b className="sf-receipt-brand">STOREFLOW</b>
            <small className="mono">Message receipt · no. 0001</small>
            <ul>
              {receiptLines.map(([label, value]) => (
                <li key={label} className={value ? 'filled' : undefined}>
                  <span>{label}</span>
                  <b className="mono">{value || '—'}</b>
                </li>
              ))}
            </ul>
            <div className="sf-receipt-total">
              <span>Total</span>
              <b>1 message</b>
            </div>
            <p>We reply within one business day.</p>
            <i className="sf-receipt-barcode" />
            {contactSent && <em className="sf-receipt-stamp">Sent ✓</em>}
          </aside>
        </div>
      </section>

      <footer className="sf-home-footer">
        <div className="sf-shell">
          <div className="sf-footer-top">
            <div className="sf-footer-brand-col">
              <Link to="/" className="sf-footer-brand">
                <Logo size={26} />
                <span>StoreFlow</span>
              </Link>
              <p>Point of sale, inventory, suppliers and loyalty — one workspace for every kind of counter.</p>
              <button
                type="button"
                className="sf-footer-top-btn"
                onClick={() => {
                  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
                }}
              >
                ↑ Back to top
              </button>
            </div>
            <div className="sf-footer-cols">
              <div className="sf-footer-links">
                <b>Product</b>
                <a href="#reviews">Partners</a>
                <a href="#features">Features</a>
                <a href="#services">Services</a>
                <a href="#pricing">Pricing</a>
                <Link to={dashboardHref}>{dashboardLabel}</Link>
              </div>
              <div className="sf-footer-links">
                <b>Company</b>
                <a href="#faq">FAQ</a>
                <a href="#contact">Contact</a>
              </div>
              <div className="sf-footer-links">
                <b>Legal</b>
                <Link to="/terms">Terms of Service</Link>
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/security">Security</Link>
                <Link to="/legal">Legals</Link>
              </div>
            </div>
          </div>
          <div className="sf-footer-status mono">
            <span><i aria-hidden />Online · {activeTenants.length} stores on the counter</span>
            <span>One counter, every till. © {new Date().getFullYear()} StoreFlow.</span>
          </div>
        </div>
        <div className="sf-footer-wordmark display" aria-hidden>StoreFlow</div>
      </footer>
    </main>
  );
}

/** One storefront in the expanding gallery: a full-bleed product photo that
 * spreads open into a live register sheet. Collapsed panels show a vertical
 * type label; the selected store carries a dot marker. */
function StagePanel({
  biz,
  expanded,
  selected,
  onHover,
  onPick,
}: {
  biz: BusinessType;
  expanded: boolean;
  selected: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  const store = getMockStore(biz);
  const p = store.profile;
  const fmt = new Intl.NumberFormat(p.locale, { style: 'currency', currency: p.currency });
  const items = store.products.slice(0, 3);
  const total = fmt.format(items.reduce((sum, x) => sum + x.price, 0));
  const taxLabel = `${p.taxProfile.label} ${Math.round(p.taxProfile.defaultRate * 100)}%`;
  const heroImg = items[0]?.imageUrl?.replace('w=640&h=480', 'w=900&h=1100');

  return (
    <button
      type="button"
      className={`sf-stage-panel${expanded ? ' open' : ''}${selected ? ' picked' : ''}`}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onPick}
      aria-expanded={expanded}
      aria-pressed={selected}
      aria-label={`${TYPE_LABEL[biz]} — ${p.name}`}
    >
      <span className="sf-stage-bg" aria-hidden>
        {heroImg && <img src={heroImg} alt="" loading="lazy" />}
      </span>
      <span className="sf-stage-label" aria-hidden>{TYPE_LABEL[biz]}</span>
      {selected && <span className="sf-stage-dot" aria-hidden />}
      <span className="sf-stage-sheet" aria-hidden dir={p.direction}>
        <b dir="auto">{p.name}</b>
        <small className="mono">{TYPE_LABEL[biz]} · {p.locale} · {p.currency} · {taxLabel}</small>
        <span className="sf-stage-thumbs">
          {items.map((x) => (
            <HomeThumb
              key={x.id}
              product={{ name: x.name, image: x.imageUrl, emoji: CATEGORY_EMOJI[`${biz}:${x.categoryId}`] ?? '🛍️' }}
              fill
            />
          ))}
        </span>
        <span className="sf-stage-pay">
          <span>Pay {items.length} items</span>
          <b className="mono">{total}</b>
        </span>
      </span>
    </button>
  );
}

function FaqItem({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="sf-faq-item" open={open}>
      <summary>{title}</summary>
      <p>{children}</p>
    </details>
  );
}

/** Store-owner portrait with initials-on-brand-color as the fallback layer. */
function OwnerAvatar({ tenant }: { tenant: Tenant }) {
  const [failed, setFailed] = useState(false);
  const src = OWNER_PHOTOS[tenant.id];
  return (
    <i className="sf-owner-avatar" style={{ background: tenant.color }} aria-hidden>
      {tenant.initials}
      {src && !failed && <img src={src} alt="" onError={() => setFailed(true)} />}
    </i>
  );
}

/** Product photo with emoji fallback layered underneath (never a blank box). */
function HomeThumb({
  product,
  size,
  fill = false,
}: {
  product: ThumbSource;
  size?: number;
  fill?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`sf-thumb${fill ? ' fill' : ''}`}
      style={fill ? undefined : { width: size, height: size, fontSize: size ? size * 0.55 : undefined }}
      aria-label={product.name}
    >
      <i aria-hidden>{product.emoji}</i>
      {product.image && !failed && (
        <img src={product.image} alt="" loading="lazy" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
