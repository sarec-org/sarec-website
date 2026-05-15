import Link from 'next/link';
import { SaImage, SectionChapterMark } from '@/components/shared';
import styles from './S01HeroSpread.module.css';

/**
 * S01 Services Hero — magazine spread (image left 60%, text right 40%).
 * Replaces the InternalHero call on /zh/services. Copy is verbatim from
 * the prior S01 InternalHero props.
 */
export function S01HeroSpread() {
  return (
    <section
      className={styles.heroSpread}
      aria-labelledby="services-hero-h1"
    >
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.imageColumn}>
            <div className={styles.imageWrapper}>
              <SaImage
                src="/images/artgrid/services-hero-la-city.jpg"
                alt="Los Angeles 城市景观 — SAREC 跨境地产资本服务区域"
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 60vw"
                filterIntensity="editorial"
              />
            </div>
            <p className={styles.imageCaption}>
              [ LOS ANGELES · 美国地产语境 ]
            </p>
          </div>

          <div className={styles.textColumn}>
            <SectionChapterMark number="01" />

            <p className={styles.eyebrow}>SERVICES · 服务架构</p>

            <h1 id="services-hero-h1" className={styles.h1}>
              三层服务架构
            </h1>

            <p className={styles.sub}>
              SAREC 围绕项目判断、结构设计、风险控制与资源协同，
              <br />
              按客户参与深度分为三层：
              <br />
              商会 · 咨询撮合 · 共投。
            </p>

            <div className={styles.ctaGroup}>
              <Link href="/zh/contact" className={styles.ctaPrimary}>
                预约 30 分钟沟通
              </Link>
              <Link href="/zh/membership" className={styles.ctaSecondary}>
                查看会员服务
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
