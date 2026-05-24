import styles from './AssetBreak.module.css';

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
          <source src={videoSrc} type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
