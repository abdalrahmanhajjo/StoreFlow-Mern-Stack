import { useState } from 'react';

interface Props {
  src?: string;
  emoji: string;
  alt: string;
  size?: number;
  radius?: number;
}

// Image-first product thumbnail. Falls back to the emoji when there is no image
// URL or the image fails to load.
export function ProductThumb({ src, emoji, alt, size = 48, radius = 9 }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        background: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.5),
        flexShrink: 0,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span aria-hidden>{emoji}</span>
      )}
    </div>
  );
}
