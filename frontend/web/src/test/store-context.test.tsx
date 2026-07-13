import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { StoreProfile } from '@/lib/contracts/types';
import { StoreProfileProvider, useFormatters, useStoreConfig } from '@/config/StoreProfileContext';
import { RoleGuard } from '@/components/access/RoleGuard';
import { DispensePanel } from '@/features/dispense/DispensePanel';
import { authRoleToStoreRole } from '@/config/roleMap';

function makeProfile(overrides: Partial<StoreProfile> = {}): StoreProfile {
  return {
    id: 's1',
    tenantId: 't1',
    name: 'Nile Pharmacy',
    businessType: 'pharmacy',
    locale: 'ar-EG',
    currency: 'EGP',
    direction: 'rtl',
    theme: { accent: '#0ea5e9' },
    taxProfile: { inclusive: true, defaultRate: 0.14, label: 'VAT' },
    hardwareProfile: {
      barcodeScanner: true,
      receiptPrinter: true,
      cashDrawer: false,
      scale: false,
      cardTerminal: true,
      kitchenDisplay: false,
    },
    featureFlags: { prescriptionModule: true },
    complianceFlags: { pharmacyDispensing: true },
    ...overrides,
  };
}

function wrap(profile: StoreProfile, role: Parameters<typeof StoreProfileProvider>[0]['role'], ui: ReactNode) {
  return render(
    <StoreProfileProvider profile={profile} role={role}>
      {ui}
    </StoreProfileProvider>
  );
}

describe('roleMap', () => {
  it('maps auth roles to store UX roles', () => {
    expect(authRoleToStoreRole('platform_admin')).toBe('admin');
    expect(authRoleToStoreRole('owner')).toBe('admin');
    expect(authRoleToStoreRole('manager')).toBe('manager');
    expect(authRoleToStoreRole('cashier')).toBe('cashier');
  });
});

describe('StoreProfileProvider', () => {
  function Probe() {
    const cfg = useStoreConfig();
    const fmt = useFormatters();
    return (
      <div>
        <span data-testid="tpl">{cfg.template.label}</span>
        <span data-testid="money">{fmt.money(10)}</span>
      </div>
    );
  }

  it('exposes resolved template + locale formatters', () => {
    wrap(makeProfile(), 'manager', <Probe />);
    expect(screen.getByTestId('tpl')).toHaveTextContent('Pharmacy');
    // EGP formatting, never a hardcoded "$"
    expect(screen.getByTestId('money').textContent).not.toContain('$');
  });

  it('renders English LTR even for an RTL-locale store (English-only UI)', () => {
    // The pharmacy profile is ar-EG/RTL, but the app is English-only: the
    // wrapper must stay en-US/ltr so layout and formatting never flip.
    const { container } = wrap(makeProfile(), 'manager', <Probe />);
    const wrapper = container.querySelector('div[dir]');
    expect(wrapper).toHaveAttribute('dir', 'ltr');
    expect(wrapper).toHaveAttribute('lang', 'en-US');
  });

  it('throws if hooks are used without the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/StoreProfileProvider/);
    spy.mockRestore();
  });
});

describe('RoleGuard', () => {
  it('renders children for allowed roles and fallback otherwise (via context)', () => {
    wrap(
      makeProfile(),
      'cashier',
      <RoleGuard allow={['manager', 'cashier']} fallback={<span>denied</span>}>
        <span>secret</span>
      </RoleGuard>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();

    wrap(
      makeProfile(),
      'customer',
      <RoleGuard allow={['manager']} fallback={<span>denied</span>}>
        <span>admin-only</span>
      </RoleGuard>
    );
    expect(screen.getByText('denied')).toBeInTheDocument();
    expect(screen.queryByText('admin-only')).not.toBeInTheDocument();
  });

  it('works standalone with an explicit role prop (no provider)', () => {
    render(
      <RoleGuard allow={['admin']} role="admin">
        <span>ok</span>
      </RoleGuard>
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });
});

describe('DispensePanel — regulated offline gate', () => {
  const medicine = { name: 'Amoxicillin 500mg', price: 45, prescriptionRequired: true };

  it('blocks dispensing offline when not opted in', () => {
    wrap(makeProfile(), 'cashier', <DispensePanel online={false} medicine={medicine} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/unavailable offline/i);
    expect(screen.getByRole('button', { name: 'Dispense' })).toBeDisabled();
  });

  it('allows offline dispensing with a warning when explicitly opted in', () => {
    const profile = makeProfile({ complianceFlags: { pharmacyDispensing: true, offlineRegulatedAllowed: true } });
    wrap(profile, 'cashier', <DispensePanel online={false} medicine={medicine} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/dispensing offline/i); // warning uses role=alert
    expect(screen.getByRole('button', { name: 'Dispense' })).toBeEnabled();
  });

  it('enables dispensing online and calls onDispense', async () => {
    const user = userEvent.setup();
    const onDispense = vi.fn();
    wrap(makeProfile(), 'cashier', <DispensePanel online medicine={medicine} onDispense={onDispense} />);
    const btn = screen.getByRole('button', { name: 'Dispense' });
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(onDispense).toHaveBeenCalledOnce();
  });

  it('hides the dispense control for roles without permission', () => {
    wrap(makeProfile(), 'customer', <DispensePanel online medicine={medicine} />);
    expect(screen.queryByRole('button', { name: 'Dispense' })).not.toBeInTheDocument();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});
