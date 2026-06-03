import Link from 'next/link';
import { SaImage, SectionChapterMark } from '@/components/shared';
import { CTA_REGISTRY } from '@/lib/cta/registry';
import { localize } from '@/lib/i18n/types';
import styles from './S01HeroSpread.module.css';

/**
 * S01 Services Hero — magazine spread (image left 60%, text right 40%).
 * Replaces the InternalHero call on /zh/services. Copy is verbatim from
 * the prior S01 InternalHero props.
 */
export function S01HeroSpread() {
  const risk = CTA_REGISTRY['risk-review'];
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
              中美房地产项目判断与增长服务
            </h1>

            <p className={styles.sub}>
              面向投资人、项目方与专业服务机构,SAREC 以项目判断、内容资产与 AI 搜索可见度,帮助跨境房地产合作更清晰、更稳健地推进。
            </p>

            <div className={styles.ctaGroup}>
              <Link href={risk.primary.route.zh} className={styles.ctaPrimary}>
                {localize(risk.primary.label)}
              </Link>
              <Link href="#service-entries" className={styles.ctaSecondary}>
                查看三类服务
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
