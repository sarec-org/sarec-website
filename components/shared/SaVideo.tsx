'use client';

import { useEffect, useState, type CSSProperties } from 'react';

/**
 * SaVideo — site-wide video wrapper with poster fallback on mobile.
 *
 * Below `mobileBreakpoint` (default 1024px), renders the poster <img> only
 * to save bandwidth. At/above, renders <video> with poster fallback.
 *
 * No controls / fullscreen. Always muted + playsInline for autoplay.
 */
export type SaVideoProps = {
  src: string;
  poster: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  className?: string;
  filterIntensity?: 'editorial' | 'none';
  mobileBreakpoint?: number;
};

export function SaVideo({
  src,
  poster,
  width,
  height,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  className,
  filterIntensity = 'editorial',
  mobileBreakpoint = 1024,
}: SaVideoProps) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${mobileBreakpoint}px)`);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [mobileBreakpoint]);

  const style: CSSProperties = {
    transition: 'filter 400ms ease-out',
    objectFit: 'cover',
    width: '100%',
    height: '100%',
    display: 'block',
  };
  if (filterIntensity === 'editorial') {
    style.filter = 'var(--filter-editorial)';
  }

  if (isDesktop === null) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt=""
        width={width}
        height={height}
        className={className}
        style={style}
      />
    );
  }

  if (!isDesktop) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt=""
        width={width}
        height={height}
        className={className}
        style={style}
      />
    );
  }

  return (
    <video
      src={src}
      poster={poster}
      width={width}
      height={height}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      preload="metadata"
      className={className}
      style={style}
    />
  );
}
