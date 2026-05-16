'use client';

import type { CSSProperties } from 'react';
import videoStyles from './SaVideo.module.css';

export type SaVideoProps = {
  src: string;
  poster: string;
  alt: string;
  fill?: boolean;
  className?: string;
  objectPosition?: string;
  filterIntensity?: 'editorial' | 'editorial-light' | 'none';
};

const INLINE_FILTER: Record<string, string | undefined> = {
  editorial: 'var(--filter-editorial)',
  'editorial-light': 'var(--filter-editorial-light)',
  none: undefined,
};

export function SaVideo({
  src,
  poster,
  alt,
  fill,
  className,
  objectPosition = 'center',
  filterIntensity = 'editorial',
}: SaVideoProps) {
  const inlineFilter = INLINE_FILTER[filterIntensity];

  const style: CSSProperties = {
    transition: 'filter 400ms ease-out',
    objectPosition,
  };
  if (fill) {
    style.position = 'absolute';
    style.inset = 0;
    style.width = '100%';
    style.height = '100%';
    style.objectFit = 'cover';
  }
  if (inlineFilter) style.filter = inlineFilter;

  return (
    <>
      <video
        className={`${videoStyles.desktopOnly} ${className ?? ''}`.trim()}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
        style={style}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`${videoStyles.mobileOnly} ${className ?? ''}`.trim()}
        src={poster}
        alt={alt}
        style={style}
        loading="lazy"
        decoding="async"
      />
    </>
  );
}
