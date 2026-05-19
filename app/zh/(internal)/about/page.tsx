import type { Metadata } from 'next';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import { createPageMetadata } from '@/lib/seo';
import styles from './about.module.css';
import { ManifestoSection } from './ManifestoSection';

export const metadata: Metadata = createPageMetadata({
  title: '关于 SAREC｜中美房地产商会',
  description:
    'SAREC 是跨境地产平台,围绕真实项目、长期合作和投资人视角,连接中美房地产资本与项目资源。',
  path: '/zh/about'
});

const whoLayers = [
  {
    code: '01',
    title: '商会层',
    body: '通过会员服务建立长期连接中美房地产相关客户的网络。'
  },
  {
    code: '02',
    title: '咨询撮合层',
    body: '提供项目尽调、财务建模、结构设计、风险评估,用投资人视角帮助客户判断项目。'
  },
  {
    code: '03',
    title: '项目共投层',
    body: '在符合 SAREC 参与标准的项目共投场景下,团队与客户共同出资,利益一致、风险共担。'
  }
];

const proofPoints = [
  {
    code: '01',
    title: (
      <>
        信息多但<span className={styles.proofAccent}>判断</span>少
      </>
    ),
    body: '培训供给充足,但具体项目的判断、风险识别、结构评估稀缺。'
  },
  {
    code: '02',
    title: (
      <>
        中介多但<span className={styles.proofAccent}>结构把控</span>少
      </>
    ),
    body: '撮合服务多,但持续的尽调、风控、合作落地很少。'
  },
  {
    code: '03',
    title: (
      <>
        项目多但<span className={styles.proofAccent}>风险识别</span>少
      </>
    ),
    body: '大量项目方等钱,但能从投资人视角识别真伪、风险的人少。'
  },
  {
    code: '04',
    title: (
      <>
        专业服务多但<span className={styles.proofAccent}>整合</span>缺失
      </>
    ),
    body: '法律 / 税务 / 移民 / 保险各自为战,缺少地产为核心的整合协调。'
  }
];

const differentiators = [
  {
    code: '01',
    title: '先判断项目,再谈合作',
    body: '培训和展会都围绕真实项目,不做基础卖课。'
  },
  {
    code: '02',
    title: '撮合只是入口',
    body: '真正的价值在于尽调、结构设计、风险评估、过程监督。'
  },
  {
    code: '03',
    title: '项目共投,但不做施工开发',
    body: 'SAREC 不作为施工主体,不设资金池,只设计法律结构和对齐投资人利益。'
  },
  {
    code: '04',
    title: '只服务能承担风险的客户',
    body: 'SAREC 不服务"想短期套利"的客户,寻找能看懂项目、能承担风险、想长期合作的投资人。'
  }
];

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
            aria-label="一个跨境地产平台,不是一个地产中介。"
          >
            <span className={styles.heroRevealLine}>一个跨境地产平台,</span>
            <span className={styles.heroRevealLine}>不是一个地产中介。</span>
          </h1>
          <p className={styles.heroLead}>
            SAREC 由实操背景出身的跨境地产团队推动,围绕真实项目、长期合作和投资人视角,连接中美房地产资本与项目资源。
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              <span>预约 30 分钟沟通</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/zh/services" className={styles.ctaSecondary}>
              <span>查看服务架构</span>
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
              <h2 className={styles.h2}>SAREC 是三层平台</h2>
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
            <h2 className={styles.h2}>客户为什么需要我们</h2>
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
                src="/images/projects/4155-wilshire-bronson.webp"
                alt="4155 Wilshire 项目实物 — SAREC 差异化"
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
            <h2 className={styles.h2}>4 件让 SAREC 不一样的事</h2>
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
              <p className={styles.founderRole}>SAREC 创始人 · 跨境地产投资人</p>
              <p className={styles.founderBody}>
                SAREC 由长期房地产投资、项目操盘与跨境合作实践者推动。
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
              <span>查看服务架构</span>
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
