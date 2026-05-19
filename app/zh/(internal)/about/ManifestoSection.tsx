import styles from './about.module.css';

/**
 * A05 Manifesto Screen — Blackstone 巨型文字横向无限循环 marquee
 *
 * 视觉:full-bleed 100vw 黑底,巨型 Serif 单行文字水平复制 3 份,
 * 持续向左 marquee(linear infinite)。无 reveal / opacity / clip-path,
 * 纯 transform marquee 循环。
 *
 * Server component(纯 CSS 动画,不需要 IntersectionObserver)。
 */
const MANIFESTO_TEXT =
  '跨境房地产合作的核心,不是信息差,而是判断力、结构能力和长期信任。';

export function ManifestoSection() {
  return (
    <section className={styles.manifestoSection}>
      <div className={styles.manifestoInner}>
        <span className={styles.eyebrow}>METHODOLOGY · 方法论</span>
      </div>

      <div
        className={styles.manifestoMarquee}
        role="figure"
        aria-label={`${MANIFESTO_TEXT} — Andy Wang,SAREC 创始人(详见下方 Founder 段落)`}
      >
        <div className={styles.manifestoMarqueeTrack} aria-hidden="true">
          <span>{MANIFESTO_TEXT}</span>
          <span>{MANIFESTO_TEXT}</span>
          <span>{MANIFESTO_TEXT}</span>
        </div>
      </div>
    </section>
  );
}
