import { useStoreConfig, useFormatters } from '@/config/StoreProfileContext';
import { RoleGuard } from '@/components/access/RoleGuard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { Button } from '@/components/ui/Button';
import { isRegulatedFlowOfflineSafe } from '@/config/templates/registry';

export interface DispensePanelProps {
  /** Network status. Defaults to the live browser value; injectable for tests. */
  online?: boolean;
  /** Item awaiting dispense (prescription-gated). */
  medicine?: { name: string; price: number; prescriptionRequired: boolean };
  onDispense?: () => void;
}

// Template adapter for the pharmacy `dispense-counter` layout. Demonstrates the
// config-driven regulated-offline gate: dispensing is blocked while offline
// unless the store explicitly opted in (complianceFlags.offlineRegulatedAllowed).
export function DispensePanel({
  online = typeof navigator !== 'undefined' ? navigator.onLine : true,
  medicine,
  onDispense,
}: DispensePanelProps) {
  const config = useStoreConfig();
  const fmt = useFormatters();

  const regulated = config.template.capabilities.prescriptionGate;
  const offlineSafe = isRegulatedFlowOfflineSafe(config.profile);
  const blockedOffline = regulated && !online && !offlineSafe;

  return (
    <section aria-labelledby="dispense-heading" style={{ maxWidth: 560 }}>
      <h1 id="dispense-heading" className="display" style={{ fontSize: 22, color: 'var(--ink)', margin: '0 0 4px' }}>
        {config.template.label} — dispensing
      </h1>
      <p style={{ color: 'var(--ink-soft)', marginBlockEnd: 16 }}>{config.template.tagline}</p>

      {blockedOffline && (
        <StatusBanner variant="error" title="Dispensing is unavailable offline">
          This is a regulated flow and your store has not enabled offline
          dispensing. Reconnect to continue, or ask an administrator to review
          the offline policy.
        </StatusBanner>
      )}
      {regulated && !online && offlineSafe && (
        <StatusBanner variant="warning" title="Dispensing offline">
          Records will be queued and reconciled when you reconnect. Verify patient
          identity manually.
        </StatusBanner>
      )}

      {medicine ? (
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16, marginBlockEnd: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{medicine.name}</div>
          <div style={{ color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>{fmt.money(medicine.price)}</div>
          {medicine.prescriptionRequired && (
            <div style={{ marginBlockStart: 8, fontSize: 12.5, color: 'var(--amber)' }}>
              Prescription required — verify before dispensing.
            </div>
          )}
        </div>
      ) : (
        <StatusBanner variant="info" title="No item selected">
          Scan or search for a medicine to begin.
        </StatusBanner>
      )}

      {/* Only pharmacists/managers and counter staff may dispense; the server
          re-checks this on submit. */}
      <RoleGuard
        allow={['manager', 'cashier']}
        fallback={<p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>You do not have permission to dispense.</p>}
      >
        <Button variant="dark" disabled={!medicine || blockedOffline} onClick={onDispense}>
          Dispense
        </Button>
      </RoleGuard>
    </section>
  );
}
