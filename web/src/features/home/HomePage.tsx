import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui';
import { landingPath } from '@/lib/rbac';
import { money } from '@/lib/format';
import { useSession } from '@/store/session';
import tenantsData from '@/data/tenants.json';
import productsData from '@/data/products.json';
import suppliersData from '@/data/suppliers.json';
import purchaseOrdersData from '@/data/purchaseOrders.json';
import inventoryAdjustmentsData from '@/data/inventoryAdjustments.json';
import loginAttemptsData from '@/data/loginAttempts.json';
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

const tenants = tenantsData as Tenant[];
const products = productsData as Product[];
const suppliers = suppliersData as Supplier[];
const purchaseOrders = purchaseOrdersData as PurchaseOrder[];
const inventoryAdjustments = inventoryAdjustmentsData as InventoryAdjustment[];
const loginAttempts = loginAttemptsData as LoginAttempt[];

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Services', href: '#services' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Demo', href: '#demo' },
];

const formatShortMoney = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export default function HomePage() {
  const user = useSession((s) => s.user);
  const activeTenants = tenants.filter((tenant) => tenant.status === 'active');
  const totalSales = tenants.reduce((sum, tenant) => sum + tenant.salesMtd, 0);
  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.users, 0);
  const lowStock = products.filter((product) => product.stock <= product.reorderPoint);
  const pendingOrders = purchaseOrders.filter((order) => order.status === 'pending');
  const blockedAttempts = loginAttempts.filter((attempt) => attempt.result !== 'Success');
  const topStores = [...activeTenants].sort((a, b) => b.salesMtd - a.salesMtd).slice(0, 4);
  const dashboardHref = user ? landingPath(user.role) : '/login';
  const dashboardLabel = user ? 'Open app' : 'Sign in';

  return (
    <main className="sf-home">
      <div className="sf-home-shell">
        <header className="sf-home-nav">
          <Link to="/" className="sf-home-brand" aria-label="StoreFlow home">
            <Logo size={34} />
            <span>StoreFlow</span>
          </Link>
          <nav className="sf-home-links" aria-label="Homepage">
            {navItems.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
          </nav>
          <Link className="sf-home-outline" to={user ? landingPath(user.role) : '/register'}>
            {user ? 'Dashboard' : 'Sign Up'}
          </Link>
        </header>

        <section className="sf-home-main" aria-label="StoreFlow overview">
          <div className="sf-home-hero">
            <div className="sf-home-pill">
              <span aria-hidden="true" />
              Demo
              <i />
              Point of Sales
            </div>
            <h1>Key Actions to Improve Retail Effectiveness</h1>
          </div>

          <HeroDashboard
            products={products.slice(0, 7)}
            topStore={topStores[0] ?? tenants[0]}
            totalSales={totalSales}
            lowStockCount={lowStock.length}
          />

          <div className="sf-home-logo-row" aria-label="StoreFlow customers">
            {activeTenants.map((tenant) => (
              <div key={tenant.id} className="sf-home-client">
                <span>{tenant.name}</span>
                <small>{tenant.type}</small>
              </div>
            ))}
          </div>
        </section>

        <section id="reviews" className="sf-story-grid" aria-label="StoreFlow customer stories">
          <StoryImageCard
            product={products[1]}
            kicker="See how Blue Palm Grocers uses"
            title="StoreFlow inventory and POS setup"
          />
          <div className="sf-quote-card">
            <div className="sf-quote-brand">{topStores[0]?.name ?? 'StoreFlow'}</div>
            <blockquote>
              "StoreFlow has improved our inventory accuracy and gives us instant sales and stock insights."
            </blockquote>
            <a href="#features">Know their before - after comparison <span aria-hidden="true">{'->'}</span></a>
          </div>
          <StoryImageCard
            product={products[7]}
            kicker="The important link between"
            title="supplier orders and shelf availability"
          />
        </section>

        <section id="services" className="sf-home-services">
          <div className="sf-home-section-heading">
            <h2>What's on Us</h2>
            <p>Experience the Future Service</p>
          </div>

          <div className="sf-service-grid">
            <ProductServiceCard product={products[1]} supplier={suppliers[1]} />
            <ReportServiceCard
              totalSales={totalSales}
              activeStores={activeTenants.length}
              pendingOrders={pendingOrders.length}
              adjustment={inventoryAdjustments[0]}
            />
          </div>
        </section>

        <section id="features" className="sf-faq-section">
          <div className="sf-home-section-heading">
            <h2>FAQ</h2>
            <p>Frequently Asked Question</p>
          </div>
          <div className="sf-faq-list">
            <FaqItem title="What is the maximum number of team members that can enter a store workspace?">
              StoreFlow is seeded with {totalUsers} users across {activeTenants.length} active stores, and every plan can invite owner, manager, and cashier roles.
            </FaqItem>
            <FaqItem title="How do I set up the StoreFlow POS system?" open>
              Start with your product catalog, connect supplier lists, then open POS to sell from live inventory. Demo data already includes {products.length} products and {suppliers.length} suppliers.
            </FaqItem>
            <FaqItem title="Does StoreFlow integrate purchasing with inventory?">
              Yes. Pending purchase orders such as {pendingOrders[0]?.poNo ?? 'PO-0418'} sync expected stock with supplier and product lines.
            </FaqItem>
            <FaqItem title="Can I track sales performance?">
              Yes. StoreFlow tracks sales, stock health, reports, and month-to-date tenant performance like {money(topStores[0]?.salesMtd ?? 0)} for {topStores[0]?.name ?? 'your store'}.
            </FaqItem>
            <FaqItem title="Can I monitor security events?">
              Yes. Security views include login attempts, blocked IPs, and audit activity. This dataset currently shows {blockedAttempts.length} failed or blocked attempts.
            </FaqItem>
          </div>
        </section>

        <section id="demo" className="sf-demo-section">
          <div className="sf-demo-visual">
            <h2>Ask Demo<br />Schedule for Free</h2>
            <div className="sf-monitor">
              <div className="sf-monitor-screen">
                {products.slice(0, 6).map((product) => (
                  <span key={product.id}>{product.emoji}</span>
                ))}
              </div>
              <div className="sf-monitor-stand" />
            </div>
          </div>

          <form className="sf-demo-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              Full Name
              <input type="text" placeholder="Enter Your Name" />
            </label>
            <div className="sf-form-row">
              <label>
                Email
                <input type="email" placeholder="example@mail.com" />
              </label>
              <label>
                Phone Number
                <input type="tel" placeholder="+1 555 0100" />
              </label>
            </div>
            <label>
              Country
              <select defaultValue="">
                <option value="" disabled>Select Country</option>
                <option>United States</option>
                <option>Lebanon</option>
                <option>France</option>
              </select>
            </label>
            <div className="sf-form-row">
              <label>
                Company Name
                <input type="text" placeholder={topStores[1]?.name ?? 'Company Name'} />
              </label>
              <label>
                Website URL
                <input type="url" placeholder="Link to Website" />
              </label>
            </div>
            <button type="submit">Book a Demo</button>
          </form>
        </section>

        <footer className="sf-home-footer">
          <Link to="/" className="sf-footer-brand">
            <Logo size={28} />
            <span>StoreFlow</span>
          </Link>
          <div>
            <a href="#reviews">Partners</a>
            <a href="#features">Features</a>
            <a href="#services">Services</a>
            <Link to={dashboardHref}>{dashboardLabel}</Link>
          </div>
          <div>
            <a href="#features">Terms of Service</a>
            <a href="#features">Privacy Policy</a>
            <a href="#features">Security</a>
            <a href="#features">Legals</a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function HeroDashboard({
  products,
  topStore,
  totalSales,
  lowStockCount,
}: {
  products: Product[];
  topStore: Tenant;
  totalSales: number;
  lowStockCount: number;
}) {
  const featured = products[1] ?? products[0];

  return (
    <section className="sf-hero-dashboard" aria-label="StoreFlow product dashboard preview">
      <div className="sf-mini-order">
        <div className="sf-mini-order-head">Order</div>
        {products.slice(0, 3).map((product) => (
          <div key={product.id} className="sf-mini-order-line">
            <ProductThumb product={product} />
            <span>{product.name}</span>
            <b>{money(product.price)}</b>
          </div>
        ))}
        <div className="sf-mini-total">
          <span>Total</span>
          <strong>{money(products.slice(0, 3).reduce((sum, product) => sum + product.price, 0))}</strong>
        </div>
      </div>

      <div className="sf-pos-panel">
        <div className="sf-pos-topbar">
          <span className="sf-pos-menu" />
          <span>Wed, 20 May 2026</span>
          <span>07:59 AM</span>
          <strong>Open Order</strong>
        </div>
        <div className="sf-category-row">
          {[...new Set(products.map((product) => product.category))].slice(0, 6).map((category) => (
            <span key={category}>{category}</span>
          ))}
        </div>
        <div className="sf-product-grid">
          {products.slice(0, 6).map((product) => (
            <article key={product.id}>
              <ProductThumb product={product} />
              <h3>{product.name}</h3>
              <p>{money(product.price)}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="sf-store-operator">
        <div className="sf-store-avatar" style={{ background: topStore.color }}>
          {topStore.initials}
        </div>
        <div>
          <strong>{topStore.name}</strong>
          <span>{topStore.owner}</span>
        </div>
      </div>

      <div className="sf-favorite-product">
        <span />
        Favorite Product
        <strong>{featured?.name}</strong>
      </div>

      <div className="sf-growth-card">
        <div className="sf-growth-badge">{lowStockCount}</div>
        <small>Growth</small>
        <strong>{formatShortMoney(totalSales)}</strong>
        <span>USD</span>
        <LineChart />
      </div>
    </section>
  );
}

function ProductServiceCard({ product, supplier }: { product: Product; supplier: Supplier }) {
  return (
    <article className="sf-service-card sf-product-service">
      <div className="sf-price-chip">
        <span>{product.category}</span>
        <strong>{money(product.price)}</strong>
      </div>
      <ProductThumb product={product} large />
      <div className="sf-product-copy">
        <h3>{product.name}</h3>
        <p>{supplier.name} supplies {supplier.productCount} catalog items for fresh daily replenishment.</p>
      </div>
    </article>
  );
}

function ReportServiceCard({
  totalSales,
  activeStores,
  pendingOrders,
  adjustment,
}: {
  totalSales: number;
  activeStores: number;
  pendingOrders: number;
  adjustment: InventoryAdjustment;
}) {
  return (
    <article className="sf-service-card sf-report-service">
      <div className="sf-report-panel">
        <h3><span /> Report Graph</h3>
        <LineChart />
        <div className="sf-report-metric">
          <span>Amount</span>
          <strong>{money(totalSales)}</strong>
          <i>USD</i>
        </div>
        <div className="sf-report-metric">
          <span>Stores</span>
          <strong>{activeStores}</strong>
          <i>{pendingOrders} POs</i>
        </div>
        <p>{adjustment.productName} adjusted {adjustment.delta} for {adjustment.reason.toLowerCase()} by {adjustment.by}.</p>
      </div>
    </article>
  );
}

function StoryImageCard({ product, kicker, title }: { product: Product; kicker: string; title: string }) {
  return (
    <article className="sf-story-card">
      <ProductThumb product={product} large />
      <div>
        <p>{kicker}</p>
        <strong>{title}</strong>
        <span aria-hidden="true">&rsaquo;</span>
      </div>
    </article>
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

function ProductThumb({ product, large = false }: { product: Product; large?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (product.image && !failed) {
    return (
      <img
        className={large ? 'sf-product-thumb large' : 'sf-product-thumb'}
        src={product.image}
        alt={product.name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={large ? 'sf-product-thumb large fallback' : 'sf-product-thumb fallback'} aria-label={product.name}>
      {product.emoji}
    </span>
  );
}

function LineChart() {
  return (
    <svg className="sf-line-chart" viewBox="0 0 260 112" role="img" aria-label="StoreFlow growth chart">
      <path d="M0 73 C24 38 39 38 58 73 S94 107 113 73 S146 39 166 65 S202 85 219 49 S246 41 260 58" />
      <path d="M0 73 C24 38 39 38 58 73 S94 107 113 73 S146 39 166 65 S202 85 219 49 S246 41 260 58 L260 112 L0 112 Z" />
    </svg>
  );
}
