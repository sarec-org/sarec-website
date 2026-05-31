import Link from 'next/link';
import styles from './HeroV5.module.css';

/**
 * HeroV5 — 正式首页视频 Hero(feature/v5-apply)
 * 移植 design-preview/sarec-v5 的视频 Hero 做法:la-hero-main.mp4
 * (muted autoplay loop playsInline)+ poster 兜底 + 单层 scrim。
 *
 * ⚠ 文案逐字沿用原 HeroV3B(util / nav / H1 / sub / CTA / 数据条),一字未改,仅改呈现。
 * ⚠ HeroV3B.tsx / .module.css 原样保留(未删未改),改回 import 即可回滚。
 * ⚠ 媒体走本地路径(/videos、/images);线上媒体后续单独处理(public/videos 被 .gitignore)。
 */
export function HeroV5() {
  return (
    <section className={styles.hero}>
      {/* 媒体层:poster 永远兜底,视频加载不出也不会黑屏 */}
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
      <div className={styles.scrim} />

      {/* Top utility bar */}
      <div className={styles.utilBar}>
        <div className={styles.utilLeft}>
          <span>
            <span className={styles.liveDot} />
            Los Angeles · est. 2024
          </span>
          <span>Sino-American Real Estate Chamber</span>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <Link href="/zh" className={styles.brand}>
          <span className={styles.mark}>SAREC</span>
          <span className={styles.brandSub}>中美房地产商会</span>
        </Link>
        <ul className={styles.navMenu}>
          <li><Link href="/zh/about">关于</Link></li>
          <li><Link href="/zh/services">服务</Link></li>
          <li><Link href="/zh/projects">项目</Link></li>
          <li><Link href="/zh/research">研究</Link></li>
          <li><Link href="/zh/membership">会员</Link></li>
          <li><Link href="/zh/events">活动</Link></li>
        </ul>
        <Link href="/zh/contact" className={styles.navCta}>
          联系我们
        </Link>
      </nav>

      {/* Centered content */}
      <div className={`${styles.content} ${styles.fade}`}>
        <p className={styles.eyebrow}>Cross-Border Real Estate Capital &amp; Project Platform</p>
        <h1 className={styles.h1}>
          <span className={styles.row}>
            连接中美<span className={styles.accent}>资本</span>
          </span>
          <span className={styles.row}>
            重构房地产项目<span className={styles.accent}>协作</span>
          </span>
        </h1>
        <p className={styles.sub}>
          SAREC 围绕 <strong>项目判断、结构设计、风险控制与资源协同</strong>
          ，帮助中国资本、美国项目方和专业服务机构建立更高效的跨境合作路径。
        </p>
        <div className={styles.ctaRow}>
          <Link href="/zh/contact" className={styles.ctaPrimary}>
            <span>预约 30 分钟沟通</span>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
              <path d="M1 6h15m0 0L11 1m5 5L11 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
            </svg>
          </Link>
          <Link href="/zh/about" className={styles.ctaGhost}>
            了解 SAREC
          </Link>
        </div>
      </div>

      {/* Bottom stats strip(文案逐字沿用) */}
      <div className={styles.bottomStrip}>
        <div className={styles.tsCell}>
          <div className={styles.tsNum}>28<small>YEARS</small></div>
          <div className={styles.tsLbl}>Real Estate<br />Experience</div>
        </div>
        <div className={styles.tsCell}>
          <div className={styles.tsNum}>15<small>YEARS</small></div>
          <div className={styles.tsLbl}>Finance &amp;<br />Investment</div>
        </div>
        <div className={styles.tsCell}>
          <div className={styles.tsNum}>LA<small>·</small></div>
          <div className={styles.tsLbl}>Los Angeles<br />Market</div>
        </div>
        <div className={styles.tsCell}>
          <div className={styles.tsNum}>CN<small>×</small>US</div>
          <div className={styles.tsLbl}>Cross-Border<br />Capital</div>
        </div>
        <div className={`${styles.tsCell} ${styles.scrollHint}`}>
          <span>Scroll</span>
          <div className={styles.scrollLine} />
        </div>
      </div>
    </section>
  );
}
