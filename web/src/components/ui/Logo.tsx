// SF-014b / SF-002: StoreFlow flow-mark logo
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="StoreFlow">
      <rect x="3" y="3" width="42" height="42" rx="12" fill="#131312" />
      <rect x="3.5" y="3.5" width="41" height="41" rx="11.5" stroke="#fff" strokeOpacity=".14" />
      <g fill="#fff">
        <path d="M11 13.5H29L33 18.5H15Z" fillOpacity=".82" />
        <path d="M12.5 21H30.5L34.5 26H16.5Z" />
        <path d="M14 28.5H32L36 33.5H18Z" fillOpacity=".92" />
      </g>
    </svg>
  );
}
