import styles from './AssetBreak.module.css';

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE ?? '';

// 与 SaVideo / HeroV3B / ArticleHero 同款媒体路径解析:
// 空 MEDIA_BASE → 回退本地 /public/videos;有 MEDIA_BASE → 剥 /videos/ 前缀拼 R2(桶扁平根)。
// 仅用于视频 source;poster 走 /images(仓库内),保持原样不解析。
function resolveMediaUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (!MEDIA_BASE) return path;
  const stripped = path.startsWith('/videos/')
    ? path.replace(/^\/videos\//, '/')
    : path.startsWith('/')
      ? path
      : `/${path}`;
  return `${MEDIA_BASE}${stripped}`;
}

/**
 * AssetBreak v7 — 30/70 左文字 + 右视频满铺
 */
export type AssetBreakProps = {
  videoSrc: string;
  videoPoster: string;
  caption?: string;
  leftEyebrow?: string;
  leftTitle?: string;
  leftBody?: string;
};

export function AssetBreak({
  videoSrc,
  videoPoster,
  leftEyebrow,
  leftTitle,
  leftBody
}: AssetBreakProps) {
  return (
    <section className={styles.section}>
      <div className={styles.leftSide}>
        {leftEyebrow ? <p className={styles.eyebrow}>{leftEyebrow}</p> : null}
        {leftTitle ? <h2 className={styles.title}>{leftTitle}</h2> : null}
        {leftBody ? <p className={styles.body}>{leftBody}</p> : null}
      </div>

      <div className={styles.videoWrap} aria-hidden="true">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={videoPoster}
        >
          <source src={resolveMediaUrl(videoSrc)} type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
