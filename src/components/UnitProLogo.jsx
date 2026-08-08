export default function UnitProLogo({ size = 42, height, width, variant = 'mark', label = 'UnitPro', style }) {
  const actualHeight = height || size;

  if (variant === 'mark') {
    return (
      <img
        src="/unitpro-mark.png"
        alt={label}
        style={{
          display: 'inline-block',
          height: actualHeight,
          width: width || 'auto',
          objectFit: 'contain',
          verticalAlign: 'middle',
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src="/unitpro-logo.png"
      alt={label}
      style={{
        display: 'inline-block',
        height: actualHeight,
        width: width || 'auto',
        maxHeight: '100%',
        objectFit: 'contain',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}


