'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import styles from './events.module.css';

/**
 * E01 Events Hero — Cinematic 全屏 LA skyline + 文字 overlay
 *
 * IO-gated clip-path reveal 给 H1。
 * 与 Founder F01 同款抽 client 模式(page.tsx 保 Server + metadata)。
 */
export function EventsHero() {
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
          alt="Los Angeles skyline — SAREC 活动与考察"
          fill
          priority
          sizes="100vw"
          filterIntensity="none"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
      </div>
      <div className={styles.heroContent}>
        <span className={styles.heroEyebrow}>EVENTS · 活动</span>
        <h1 className={styles.heroH1}>
          <span className={revealClass}>SAREC 活动与考察</span>
        </h1>
        <p className={styles.heroLead}>
          SAREC 围绕真实项目、市场判断、风险识别和资源协同,组织培训、研讨、闭门分享、行业展会和美国实地考察。
        </p>
        <p className={styles.heroLead}>
          活动不只是内容传播 —— 是会员深度参与跨境地产合作的关键场景。
        </p>
        <div className={styles.heroCtaRow}>
          <Link href="/zh/contact" className={styles.heroCtaPrimary}>
            报名活动 / 参加考察团
          </Link>
          <Link href="/zh/membership" className={styles.heroCtaSecondary}>
            加入会员,参与全部活动
          </Link>
        </div>
      </div>
    </section>
  );
}
