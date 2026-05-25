'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './research.module.css';

/**
 * RC01 Research Hero — 全屏 Cinematic 视频背景
 * 4K Infographic 视频 (autoplay/loop/muted/playsInline) + radial vignette + clip-path reveal H1
 * 与 EventsHero / ProjectsHero / CaseStudiesHero / RosewoodHero 同款 IO 架构,改 Ken Burns 图为视频。
 */
export function ResearchHero() {
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
      { threshold: 0.15, rootMargin: '0px' }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const revealClass = `${styles.heroRevealLine}${
    visible ? ` ${styles.heroRevealVisible}` : ''
  }`;

  return (
    <section ref={sectionRef} className={styles.heroSection}>
      <div className={styles.heroVideoWrap} aria-hidden="true">
        <video
          className={styles.heroVideo}
          src="/videos/research-hero-nyc.mp4"
          poster="/videos/research-hero-nyc-poster.jpg"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
        <div className={styles.heroVignette} aria-hidden="true" />
      </div>

      <div className={styles.heroContent}>
        <span className={styles.heroEyebrow}>RESEARCH · 研究中心</span>
        <h1 className={styles.heroH1}>
          <span className={revealClass}>SAREC 研究中心</span>
        </h1>
        <p className={styles.heroLead}>
          SAREC 围绕真实项目和真实判断,定期发布美国房地产深度研究。
        </p>
        <p className={styles.heroLead}>
          不是泛泛的市场综述,而是带有判断、数据和方法论的深度分析。
        </p>
        <p className={styles.heroNote}>
          已发布研究 + 持续更新。订阅简报,获取最新通知。
        </p>
        <div className={styles.heroCtaRow}>
          <Link href="#subscribe" className={styles.heroCtaPrimary}>
            订阅简报
          </Link>
          <Link href="/zh" className={styles.heroCtaSecondary}>
            返回首页
          </Link>
        </div>
      </div>
    </section>
  );
}
