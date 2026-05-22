'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import styles from './rosewood.module.css';

/**
 * R01 Rosewood Hero — Cinematic 全屏项目效果图 + Ken Burns + radial vignette
 * IO-gated clip-path reveal H1 "4136 Rosewood Ave"。与 CaseStudiesHero / ProjectsHero 同款。
 */
export function RosewoodHero() {
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
          src="/images/projects/4136-rosewood-rendering.png"
          alt="4136 Rosewood Ave — ED1 经济适用房项目"
          fill
          priority
          sizes="100vw"
          filterIntensity="none"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
      </div>
      <div className={styles.heroContent}>
        <span className={styles.heroEyebrow}>FEATURED CASE · 代表性案例</span>
        <h1 className={styles.heroH1}>
          <span className={revealClass}>4136 Rosewood Ave</span>
        </h1>
        <p className={styles.heroSubline}>洛杉矶 East Hollywood</p>
        <p className={styles.heroSubline}>ED1 经济适用房开发</p>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>69</span>
            <span className={styles.heroStatLabel}>单元</span>
          </div>
          <span className={styles.heroStatSep} aria-hidden="true">
            ·
          </span>
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>6</span>
            <span className={styles.heroStatLabel}>层</span>
          </div>
          <span className={styles.heroStatSep} aria-hidden="true">
            ·
          </span>
          <div className={styles.heroStat}>
            <span className={styles.heroStatStatus}>在管</span>
          </div>
        </div>
        <div className={styles.heroCtaRow}>
          <Link href="/zh/contact" className={styles.heroCtaPrimary}>
            项目评估 · 30 分钟
          </Link>
          <Link href="/zh/case-studies" className={styles.heroCtaSecondary}>
            查看更多案例
          </Link>
        </div>
      </div>
    </section>
  );
}
