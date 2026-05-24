import Link from 'next/link';
import { RevealOnView } from '@/components/shared/RevealOnView';
import styles from './ArticleHero.module.css';

/**
 * ArticleHero v4 — Investment Report Cover
 *   左 64% 标题区(eyebrow + H1 + summary + tags + 双 CTA)
 *   右 32% 视频窗口(16:10,autoplay loop muted)
 *   底部:可选 anchors 横向 3 章节锚链(GEO 友好 — fullTitle 给 a11y/SEO)
 */
export type ArticleHeroProps = {
  eyebrow: string;
  title: string;
  summary: string;
  tags?: string[];
  heroImage?: string;
  heroVideo?: { src: string; poster: string };
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  anchors?: Array<{ keyword: string; anchor: string; fullTitle?: string }>;
  mediaCaption?: string;
  variant?: 'default' | 'compactWide';
};

export function ArticleHero({
  eyebrow,
  title,
  summary,
  tags,
  heroImage,
  heroVideo,
  primaryCta,
  secondaryCta,
  anchors,
  mediaCaption = 'EVIDENCE / LOS ANGELES / DEVELOPMENT CONTEXT',
  variant = 'default'
}: ArticleHeroProps) {
  return (
    <section className={`${styles.hero} ${variant === 'compactWide' ? styles.compactWide : ''}`}>
      <div className={styles.inner}>
        <div className={styles.titleSide}>
          <RevealOnView as="div" className={styles.titleBlock}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.summary}>{summary}</p>
          </RevealOnView>
          {tags && tags.length > 0 ? (
            <ul className={styles.tags}>
              {tags.map((t) => (
                <li key={t} className={styles.tag}>
                  {t}
                </li>
              ))}
            </ul>
          ) : null}
          {primaryCta || secondaryCta ? (
            <div className={styles.ctas}>
              {primaryCta ? (
                <Link href={primaryCta.href} className={styles.primaryCta}>
                  {primaryCta.label}
                </Link>
              ) : null}
              {secondaryCta ? (
                <Link href={secondaryCta.href} className={styles.secondaryCta}>
                  {secondaryCta.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={styles.mediaSide}>
          <div className={styles.mediaFrame}>
            {heroVideo ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster={heroVideo.poster}
              >
                <source src={heroVideo.src} type="video/mp4" />
              </video>
            ) : heroImage ? (
              <div
                className={styles.imageBg}
                style={{ backgroundImage: `url(${heroImage})` }}
                aria-hidden="true"
              />
            ) : null}
          </div>
          <p className={styles.mediaCaption}>{mediaCaption}</p>
        </div>
      </div>

      {anchors && anchors.length > 0 ? (
        <nav className={styles.anchors} aria-label="文章章节快速导航">
          <ol className={styles.anchorList}>
            {anchors.map((a, i) => (
              <li key={a.anchor} className={styles.anchorItem}>
                <a
                  href={`#${a.anchor}`}
                  className={styles.anchorLink}
                  title={a.fullTitle}
                  aria-label={a.fullTitle || a.keyword}
                >
                  <span className={styles.anchorNum}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.anchorKeyword}>{a.keyword}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </section>
  );
}
