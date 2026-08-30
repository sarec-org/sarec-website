'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import styles from './profile.module.css';

/**
 * Profile Hero — Editorial Split(左字右图)
 *
 * ⚠️ 不是新设计:DOM 结构、动效与交互【逐字照抄】站内既有的人物页 Hero
 *    app/zh/(internal)/about/founder/FounderHero.tsx,只把写死内容换成 props。
 */
export function ProfileHero({
  name,
  title,
  unitName,
  image
}: {
  name: string;
  title: string | null;
  unitName: string | null;
  image: { src: string; alt: string };
}) {
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
      <div className={styles.heroGrid}>
        <div className={styles.heroImageWrap}>
          <SaImage
            src={image.src}
            alt={image.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 70vw"
            filterIntensity="none"
            className={styles.heroImage}
          />
        </div>
        <div className={styles.heroText}>
          <span className={styles.heroEyebrow}>MEMBER PROFILE · 人物风采</span>
          <h1 className={styles.heroH1}>
            <span className={revealClass}>{name}</span>
          </h1>
          {title || unitName ? (
            <p className={styles.heroTitle}>
              {title}
              {title && unitName ? <br /> : null}
              {unitName}
            </p>
          ) : null}
          <div className={styles.heroCtaRow}>
            <Link href="/zh/members" className={styles.heroCtaPrimary}>
              查看全部会员
            </Link>
            <Link href="/zh/contact" className={styles.heroCtaSecondary}>
              联系 SAREC
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
