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
