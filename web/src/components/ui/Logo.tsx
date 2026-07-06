// SF-014b / SF-002: StoreFlow flow-mark logo
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="StoreFlow">
      <defs>
        <linearGradient id="sf-tile" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset=".5" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="13" fill="url(#sf-tile)" />
      <rect x="3" y="3" width="42" height="42" rx="13" fill="#fff" fillOpacity=".1" />
      <g fill="#fff">
        <path d="M11 13.5H29L33 18.5H15Z" fillOpacity=".82" />
        <path d="M12.5 21H30.5L34.5 26H16.5Z" />
        <path d="M14 28.5H32L36 33.5H18Z" fillOpacity=".92" />
      </g>
    </svg>
  );
}
