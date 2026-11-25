import React, { useId, useState } from 'react';
import type { ScaleObject } from '../types/game';

interface SilhouetteSvgProps {
  item: ScaleObject;
  className?: string;
  width?: number;
  height?: number;
  forceVector?: boolean;
}

export const SilhouetteSvg: React.FC<SilhouetteSvgProps> = ({
  item,
  className = '',
  width,
  height,
  forceVector = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const gradId = useId();
  const [vbW, vbH] = item.box;

  if (item.imageUrl && !imgFailed && !forceVector) {
    return (
      <img
        src={item.imageUrl}
        alt={item.name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        draggable={false}
        className={`h-full w-full object-contain mix-blend-multiply select-none ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={item.name}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.72" />
        </linearGradient>
      </defs>
      {item.paths.map((p, idx) => (
        <path
          key={idx}
          d={p.d}
          fill={`url(#${gradId})`}
          fillOpacity={p.opacity ?? 1}
        />
      ))}
    </svg>
  );
};
