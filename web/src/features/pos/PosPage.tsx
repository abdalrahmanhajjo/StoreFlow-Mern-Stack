import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';

// SF-501..504: Point of Sale screen
export default function PosPage() {
  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Register · Counter 1</div>
        <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Point of sale</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 18, alignItems: 'start' }}>
        <ProductGrid />
        <Cart />
      </div>
    </>
  );
}
