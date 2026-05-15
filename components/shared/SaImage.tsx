import Image from 'next/image';
import type { CSSProperties } from 'react';
import styles from './SaImage.module.css';

/**
 * SaImage — site-wide image wrapper with editorial filter tokens.
 *
 * filterIntensity:
 *   - 'editorial'              default editorial grade
 *   - 'editorial-light'        less aggressive (project renderings)
 *   - 'editorial-hover-enabled' editorial default, swap on parent hover
 *   - 'none'                   no filter
 */
export type SaImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  filterIntensity?:
    | 'editorial'
    | 'editorial-light'
    | 'editorial-hover-enabled'
    | 'none';
  objectPosition?: string;
};

const INLINE_FILTER: Record<string, string | undefined> = {
  editorial: 'var(--filter-editorial)',
  'editorial-light': 'var(--filter-editorial-light)',
  none: undefined,
};

export function SaImage({
  src,
  alt,
  width,
  height,
  fill,
  priority,
  sizes,
  className,
  filterIntensity = 'editorial',
  objectPosition = 'center',
}: SaImageProps) {
  const inlineFilter = INLINE_FILTER[filterIntensity];

  const style: CSSProperties = {
    transition: 'filter 400ms ease-out',
    objectPosition,
  };
  if (fill) style.objectFit = 'cover';
  if (inlineFilter) style.filter = inlineFilter;

  const mergedClassName = [
    filterIntensity === 'editorial-hover-enabled' ? styles.hoverEnabled : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={mergedClassName || undefined}
        style={style}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 1600}
      height={height ?? 1067}
      priority={priority}
      sizes={sizes}
      className={mergedClassName || undefined}
      style={style}
    />
  );
}
