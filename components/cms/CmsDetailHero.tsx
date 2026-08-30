'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import styles from './detail.module.css';

/**
 * CmsDetailHero —— CMS V2 三套详情页共用的 Cinematic Hero。
 * ------------------------------------------------------------------
 * ⚠️ 不是新设计:DOM 结构与交互【逐段照抄】站内既有详情页
 *    app/zh/(internal)/case-studies/4136-rosewood/RosewoodHero.tsx
 *    (满屏封面 + Ken Burns + radial vignette + IO-gated clip-path reveal H1),
 *    只把写死的文案/图片换成 props。样式走 detail.module.css(逐字复制自 rosewood.module.css)。
 */
export type CmsDetailHeroProps = {
  eyebrow: string;
  title: string;
  sublines?: string[];
  stats?: Array<{ num?: string; label?: string; status?: string }>;
  image: { src: string; alt: string };
  primaryCta?: { label: string; href: string; external?: boolean };
  secondaryCta?: { label: string; href: string };
};

export function CmsDetailHero({
  eyebrow,
  title,
  sublines = [],
  stats = [],
  image,
  primaryCta,
  secondaryCta
}: CmsDetailHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3, rootMargin: '0px' }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const revealClass = `${styles.heroRevealLine}${
    visible ? ` ${styles.heroRevealVisible}` : ''
  }`;

  return (
    <section ref={sectionRef} className={styles.heroSection}>
      <div className={styles.heroImageWrap}>
        <SaImage
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="100vw"
          filterIntensity="none"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
      </div>
      <div className={styles.heroContent}>
        <span className={styles.heroEyebrow}>{eyebrow}</span>
        <h1 className={styles.heroH1}>
          <span className={revealClass}>{title}</span>
        </h1>
        {sublines.map((line) => (
          <p key={line} className={styles.heroSubline}>
            {line}
          </p>
        ))}
        {stats.length > 0 ? (
          <div className={styles.heroStats}>
            {stats.map((s, i) => (
              <span key={`${s.num ?? s.status ?? i}-${i}`} style={{ display: 'contents' }}>
                {i > 0 ? (
                  <span className={styles.heroStatSep} aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <div className={styles.heroStat}>
                  {s.num ? <span className={styles.heroStatNum}>{s.num}</span> : null}
                  {s.label ? <span className={styles.heroStatLabel}>{s.label}</span> : null}
                  {s.status ? (
                    <span className={styles.heroStatStatus}>{s.status}</span>
                  ) : null}
                </div>
              </span>
            ))}
          </div>
        ) : null}
        {primaryCta || secondaryCta ? (
          <div className={styles.heroCtaRow}>
            {primaryCta ? (
              primaryCta.external ? (
                <a
                  href={primaryCta.href}
                  className={styles.heroCtaPrimary}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {primaryCta.label}
                </a>
              ) : (
                <Link href={primaryCta.href} className={styles.heroCtaPrimary}>
                  {primaryCta.label}
                </Link>
              )
            ) : null}
            {secondaryCta ? (
              <Link href={secondaryCta.href} className={styles.heroCtaSecondary}>
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
