'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import styles from './founder.module.css';

/**
 * F01 Founder Hero — Editorial Split(左字右图)
 *
 * Client component,用 IntersectionObserver 在 section 进入 viewport(threshold 0.3)
 * 时触发 .heroRevealVisible 类,让 H1 内"Andy" / "Wang" 两行 clip-path 揭开。
 *
 * 抽为独立 client component 的原因:page.tsx 是 Server Component
 * (export const metadata 必须在 Server Component),无法直接用 hooks。
 * 与 About/ManifestoSection.tsx 同款模式。
 */
export function FounderHero() {
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
            src="/images/founder/andy-wang-speaking.jpg"
            alt="Andy Wang 在演讲 — SAREC 创始人"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 70vw"
            filterIntensity="none"
            className={styles.heroImage}
          />
        </div>
        <div className={styles.heroText}>
          <span className={styles.heroEyebrow}>FOUNDER · 创始人</span>
          <h1 className={styles.heroH1}>
            <span className={revealClass}>Andy</span>
            <span className={revealClass}>Wang</span>
          </h1>
          <p className={styles.heroTitle}>
            SAREC 创始人 · 跨境地产投资人
            <br />
            Sino-American Real Estate Chamber
          </p>
          <p className={styles.heroTagline}>
            一个经历过中国地产完整周期、
            <br />
            懂项目、懂资金、懂结构、懂人性,
            <br />
            来到美国后没有复制旧模式,
            <br />
            而是重新学习美国规则、
            <br />
            整合本地开发商和跨境房地产合作的长期主义操盘者。
          </p>
          <div className={styles.heroCtaRow}>
            <Link href="/zh/contact" className={styles.heroCtaPrimary}>
              预约与 Andy 对话
            </Link>
            <Link href="/zh/research" className={styles.heroCtaSecondary}>
              阅读研究文章
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
