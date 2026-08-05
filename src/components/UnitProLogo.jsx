export default function UnitProLogo({ size = 40, label = 'UnitPro' }) {
  return (
    <span
      aria-label={label}
      role="img"
      style={{ display: 'inline-flex', width: size, height: size, flex: '0 0 auto' }}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <rect x="2" y="2" width="44" height="44" rx="11" fill="#071c2b" />
        <path d="M13 13h7v15.2c0 4.2 1.3 6.2 4 6.2s4-2 4-6.2V13h7v15.7c0 8-4.1 12.1-11 12.1S13 36.7 13 28.7V13Z" fill="#f6fffd" />
        <path d="m31 11 5 5-5 5v-3.7h-5v-4.6h5V11Z" fill="#1cc0ad" />
      </svg>
    </span>
  );
}
