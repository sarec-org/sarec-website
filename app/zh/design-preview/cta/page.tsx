import type { Metadata } from 'next';
import {
  RiskReviewCTA,
  ProjectGrowthCTA,
  AiSearchAuditCTA,
  DownloadGuideCTA,
  ContactGeneralCTA,
  type CtaPosition
} from '@/components/cta';
import type { Locale } from '@/lib/i18n/types';
import styles from './page.module.css';

// 临时预览页:noindex、不进导航、不进 sitemap(仅本地 + 截图验收)
export const metadata: Metadata = {
  title: 'CTA 系统预览(内部)',
  robots: { index: false, follow: false }
};

type CtaComponent = (p: { position?: CtaPosition; locale?: Locale }) => JSX.Element;

const CTAS: { name: string; note: string; C: CtaComponent }[] = [
  {
    name: '① RiskReviewCTA · 入口 1 风险初诊',
    note: '漏斗核心 · gold / primary / full · 视觉权重最高 · 每个内容页底部默认',
    C: RiskReviewCTA
  },
  {
    name: '② ProjectGrowthCTA · 入口 2 项目方增长',
    note: '合规敏感 · gold / medium(中等权重,不与入口1同级;配色 gold→navy 待 Andy 确认)· 文案须过中英禁词 + 人工复读',
    C: ProjectGrowthCTA
  },
  {
    name: '③ AiSearchAuditCTA · 入口 3 专业机构(副线)',
    note: '明显降权 · neutral / muted(描边 + 紧凑)',
    C: AiSearchAuditCTA
  },
  {
    name: '④ DownloadGuideCTA · Lead Magnet 资料下载',
    note: 'neutral / muted · /zh/resources 为阶段②/③ 落地(占位路由)',
    C: DownloadGuideCTA
  },
  {
    name: '⑤ ContactGeneralCTA · 通用兜底',
    note: 'neutral / muted · 非漏斗页',
    C: ContactGeneralCTA
  }
];

export default function CtaPreviewPage() {
  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>SAREC · 实施方案 D 节 · M1 验收预览(双语)</p>
        <h1 className={styles.h1}>统一 CTA 系统 · 5 组件 × 3 变体 × 中英双语</h1>
        <p className={styles.lead}>
          每个 CTA 展示 <code>full</code> / <code>inline</code> / <code>card</code> 三变体,且
          <strong>中文(ZH)与英文(EN preview)并排</strong>,用于验收双语对象完整性。生产端只渲染{' '}
          <code>.zh</code>,英文仅本预览页用 <code>locale=&quot;en&quot;</code> 渲染。单一事实源:{' '}
          <code>lib/cta/registry.ts</code>。<strong>文案均为草案</strong>,终稿走 Final Copy Deck +
          合规复核(入口 2 须过 <code>lib/compliance/forbiddenWords.ts</code> 中英禁词 + 战略 Claude 人工复读)。
        </p>
      </div>

      {CTAS.map(({ name, note, C }) => (
        <section key={name} className={styles.group}>
          <div className={styles.groupHead}>
            <h2 className={styles.groupName}>{name}</h2>
            <p className={styles.groupNote}>{note}</p>
          </div>

          {/* full —— 整宽 banner:zh 与 en 上下排列(全宽 break-out 无法并排) */}
          <div className={styles.variantLabel}>full · 中文 ZH</div>
          <C position="full" locale="zh" />
          <div className={`${styles.variantLabel} ${styles.enLabel}`}>full · 英文 EN preview</div>
          <C position="full" locale="en" />

          {/* inline —— zh | en 并排 */}
          <div className={styles.variantLabel}>inline · 中文 ZH / 英文 EN preview 并排</div>
          <div className={styles.pair}>
            <div className={styles.pairCol}>
              <span className={styles.langTag}>ZH</span>
              <C position="inline" locale="zh" />
            </div>
            <div className={styles.pairCol}>
              <span className={`${styles.langTag} ${styles.enTag}`}>EN</span>
              <C position="inline" locale="en" />
            </div>
          </div>

          {/* card —— zh | en 并排 */}
          <div className={styles.variantLabel}>card · 中文 ZH / 英文 EN preview 并排</div>
          <div className={styles.pair}>
            <div className={styles.pairCol}>
              <span className={styles.langTag}>ZH</span>
              <C position="card" locale="zh" />
            </div>
            <div className={styles.pairCol}>
              <span className={`${styles.langTag} ${styles.enTag}`}>EN</span>
              <C position="card" locale="en" />
            </div>
          </div>
        </section>
      ))}

      <div className={styles.foot}>— CTA 预览结束 · M1 双语 ·(仅内部验收,noindex)—</div>
    </main>
  );
}
