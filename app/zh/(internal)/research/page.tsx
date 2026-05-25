import type { Metadata } from 'next';
import Link from 'next/link';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata } from '@/lib/seo';
import styles from './research.module.css';
import { ResearchHero } from './ResearchHero';
import { SubscribeForm } from './SubscribeForm';
import marketStats from '@/public/data/market-stats.json';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 研究中心｜中美房地产商会',
  description:
    '基于真实项目积累的政策与判断研究 — ED1 政策深度、跨境地产法律结构、洛杉矶房地产周期与机会窗口。SAREC 持续发布。',
  path: '/zh/research'
});

type PublishedCard = {
  code: string;
  title: string;
  desc: string;
  author: string;
  href: string;
};

type IndexArticle = {
  code: string;
  title: string;
  desc: string;
  href: string;
};

type IndexCategory = {
  eyebrow: string;
  title: string;
  articles: IndexArticle[];
};

const indexCategories: IndexCategory[] = [
  {
    eyebrow: 'A · MARKET & POLICY',
    title: '市场与政策',
    articles: [
      {
        code: '01',
        title: 'ED1 政策与项目机会深度解读',
        desc: '从政策窗口到真实周期,从资格定义到审批通道 —— ED1 经济适用房项目的完整理解框架。',
        href: '/zh/research/los-angeles-ed1-affordable-housing'
      },
      {
        code: '02',
        title: '美国房地产开发流程',
        desc: '土地、设计、entitlement、审批、施工、运营、退出 —— 一个完整开发周期的关键节点解析。',
        href: '/zh/research/us-real-estate-development-process'
      }
    ]
  },
  {
    eyebrow: 'B · STRUCTURE & METRICS',
    title: '投资结构与指标',
    articles: [
      {
        code: '03',
        title: 'LP / GP 结构与项目合作机制',
        desc: '资金、权力、责任、退出 —— 跨境地产合作中真正决定结果的是结构,不是项目本身。',
        href: '/zh/research/lp-gp-structure'
      },
      {
        code: '04',
        title: 'Cap Rate / IRR / ROE 指标理解',
        desc: '收益指标背后的假设、风险与限制 —— 读懂模型,而不只是数字。',
        href: '/zh/research/cap-rate-irr-roe'
      },
      {
        code: '05',
        title: '跨境房地产投资判断框架',
        desc: '5 个维度构成的实战初判方法 —— 用公开信息完成第一轮筛选,再决定是否深入尽调。',
        href: '/zh/research/framework'
      }
    ]
  },
  {
    eyebrow: 'C · RISK MANAGEMENT',
    title: '风险控制',
    articles: [
      {
        code: '06',
        title: '中国投资人美国房地产常见风险',
        desc: '九类系统性风险,从信息不对称到退出机制 —— 跨境投资人必须看懂的判断框架。',
        href: '/zh/research/chinese-investors-us-real-estate-risks'
      },
      {
        code: '07',
        title: '美国房地产投资风险清单',
        desc: '8 个模块、可直接用于项目初筛的检查清单 —— 把关键问题提前问清楚。',
        href: '/zh/research/risk-checklist'
      },
      {
        code: '08',
        title: '美国房地产投资常见误区',
        desc: '7 类华人投资人最容易踩到的陷阱,每条都来自 SAREC 实战案例背景。',
        href: '/zh/research/investment-pitfalls'
      }
    ]
  },
  {
    eyebrow: 'D · EB-5 & IMMIGRATION',
    title: 'EB-5 / 移民与地产',
    articles: [
      {
        code: '09',
        title: 'EB-5 与美国房地产项目',
        desc: 'EB-5 投资移民全景 —— 政策、金额、排期、流程、风险,与 SAREC 的尽调判断。',
        href: '/zh/research/eb5'
      }
    ]
  }
];

const publishedResearch: PublishedCard[] = [
  {
    code: '01',
    title: 'ED1 政策与项目机会深度解读',
    desc: '从政策窗口到真实周期,从资格定义到审批通道 —— ED1 经济适用房项目的完整理解框架。',
    author: 'SAREC Research',
    href: '/zh/research/los-angeles-ed1-affordable-housing'
  },
  {
    code: '02',
    title: '中美跨境地产合作的法律结构',
    desc: 'LLC / Escrow / Carry / LP-GP —— 跨境地产投资中真正决定成败的是法律结构,不是项目本身。',
    author: 'SAREC Research',
    href: '/zh/research/lp-gp-structure'
  },
  {
    code: '03',
    title: '洛杉矶房地产周期与机会窗口',
    desc: '在长周期市场中识别短期窗口 —— 洛杉矶各区域 2025-2027 年的项目机会和风险清单。',
    author: 'SAREC Research',
    href: '/zh/research/us-real-estate-development-process'
  }
];

