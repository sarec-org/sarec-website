import type { Metadata } from 'next';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import { createPageMetadata } from '@/lib/seo';
import styles from './about.module.css';
import { ManifestoSection } from './ManifestoSection';
import { aboutCopy } from '@/lib/sitePagesCopy';

export const metadata: Metadata = createPageMetadata({
  title: '关于 SAREC｜中美房地产商会',
  description:
    'SAREC 是跨境地产平台,围绕真实项目、长期合作和投资人视角,连接中美房地产资本与项目资源。',
  path: '/zh/about'
});

const { whoLayers, differentiators } = aboutCopy;
const proofPoints = aboutCopy.proofPoints.map((p) => ({
  ...p,
  title: (
    <>
      {p.title[0]}
      <span className={styles.proofAccent}>{p.title[1]}</span>
      {p.title[2]}
    </>
  )
}));

export default function AboutPage() {
  return (
    <main className={styles.page}>
      {/* A01 Hero — Cinematic Hero(全屏大图 + 横向漂移大字,VISUAL_SPEC v1.2 §5.1 + v1.2.1 §6 巨型 Serif 白名单)*/}
      <section className={styles.heroSection}>
        <div className={styles.heroImageFrame}>
          <div className={styles.heroImageMotion}>
            <SaImage
              src="/images/home/los-angeles-hero.jpg"
              alt="Los Angeles skyline — SAREC 关于页"
              fill
              priority
              sizes="100vw"
              filterIntensity="none"
            />
          </div>
        </div>
        <div className={styles.heroBottomGradient} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={`${styles.eyebrow} ${styles.heroEyebrow}`}>ABOUT · 关于</span>
          <h1
            className={styles.heroH1}
            aria-label={aboutCopy.hero.title}
          >
            <span className={styles.heroRevealLine}>{aboutCopy.hero.lines[0]}</span>
            <span className={styles.heroRevealLine}>{aboutCopy.hero.lines[1]}</span>
          </h1>
          <p className={styles.heroLead}>
            {aboutCopy.hero.lead}
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              <span>预约 30 分钟沟通</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/zh/services" className={styles.ctaSecondary}>
              <span>查看服务入口</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* A02 我们是谁 — Editorial Split(无图变体,40/60)*/}
      <section className={`${styles.section} ${styles.sectionDeep}`}>
        <div className={styles.container}>
          <div className={`${styles.splitGrid} ${styles.whoGrid}`}>
            <div className={styles.whoTextCol}>
              <span className={styles.eyebrow}>WHO WE ARE · 我们是谁</span>
              <h2 className={styles.h2}>{aboutCopy.whoTitle}</h2>
            </div>
            <ol className={styles.whoList}>
              {whoLayers.map((layer) => (
                <li key={layer.code} className={styles.whoItem}>
                  <p className={styles.whoItemCode}>{layer.code} /</p>
                  <h3 className={styles.whoItemTitle}>{layer.title}</h3>
                  <p className={styles.whoItemBody}>{layer.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* A03 为什么需要 SAREC — Proof Grid 2x2(无图)*/}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.proofHead}>
            <span className={styles.eyebrow}>WHY SAREC · 为什么需要 SAREC</span>
            <h2 className={styles.h2}>{aboutCopy.proofTitle}</h2>
          </div>
          <div className={styles.proofGrid}>
            {proofPoints.map((p) => (
              <article key={p.code} className={styles.proofCard}>
                <p className={styles.proofCode}>{p.code}</p>
                <h3 className={styles.proofTitle}>{p.title}</h3>
                <p className={styles.proofBody}>{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* A04 SAREC 的差异化 — Editorial Split(图字反向,55/45,左图右字)*/}
      <section className={`${styles.section} ${styles.sectionFull} ${styles.sectionDeep}`}>
        <div className={styles.diffGrid}>
          <div className={styles.diffImageBox}>
            <div className={styles.diffImageMotion}>
              <SaImage
                src="/images/projects/4136-rosewood-rendering.png"
                alt="4136 Rosewood 项目效果图 — 创始人参与项目（不属于商会项目）"
                fill
                sizes="(max-width: 768px) 100vw, 55vw"
                filterIntensity="none"
                className={styles.diffImage}
              />
            </div>
          </div>
          <div className={styles.diffTextBox}>
            <span className={styles.eyebrow}>
              WHAT MAKES SAREC DIFFERENT · 我们的不同
            </span>
            <h2 className={styles.h2}>{aboutCopy.diffTitle}</h2>
            <ol className={styles.diffList}>
              {differentiators.map((d) => (
                <li key={d.code} className={styles.diffItem}>
                  <p className={styles.diffItemCode}>{d.code} /</p>
                  <div>
                    <h3 className={styles.diffItemTitle}>{d.title}</h3>
                    <p className={styles.diffItemBody}>{d.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* A05 方法论金句屏 — Manifesto Screen(client component:IntersectionObserver 触发 Blackstone reveal)*/}
      <ManifestoSection />

      {/* A06 创始人入口 — 文字 CTA Bar(无照片)*/}
      <section className={`${styles.section} ${styles.sectionDeep} ${styles.founderSection}`}>
        <div className={styles.container}>
          <div className={styles.founderBar}>
            <div className={styles.founderText}>
              <span className={styles.eyebrow}>FOUNDER · 创始人</span>
              <h3 className={styles.founderName}>Andy Wang</h3>
              <p className={styles.founderRole}>{aboutCopy.founder.role}</p>
              <p className={styles.founderBody}>
                {aboutCopy.founder.body}
              </p>
            </div>
            <Link href="/zh/about/founder" className={styles.ctaSecondary}>
              <span>阅读完整创始人背景</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* A07 CTA Banner — Conversion Panel(0 图)*/}
      <section className={`${styles.section} ${styles.ctaBannerSection}`}>
        <div className={styles.containerNarrow}>
          <span className={styles.eyebrow}>BEGIN · 开始合作</span>
          <h2 className={styles.h2}>想进一步了解 SAREC?</h2>
          <p className={styles.lead}>
            预约 30 分钟沟通,我们一起判断 SAREC 是不是合适的合作方。
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              <span>预约 30 分钟沟通</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/zh/services" className={styles.ctaSecondary}>
              <span>查看服务入口</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
