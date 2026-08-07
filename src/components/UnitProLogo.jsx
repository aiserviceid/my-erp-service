export default function UnitProLogo({ size = 40, label = 'UnitPro', wordmark = false }) {
  if (wordmark) {
    const width = Math.round(size * 3.75);
    return (
      <img
        src="/unitpro-logo.svg"
        alt={label}
        width={width}
        height={size}
        style={{
          display: 'block',
          width,
          height: size,
          objectFit: 'contain',
          objectPosition: 'left center',
        }}
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
        <rect x="2" y="2" width="44" height="44" rx="11" fill="#f8fbff" />
        <path d="M9 9h11.5c6.7 0 12 5.4 12 12v9.6c0 3.7 3 6.7 6.7 6.7 1.9 0 3.6-.8 4.8-2.1v3.3c-2.6 2.2-6 3.5-9.7 3.5C20.3 42 9 30.7 9 16.7V9Z" fill="#1269FF" />
        <path d="M27.2 9h8.4v22.2C35.6 37.2 30.8 42 24.8 42h-4.4c4.1-2.2 6.8-6.4 6.8-11.2V9Z" fill="#10CDB8" />
        <rect x="30" y="8" width="4" height="4" rx=".6" fill="#12CDB8" />
        <rect x="36" y="4" width="4" height="4" rx=".6" fill="#12CDB8" />
        <rect x="34" y="15" width="4" height="4" rx=".6" fill="#12CDB8" />
      </svg>
    </span>
  );
}
