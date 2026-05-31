import type { Metadata } from 'next';
import styles from './hero-blue-test.module.css';

/**
 * Hero 蓝色 A/B/C/D 对比预览 — /zh/design-preview/hero-blue-test
 * ⚠ noindex/nofollow,不进 sitemap,不进任何正式索引。
 * ⚠ 仅预览;不改正式首页 /zh、不改 H02–H10、不改 DESIGN_BASELINE_V5、不改 globals.css、不碰 flagship。
 * 同一视频 / poster / 标题 / 副标题 / CTA / 字体 / 布局,仅对比 Hero 背景蓝 + overlay(scrim)。
 */
export const metadata: Metadata = {
  title: 'Hero 蓝色 A/B/C/D 对比(内部 · 勿索引)',
  robots: { index: false, follow: false, nocache: true }
};

const VARIANTS = [
  {
    cls: styles.varA,
    label: 'A · Current Hero',
    spec: [['#0A1730 → #050C18', '当前 HeroV5(--navy-deep → 近黑)'], ['glow rgba(28,52,102,.42)', '顶部藏蓝辉光'], ['scrim rgb(8,20,46)', '当前 overlay']]
  },
  {
    cls: styles.varB,
    label: 'B · V5 Baseline',
    spec: [['#20313A → #17242C', 'DESIGN_BASELINE_V5 深色资产区块'], ['scrim rgb(23,36,44)', '同色 overlay']]
  },
  {
    cls: styles.varC,
    label: 'C · Consulting Page Blue',
    spec: [['#040B16', '咨询撮合页 /zh/services S04 实际主蓝(--ink-deep),原样'], ['scrim rgb(4,11,22)', '同色 overlay']]
  },
  {
    cls: styles.varD,
    label: 'D · Project Page Blue',
    spec: [['#020610', '4136 Rosewood 项目页实际主蓝(--ink-deepest),原样'], ['vignette rgba(2,7,14)', '原页 radial vignette'], ['scrim rgb(2,6,16)', '同色 overlay']]
  }
];

function HeroCard({ cls, label }: { cls: string; label: string }) {
  return (
    <div className={styles.phone}>
      <div className={`${styles.hero} ${cls}`}>
        <video
          className={styles.media}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/images/home/los-angeles-hero.jpg"
          aria-hidden="true"
        >
          <source src="/videos/la-hero-main.mp4" type="video/mp4" />
        </video>
        <div className={styles.glow} />
        <div className={styles.scrim} />

        <p className={styles.eyebrow}>Cross-Border Real Estate Capital &amp; Project Platform</p>
        <h1 className={styles.h1}>
          连接中美<span className={styles.accent}>资本</span>
          <br />重构房地产项目<span className={styles.accent}>协作</span>
        </h1>
        <p className={styles.subline}>
          SAREC 围绕项目判断、结构设计、风险控制与资源协同,帮助中国资本、美国项目方和专业服务机构建立更高效的跨境合作路径。
        </p>
        <div className={styles.ctaRow}>
          <span className={styles.ctaPrimary}>预约 30 分钟沟通</span>
          <span className={styles.ctaGhost}>了解 SAREC</span>
        </div>
      </div>
    </div>
  );
}

export default function HeroBlueTestPage() {
  return (
    <div className={styles.harness}>
      <div className={styles.head}>
        <h1 className={styles.title}>Hero 蓝色对比 · A / B / C / D</h1>
        <p className={styles.sub}>同一视频 · 同一文字 · 同一按钮 · 仅 Hero 背景蓝 + overlay 不同</p>
      </div>
      <div className={styles.banner}>
        <strong>内部预览 · noindex</strong> —— 仅对比 Hero 蓝色,不改正式首页 /zh。每张下方标注实际 hex + 来源。选定 A/B/C/D 后,再只改正式 Hero 的 CSS。
      </div>

      <div className={styles.grid}>
        {VARIANTS.map((v) => (
          <div key={v.label} className={styles.cardWrap}>
            <p className={styles.tag}>{v.label}</p>
            <HeroCard cls={v.cls} label={v.label} />
            <div className={styles.spec}>
              {v.spec.map(([hex, src]) => (
                <div key={hex}>
                  <span className={styles.chip} style={{ background: hex.split(' ')[0].startsWith('#') ? hex.split(' ')[0] : 'transparent' }} />
                  <b>{hex}</b> · {src}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
