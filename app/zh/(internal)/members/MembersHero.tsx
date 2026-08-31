'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import styles from './members.module.css';

/**
 * Members Hero — Cinematic 全屏 LA skyline + 文字 overlay
 *
 * ⚠️ 不是新设计:DOM 结构、动效与交互【逐字照抄】站内既有的
 *    app/zh/(internal)/events/EventsHero.tsx(92svh 满屏 / Ken Burns /
 *    radial vignette / IO-gated clip-path reveal H1),只换文案、图片与 CTA。
 *    站内每个内页都以同款 hero 开场,本页照此对齐。
 */
export function MembersHero() {
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
          src="/images/la/la-skyline-marquee.jpg"
          alt="Los Angeles skyline — SAREC 会员风采"
          fill
          priority
          sizes="100vw"
          filterIntensity="none"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
      </div>
      <div className={styles.heroContent}>
        <span className={styles.heroEyebrow}>MEMBERS · 会员风采</span>
        <h1 className={styles.heroH1}>
          <span className={revealClass}>SAREC 会员风采</span>
        </h1>
        <p className={styles.heroLead}>
          商会会员单位与会员人物的公开资料。
        </p>
        <p className={styles.heroLead}>
          所列单位与人物均经商会核实身份、资料真实性,并取得书面发布同意。
        </p>
        <div className={styles.heroCtaRow}>
          <Link href="/zh/join" className={styles.heroCtaPrimary}>
            加入商会
          </Link>
          <Link href="/zh/membership" className={styles.heroCtaSecondary}>
            查看会员权益
          </Link>
        </div>
      </div>
    </section>
  );
}