export default function ResearchPage() {
  return (
    <main>
      {/* RC01 — Cinematic 全屏视频 Hero */}
      <ResearchHero />

      {/* RC01.5 — 美国市场宏观仪表盘(4 KPI + 双图 + 时间线 + footnote) */}
      <section className={styles.highlightsSection}>
        <div className={styles.highlightsInner}>
          <span className={styles.eyebrow}>MARKET INSIGHTS · 市场洞察</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            美国房地产市场关键数据
          </RevealOnView>
          <p className={styles.sectionLead}>
            SAREC 持续跟踪美国房地产宏观数据与中美跨境投资动态。
          </p>

          {/* 4 KPI 横排 */}
          <div className={styles.kpiRow}>
            {marketStats.kpis.map((kpi) => (
              <div key={kpi.label} className={styles.kpiCard}>
                <span className={styles.kpiNum}>
                  {kpi.value}
                  <sup className={styles.kpiSup}>{kpi.footnoteRef}</sup>
                </span>
                <span className={styles.kpiLabel}>{kpi.label}</span>
              </div>
            ))}
          </div>

          {/* 中间双图 */}
          <div className={styles.dashboardGrid}>
            {/* 左 — 中美跨境投资 */}
            <div className={styles.dashboardCard}>
              <span className={styles.dashboardLabel}>
                {marketStats.crossBorderInvestment.title}
                <sup className={styles.dashboardSup}>
                  {marketStats.crossBorderInvestment.footnoteRef}
                </sup>
              </span>
              <div className={styles.cbiHeroNum}>
                {marketStats.crossBorderInvestment.total}
              </div>
              <p className={styles.cbiSub}>
                {marketStats.crossBorderInvestment.subLabel}
              </p>
              <div className={styles.cbiStats}>
                <div className={styles.cbiStat}>
                  <span className={styles.cbiStatNum}>
                    {marketStats.crossBorderInvestment.units}
                  </span>
                  <span className={styles.cbiStatLabel}>套交易</span>
                </div>
                <div className={styles.cbiStat}>
                  <span className={styles.cbiStatNum}>
                    {marketStats.crossBorderInvestment.californiaShare}
                  </span>
                  <span className={styles.cbiStatLabel}>
                    {marketStats.crossBorderInvestment.californiaShareLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* 右 — LA 住房缺口 */}
            <div className={styles.dashboardCard}>
              <span className={styles.dashboardLabel}>
                {marketStats.laHousingGap.title}
                <sup className={styles.dashboardSup}>
                  {marketStats.laHousingGap.footnoteRef}
                </sup>
              </span>
              <div className={styles.gapRow}>
                <div className={styles.gapItem}>
                  <span className={styles.gapNum}>
                    {marketStats.laHousingGap.target}
                  </span>
                  <span className={styles.gapLabel}>
                    {marketStats.laHousingGap.targetLabel}
                  </span>
                </div>
                <div className={styles.gapDivider} aria-hidden="true">
                  vs
                </div>
                <div className={styles.gapItem}>
                  <span className={styles.gapNum}>
                    {marketStats.laHousingGap.approved}
                  </span>
                  <span className={styles.gapLabel}>
                    {marketStats.laHousingGap.approvedLabel}
                  </span>
                </div>
              </div>
              <div className={styles.gapProgressWrap}>
                <div className={styles.gapProgressTrack}>
                  <div
                    className={styles.gapProgressFill}
                    style={{
                      width: `${marketStats.laHousingGap.completionPercent}%`
                    }}
                  />
                </div>
                <span className={styles.gapProgressLabel}>
                  {marketStats.laHousingGap.completionLabel}
                </span>
              </div>
              <p className={styles.gapSub}>{marketStats.laHousingGap.subLabel}</p>
            </div>
          </div>

          {/* 底部 5 节点时间线 */}
          <div className={styles.timelineSection}>
            <span className={styles.timelineSectionLabel}>
              政策与市场 · 关键时间线
            </span>
            <div className={styles.timelineTrack}>
              {marketStats.timeline.map((node) => (
                <div key={node.date} className={styles.timelineNode}>
                  <span className={styles.timelineDate}>{node.date}</span>
                  <span className={styles.timelineDot} aria-hidden="true" />
                  <div className={styles.timelineCardSmall}>
                    <span className={styles.timelineTitle}>
                      {node.title}
                      {node.footnoteRef ? (
                        <sup className={styles.timelineSup}>
                          {node.footnoteRef}
                        </sup>
                      ) : null}
                    </span>
                    <span className={styles.timelineSubtitle}>
                      {node.subtitle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 数据来源 footnote 块 */}
          <div className={styles.sourcesBlock}>
            <div className={styles.sourcesHeader}>
              <span className={styles.sourcesLabel}>数据来源</span>
              <span className={styles.sourcesUpdated}>
                {marketStats.lastUpdatedLabel}
              </span>
            </div>
            <ol className={styles.sourcesList}>
              {marketStats.footnotes.map((fn) => (
                <li key={fn.id} className={styles.sourcesItem}>
                  <span className={styles.sourcesNum}>{fn.id}</span>
                  <span className={styles.sourcesText}>{fn.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* RC02 — 近期研究方向(3 张已发布卡)*/}
      <section className={styles.publishedSection}>
        <div className={styles.publishedInner}>
          <span className={styles.eyebrow}>PUBLISHED · 已发布研究</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            近期研究方向
          </RevealOnView>
          <div className={styles.publishedGrid}>
            {publishedResearch.map((card) => (
              <article key={card.code} className={styles.publishedCard}>
                <span className={styles.publishedTag}>已发布</span>
                <span className={styles.publishedNum}>{card.code}</span>
                <h3 className={styles.publishedH3}>{card.title}</h3>
                <p className={styles.publishedDesc}>{card.desc}</p>
                <p className={styles.publishedAuthor}>{card.author}</p>
                <Link href={card.href} className={styles.publishedCta}>
                  — 阅读全文 →
                </Link>
              </article>
            ))}
          </div>
          <p className={styles.publishedNote}>更多研究方向陆续发布。</p>
        </div>
      </section>

      {/* RC02.5 — 全部研究索引(4 分类 / 9 篇)*/}
      <section className={styles.indexSection}>
        <div className={styles.indexInner}>
          <span className={styles.eyebrow}>ALL RESEARCH · 全部研究</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            全部研究
          </RevealOnView>
          <p className={styles.sectionLead}>
            围绕美国房地产投资、开发流程、资本结构、风险控制与 EB-5 相关议题,持续沉淀 SAREC 的研究框架与实务观察。
          </p>
          <div className={styles.indexCategories}>
            {indexCategories.map((cat) => (
              <div key={cat.title} className={styles.indexCategory}>
                <div className={styles.indexCategoryHeader}>
                  <span className={styles.indexCategoryEyebrow}>{cat.eyebrow}</span>
                  <h3 className={styles.indexCategoryTitle}>{cat.title}</h3>
                </div>
                <div className={styles.indexCardGrid}>
                  {cat.articles.map((art) => (
                    <Link key={art.code} href={art.href} className={styles.indexCard}>
                      <span className={styles.indexCardNum}>{art.code}</span>
                      <h4 className={styles.indexCardTitle}>{art.title}</h4>
                      <p className={styles.indexCardDesc}>{art.desc}</p>
                      <span className={styles.indexCardCta}>阅读全文 →</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RC03 — 订阅简报 */}
      <section id="subscribe" className={styles.subscribeSection}>
        <div className={styles.subscribeInner}>
          <span className={styles.eyebrow}>SUBSCRIBE · 订阅</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            订阅 SAREC 研究简报
          </RevealOnView>
          <p className={styles.sectionLead}>
            获取首发通知和不定期市场观察。
          </p>
          <SubscribeForm />
        </div>
      </section>

      {/* RC04 — CTA Banner(上下金线 + 2 CTA)*/}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <RevealOnView as="h2" className={styles.ctaH2}>
            想直接和 Andy 聊?
          </RevealOnView>
          <p className={styles.ctaSubtitle}>
            比起读研究文章,
            <br />
            直接对话有时更有效。
          </p>
          <div className={styles.ctaRow}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              预约与 Andy 对话
            </Link>
            <Link href="/zh/about" className={styles.ctaSecondary}>
              了解 SAREC
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
