import { useState } from 'react';
import { authService } from '@/features/auth/authService';
import { useSession } from '@/store/session';

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13.5, color: 'var(--ink)',
  background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', margin: '0 0 6px',
};

/**
 * Settings card for permanent account deletion. Owners delete the store and
 * every record in it; staff remove only their own login. The backend is the
 * authority — it re-checks the password, the typed confirmation, and cancels
 * any paid subscription at the payment provider before deleting anything.
 */
export default function DangerZoneCard({ isMobile }: { isMobile: boolean }) {
  const user = useSession((s) => s.user);
  const clearSession = useSession((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isOwner = user?.role === 'owner';
  const canConfirm = password.length > 0 && (!isOwner || confirmText === 'DELETE') && !busy;

  const consequences = isOwner
    ? [
        'Your subscription is cancelled immediately — no further charges.',
        'Your store and all its data (products, sales, customers, suppliers, reports) are permanently deleted.',
        'All staff logins for your store are removed.',
        'Past invoices are retained for accounting and stay available on request.',
        'This cannot be undone.',
      ]
    : [
        'Your login and store access are permanently removed.',
        'Store data is not affected — it belongs to the store owner.',
        'This cannot be undone.',
      ];

  async function handleDelete() {
    if (!canConfirm) return;
    setBusy(true);
    setError('');
    try {
      await authService.deleteAccount(password, confirmText);
      clearSession();
      // Full reload: drops every piece of in-memory state for the deleted account.
      window.location.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account deletion failed. Please try again.');
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setConfirmText('');
    setError('');
  }

  return (
    <div className="sf-set-card" style={{
      background: 'var(--card)', border: '1px solid var(--red-soft, #f3d6d6)',
      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20,
    }}>
      <div style={{
        fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em',
        color: 'var(--red)', fontWeight: 600, marginBottom: isMobile ? 14 : 16,
        paddingBottom: isMobile ? 10 : 12, borderBottom: '1px solid var(--line)',
      }}>
        Danger zone
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.55, margin: '0 0 14px' }}>
        {isOwner
          ? 'Permanently delete your account and your store. Your subscription is cancelled immediately and all store data is erased. This cannot be undone.'
          : 'Permanently delete your login. Store data is not affected. This cannot be undone.'}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '10px 20px', borderRadius: 10, background: 'transparent',
          border: '1px solid var(--red)', color: 'var(--red)', fontSize: 12.5,
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {isOwner ? 'Delete account & store' : 'Delete my account'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-acct-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)', padding: 20,
          }}
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460, background: 'var(--card)', borderRadius: 16,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', padding: isMobile ? 20 : 28,
            }}
          >
            <h2 id="del-acct-title" style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', margin: '0 0 10px' }}>
              {isOwner ? 'Delete your account and store?' : 'Delete your account?'}
            </h2>

            <ul style={{ margin: '0 0 16px', padding: '0 0 0 18px' }}>
              {consequences.map((c) => (
                <li key={c} style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{c}</li>
              ))}
            </ul>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl} htmlFor="del-acct-pw">Your password</label>
              <input
                id="del-acct-pw" type="password" style={inp} value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {isOwner && (
              <div style={{ marginBottom: 12 }}>
                <label style={lbl} htmlFor="del-acct-confirm">
                  Type <strong style={{ color: 'var(--red)' }}>DELETE</strong> to confirm
                </label>
                <input
                  id="del-acct-confirm" type="text" style={inp} value={confirmText}
                  autoComplete="off" spellCheck={false}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>
            )}

            {error && (
              <p role="alert" style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 12px', lineHeight: 1.5 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button" onClick={close} disabled={busy}
                style={{
                  padding: '10px 18px', borderRadius: 10, background: 'var(--paper)',
                  border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 12.5,
                  fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              >
                Keep my account
              </button>
              <button
                type="button" onClick={handleDelete} disabled={!canConfirm}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1px solid var(--red)',
                  background: canConfirm ? 'var(--red)' : 'var(--paper)',
                  color: canConfirm ? '#fff' : 'var(--ink-faint)', fontSize: 12.5,
                  fontWeight: 700, cursor: canConfirm ? 'pointer' : 'default', fontFamily: 'inherit',
                }}
              >
                {busy ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
