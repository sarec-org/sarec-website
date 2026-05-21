'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import styles from './projects.module.css';

/**
 * P01 Projects Hero — Cinematic 全屏项目实景图 + radial vignette + Ken Burns
 * IO-gated clip-path reveal H1。与 EventsHero / FounderHero 同款模式。
 */
export function ProjectsHero() {
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
          src="/images/artgrid/la-city-02.jpg"
          alt="洛杉矶城市天际线 — SAREC 项目"
          fill
          priority
          sizes="100vw"
          filterIntensity="none"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
      </div>
      <div className={styles.heroContent}>
        <span className={styles.heroEyebrow}>PROJECTS · 项目</span>
        <h1 className={styles.heroH1}>
          <span className={revealClass}>SAREC 在做的项目</span>
        </h1>
        <p className={styles.heroLead}>
          SAREC 参与的项目覆盖经济适用房开发、精品公寓、跨境股权合作等多种类型。
        </p>
        <p className={styles.heroLead}>
          所有项目采用清晰的法律结构、账户结构和风险边界。
        </p>
        <p className={styles.heroNote}>
          具体项目名称、地址、规模与投资材料 —— 仅在合格沟通后提供。
        </p>
        <div className={styles.heroCtaRow}>
          <Link href="/zh/contact" className={styles.heroCtaPrimary}>
            项目评估 · 30 分钟
          </Link>
          <Link href="/zh/case-studies" className={styles.heroCtaSecondary}>
            查看案例研究
          </Link>
        </div>
      </div>
    </section>
  );
}
