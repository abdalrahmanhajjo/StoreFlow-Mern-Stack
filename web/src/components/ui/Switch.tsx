// SF-014b: accessible toggle
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 38,
        height: 22,
        borderRadius: 999,
        border: 'none',
        background: checked ? 'var(--blue)' : 'var(--line)',
        transition: '.18s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 19 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,.25)',
          transition: '.18s',
        }}
      />
    </button>
  );
}
