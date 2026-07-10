import type { BasketLine } from '@/lib/contracts/types';
import { useFormatters, useStoreConfig } from '@/config/StoreProfileContext';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { Button } from '@/components/ui/Button';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { confirm } from '@/components/ui/ConfirmDialog';
import { computeBasketTotals } from './basketTotals';

export interface BasketPanelProps {
  lines: BasketLine[];
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  checkoutLabel?: string;
  busy?: boolean;
}

// POS basket. Uses the store's tax profile + locale formatters for correct,
// locale-aware totals, QuantityInput for accessible quantity edits, and a
// confirm step before removing a line.
export function BasketPanel({ lines, onQuantityChange, onRemove, onCheckout, checkoutLabel, busy }: BasketPanelProps) {
  const fmt = useFormatters();
  const { effective } = useStoreConfig();
  const totals = computeBasketTotals(lines, effective.tax);
  const hasRx = lines.some((l) => l.prescriptionRequired);

  const remove = async (line: BasketLine) => {
    const ok = await confirm({
      title: 'Remove item?',
      message: `Remove ${line.name} from the basket?`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (ok) onRemove(line.productId);
  };

  return (
    <section aria-label="Basket" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {lines.length === 0 ? (
        <StatusBanner variant="info" title="Basket is empty">
          Search or scan a product to add it.
        </StatusBanner>
      ) : (
        <>
          {hasRx && (
            <StatusBanner variant="warning" title="Prescription items in basket">
              Verify each prescription before completing the sale.
            </StatusBanner>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lines.map((line) => (
              <li key={line.productId} style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line-soft)', paddingBlockEnd: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{line.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt.money(line.unitPrice)} {line.unit !== 'each' ? `/ ${line.unit}` : 'each'}
                  </div>
                </div>
                <QuantityInput
                  label={`Quantity of ${line.name}`}
                  value={line.quantity}
                  min={1}
                  unit={line.unit}
                  locale={fmt.locale}
                  onChange={(q) => onQuantityChange(line.productId, q)}
                />
                <div style={{ width: 84, textAlign: 'end', fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--ink)' }}>
                  {fmt.money(line.unitPrice * line.quantity * (1 - (line.lineDiscount ?? 0)))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => void remove(line)} aria-label={`Remove ${line.name}`}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>

          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            <dt style={{ color: 'var(--ink-soft)' }}>Subtotal</dt>
            <dd style={{ margin: 0, textAlign: 'end' }}>{fmt.money(totals.subtotal)}</dd>
            {totals.discountTotal > 0 && (
              <>
                <dt style={{ color: 'var(--ink-soft)' }}>Discount</dt>
                <dd style={{ margin: 0, textAlign: 'end', color: 'var(--green)' }}>−{fmt.money(totals.discountTotal)}</dd>
              </>
            )}
            <dt style={{ color: 'var(--ink-soft)' }}>
              {effective.tax.label} {effective.tax.inclusive ? '(incl.)' : ''}
            </dt>
            <dd style={{ margin: 0, textAlign: 'end' }}>{fmt.money(totals.taxTotal)}</dd>
            <dt style={{ fontWeight: 700, color: 'var(--ink)', paddingBlockStart: 6 }}>Total</dt>
            <dd style={{ margin: 0, textAlign: 'end', fontWeight: 700, color: 'var(--ink)', paddingBlockStart: 6 }}>{fmt.money(totals.total)}</dd>
          </dl>

          <Button fullWidth onClick={onCheckout} isLoading={busy} disabled={lines.length === 0}>
            {checkoutLabel ?? `Charge ${fmt.money(totals.total)}`}
          </Button>
        </>
      )}
    </section>
  );
}
