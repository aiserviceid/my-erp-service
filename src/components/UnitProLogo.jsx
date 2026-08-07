export default function UnitProLogo({ size = 40, width, variant = 'mark', label = 'UnitPro' }) {
  if (variant === 'wordmark') {
    return (
      <img
        src="/unitpro-logo.svg"
        alt={label}
        style={{ display: 'block', width: width || size * 4.6, height: size, objectFit: 'contain' }}
      />
    );
  }

  return (
    <span
      aria-label={label}
      role="img"
      style={{ display: 'inline-flex', width: size, height: size, flex: '0 0 auto' }}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <path d="M8 9h9c7.5 0 13.5 6.1 13.5 13.5v7.6c0 4 3.2 7.2 7.2 7.2 3.2 0 6-2.1 6.9-5v7.2c-3.1 3-7.4 4.9-12.1 4.9C19 44.4 8 33.4 8 19.9V9Z" fill="#1269FF" />
        <path d="M31.5 9H40v21.5C40 38 34 44 26.5 44h-4.3c5.1-2.4 8.6-7.6 8.6-13.6V9h.7Z" fill="#10CDB8" />
        <rect x="31.4" y="9" width="4" height="4" rx=".6" fill="#10CDB8" />
        <rect x="38.1" y="3.8" width="4" height="4" rx=".6" fill="#10CDB8" />
        <rect x="35.5" y="15.6" width="4" height="4" rx=".6" fill="#10CDB8" />
        <rect x="29.8" y="20.8" width="4" height="4" rx=".6" fill="#10CDB8" />
      </svg>
    </span>
  );
}
