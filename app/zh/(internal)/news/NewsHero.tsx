'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import styles from './news.module.css';

/**
 * News Hero — Cinematic 全屏 LA skyline + 文字 overlay
 *
 * ⚠️ 不是新设计:DOM 结构、动效与交互【逐字照抄】站内既有的
 *    app/zh/(internal)/events/EventsHero.tsx(92svh 满屏 / Ken Burns /
 *    radial vignette / IO-gated clip-path reveal H1),只换文案、图片与 CTA。
 *    站内每个内页都以同款 hero 开场,本页照此对齐。
 */
export function NewsHero() {
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
          src="/images/artgrid/services-hero-la-city.jpg"
          alt="Los Angeles — SAREC 新闻"
          fill
          priority
          sizes="100vw"
          filterIntensity="none"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
      </div>
      <div className={styles.heroContent}>
        <span className={styles.heroEyebrow}>NEWS · 新闻</span>
        <h1 className={styles.heroH1}>
          <span className={revealClass}>SAREC 新闻</span>
        </h1>
        <p className={styles.heroLead}>
          商会新闻、会员动态与合作进展。
        </p>
        <p className={styles.heroLead}>
          活动预告与活动回顾,请见「新闻与活动」页面。
        </p>
        <div className={styles.heroCtaRow}>
          <Link href="/zh/events" className={styles.heroCtaPrimary}>
            新闻与活动
          </Link>
          <Link href="/zh/research" className={styles.heroCtaSecondary}>
            查看研究中心
          </Link>
        </div>
      </div>
    </section>
  );
}
