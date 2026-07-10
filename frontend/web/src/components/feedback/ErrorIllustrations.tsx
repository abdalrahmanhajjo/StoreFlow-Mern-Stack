export function ServerCrash({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display: 'inline-block' }}>
      <rect x="8" y="20" width="48" height="32" rx="6" stroke="#131312" strokeWidth="2.5" fill="rgba(19,19,18,.05)" />
      <rect x="14" y="28" width="36" height="2" rx="1" fill="#e3e3df" />
      <rect x="14" y="34" width="28" height="2" rx="1" fill="#e3e3df" />
      <rect x="14" y="40" width="20" height="2" rx="1" fill="#e3e3df" />
      <circle cx="48" cy="44" r="2" fill="#c93d2e" />
      <line x1="22" y1="8" x2="26" y2="14" stroke="#131312" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="8" x2="30" y2="14" stroke="#131312" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="12" x2="20" y2="16" stroke="#a8731d" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="12" x2="36" y2="16" stroke="#a8731d" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SearchGlobe({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display: 'inline-block' }}>
      <circle cx="28" cy="28" r="18" stroke="#131312" strokeWidth="2.5" fill="rgba(19,19,18,.05)" />
      <circle cx="28" cy="28" r="7" stroke="#131312" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="10" y1="28" x2="46" y2="28" stroke="#131312" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="28" y1="10" x2="28" y2="46" stroke="#131312" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="42" cy="42" r="7" fill="#efefec" stroke="#131312" strokeWidth="2" />
      <line x1="47" y1="47" x2="54" y2="54" stroke="#131312" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display: 'inline-block' }}>
      <rect x="16" y="28" width="32" height="26" rx="5" stroke="#c93d2e" strokeWidth="2.5" fill="rgba(239,68,68,.06)" />
      <path d="M22 28V18a10 10 0 0 1 20 0v10" stroke="#c93d2e" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="40" r="3" fill="#c93d2e" />
      <line x1="32" y1="40" x2="32" y2="45" stroke="#c93d2e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
