'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import styles from './case-studies.module.css';

/**
 * C01 Case Studies Hero — Cinematic 全屏项目实景 + radial vignette + Ken Burns
 * IO-gated clip-path reveal H1。与 ProjectsHero / EventsHero 同款模式。
 */
export function CaseStudiesHero() {
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
          src="/images/projects/2219-wellesley-v2.webp"
          alt="SAREC 项目案例 — 2219 Wellesley"
          fill
          priority
          sizes="100vw"
          filterIntensity="none"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
      </div>
      <div className={styles.heroContent}>
        <span className={styles.heroEyebrow}>CASE STUDIES · 案例研究</span>
        <h1 className={styles.heroH1}>
          <span className={revealClass}>项目案例</span>
        </h1>
        <p className={styles.heroLead}>
          以下为 SAREC 已公开的代表性项目案例。
        </p>
        <p className={styles.heroNote}>
          更多项目细节、投资材料和具体合作条款 —— 仅在合格沟通后提供。
        </p>
        <div className={styles.heroCtaRow}>
          <Link href="/zh/contact" className={styles.heroCtaPrimary}>
            项目评估 · 30 分钟
          </Link>
          <Link
            href="/zh/about/founder#methodology"
            className={styles.heroCtaSecondary}
          >
            查看判断方法论
          </Link>
        </div>
      </div>
    </section>
  );
}
