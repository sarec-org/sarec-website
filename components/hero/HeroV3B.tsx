/**
 * Hero v3-B Final · SAREC Visual Constitution
 * Source of truth: _handoff_to_claude/hero_v3b_final.html
 *
 * REQUIRED ASSETS:
 *   - /public/videos/la-hero-main.mp4
 *
 * REQUIRED FONTS (loaded via app/layout.tsx):
 *   - Cormorant Garamond
 *   - Noto Serif SC
 *   - Inter Tight
 *   - JetBrains Mono
 *
 * REQUIRED CSS:
 *   - app/globals.css (CSS variables + keyframes)
 *   - components/hero/HeroV3B.module.css (Hero-specific styles)
 *
 * If any required asset is missing, the Hero will render in a degraded state.
 * DO NOT add silent fallbacks. Missing assets must be loud.
 */

import Link from 'next/link';
import styles from './HeroV3B.module.css';

const cx = (...keys: Array<string | false | null | undefined>) =>
  keys
    .filter(Boolean)
    .map((k) => styles[k as string])
    .filter(Boolean)
    .join(' ');

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE ?? '';

function resolveMediaUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (!MEDIA_BASE) return path;
  // R2 bucket is flat at root — strip /videos/ prefix when present
  const stripped = path.startsWith('/videos/')
    ? path.replace(/^\/videos\//, '/')
    : (path.startsWith('/') ? path : `/${path}`);
  return `${MEDIA_BASE}${stripped}`;
}

export function HeroV3B() {
  return (
    <section className={styles.hero}>
      {/* Layer 0: VIDEO */}
      <div className={styles['video-bg']}>
        <video autoPlay muted loop playsInline preload="auto">
          <source src={resolveMediaUrl('/videos/la-hero-main.mp4')} type="video/mp4" />
          Your browser does not support video.
        </video>
      </div>

      {/* Layer 1: 分区遮罩 */}
      <div className={styles['video-overlay']} />

      {/* Layer 2: Grid */}
      <div className={styles['grid-layer']} />

      {/* Layer 3: Grain */}
      <div className={styles['grain-layer']} />

      {/* Layer 4: Map */}
      <div className={styles['map-stage']}>
        <svg
          viewBox="0 0 1920 1080"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="cnGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(201,165,103,0.18)" />
              <stop offset="100%" stopColor="rgba(201,165,103,0)" />
            </radialGradient>
            <radialGradient id="laGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(245,220,160,0.22)" />
              <stop offset="100%" stopColor="rgba(245,220,160,0)" />
            </radialGradient>
          </defs>

          {/* Meridians */}
          <g>
            <line className={styles.meridian} x1="0" y1="200" x2="1920" y2="200" />
            <line className={styles.meridian} x1="0" y1="400" x2="1920" y2="400" />
            <line className={cx('meridian', 'major')} x1="0" y1="540" x2="1920" y2="540" />
            <line className={styles.meridian} x1="0" y1="680" x2="1920" y2="680" />
            <line className={styles.meridian} x1="0" y1="880" x2="1920" y2="880" />
            <line className={styles.meridian} x1="240" y1="0" x2="240" y2="1080" />
            <line className={styles.meridian} x1="480" y1="0" x2="480" y2="1080" />
            <line className={styles.meridian} x1="720" y1="0" x2="720" y2="1080" />
            <line className={cx('meridian', 'major')} x1="960" y1="0" x2="960" y2="1080" />
            <line className={styles.meridian} x1="1200" y1="0" x2="1200" y2="1080" />
            <line className={styles.meridian} x1="1440" y1="0" x2="1440" y2="1080" />
            <line className={styles.meridian} x1="1680" y1="0" x2="1680" y2="1080" />
          </g>

          {/* Glow orbs */}
          <ellipse className={styles['city-glow']} cx="320" cy="600" rx="160" ry="160" fill="url(#laGlow)" />
          <ellipse
            className={cx('city-glow', 'delayed')}
            cx="1500"
            cy="490"
            rx="180"
            ry="180"
            fill="url(#cnGlow)"
          />

          {/* US continent */}
          <g className={styles.continent}>
            <path d="M 235 320 Q 215 350 222 400 L 230 460 Q 245 525 275 575 Q 305 625 345 660 Q 395 690 460 700 Q 530 705 600 695 L 660 660 Q 695 620 698 570 Q 695 510 678 460 Q 660 415 645 380 Q 625 340 605 320 Q 530 305 460 305 Q 380 305 320 308 Q 270 313 235 320 Z" />
            <path d="M 660 660 Q 675 700 680 740 Q 678 760 665 770 Q 650 760 645 730 Q 645 700 660 660 Z" />
          </g>

          {/* China continent */}
          <g className={cx('continent', 'china')}>
            <path d="M 1290 360 Q 1340 330 1410 325 Q 1490 320 1570 340 Q 1640 365 1685 425 Q 1715 490 1700 560 Q 1670 625 1610 660 Q 1530 685 1450 680 Q 1370 670 1320 635 Q 1265 590 1255 525 Q 1245 455 1270 405 Q 1280 380 1290 360 Z" />
          </g>

          {/* Flow lines */}
          <path className={cx('flow', 'thick')} d="M 1500 490 Q 1000 220 320 600" />
          <path
            className={cx('flow', 'thick')}
            d="M 1530 530 Q 1100 800 320 600"
            style={{ animationDelay: '-15s' }}
          />
          <path
            className={styles.flow}
            d="M 1450 440 Q 900 260 380 540"
            style={{ animationDelay: '-25s' }}
          />
          <path
            className={styles.flow}
            d="M 1480 480 Q 1100 350 640 430"
            style={{ animationDelay: '-10s' }}
          />
          <path
            className={styles.flow}
            d="M 1610 510 Q 1150 270 640 430"
            style={{ animationDelay: '-35s' }}
          />
          <path
            className={cx('flow', 'thin')}
            d="M 1500 490 Q 980 380 525 460"
            style={{ animationDelay: '-5s' }}
          />
          <path
            className={cx('flow', 'thin')}
            d="M 1520 540 Q 1100 700 540 580"
            style={{ animationDelay: '-20s' }}
          />

          {/* Los Angeles - MAJOR */}
          <g>
            <circle className={styles['city-pulse']} cx="320" cy="600" r="6" />
            <circle className={cx('city-pulse', 'layer-2')} cx="320" cy="600" r="6" />
            <circle className={cx('city-dot', 'major')} cx="320" cy="600" r="6" />
            <text className={cx('city-label', 'major')} x="340" y="595">
              LOS ANGELES
            </text>
            <text className={styles['city-coord']} x="340" y="612">
              34.05° N · 118.24° W
            </text>
          </g>

          {/* San Francisco */}
          <g>
            <circle className={styles['city-dot']} cx="265" cy="500" r="3.5" />
            <text className={styles['city-label']} x="278" y="498">
              SAN FRANCISCO
            </text>
          </g>

          {/* New York */}
          <g>
            <circle
              className={styles['city-pulse']}
              cx="640"
              cy="430"
              r="5"
              style={{ animationDelay: '-2.5s' }}
            />
            <circle className={styles['city-dot']} cx="640" cy="430" r="4" />
            <text className={styles['city-label']} x="654" y="428">
              NEW YORK
            </text>
            <text className={styles['city-coord']} x="654" y="442">
              40.71° N · 74.00° W
            </text>
          </g>

          {/* Beijing */}
          <g>
            <circle
              className={styles['city-pulse']}
              cx="1500"
              cy="430"
              r="5"
              style={{ animationDelay: '-3.5s' }}
            />
            <circle className={styles['city-dot']} cx="1500" cy="430" r="4" />
            <text className={styles['city-label']} x="1514" y="428">
              BEIJING
            </text>
          </g>

          {/* Shanghai - MAJOR */}
          <g>
            <circle className={styles['city-pulse']} cx="1610" cy="510" r="6" />
            <circle className={cx('city-pulse', 'layer-2')} cx="1610" cy="510" r="6" />
            <circle className={cx('city-dot', 'major')} cx="1610" cy="510" r="5.5" />
            <text className={cx('city-label', 'major')} x="1628" y="508">
              SHANGHAI
            </text>
            <text className={styles['city-coord']} x="1628" y="524">
              31.23° N · 121.47° E
            </text>
          </g>

          {/* Hong Kong */}
          <g>
            <circle className={styles['city-dot']} cx="1545" cy="660" r="3.5" />
            <text className={styles['city-label']} x="1559" y="668">
              HONG KONG
            </text>
          </g>

          {/* Minor cities */}
          <g>
            <circle className={cx('city-dot', 'minor')} cx="285" cy="370" r="2.5" />
            <text className={cx('city-label', 'minor')} x="296" y="368">
              SEATTLE
            </text>
          </g>
          <g>
            <circle className={cx('city-dot', 'minor')} cx="1075" cy="365" r="2.2" />
            <text className={cx('city-label', 'minor')} x="1086" y="363">
              LONDON
            </text>
          </g>
          <g>
            <circle className={cx('city-dot', 'minor')} cx="1215" cy="510" r="2.2" />
            <text className={cx('city-label', 'minor')} x="1226" y="508">
              DUBAI
            </text>
          </g>
          <g>
            <circle className={cx('city-dot', 'minor')} cx="1755" cy="510" r="2.5" />
            <text className={cx('city-label', 'minor')} x="1766" y="508">
              TOKYO
            </text>
          </g>
          <g>
            <circle className={cx('city-dot', 'minor')} cx="1530" cy="780" r="2.2" />
            <text className={cx('city-label', 'minor')} x="1541" y="778">
              SINGAPORE
            </text>
          </g>
        </svg>
      </div>

      {/* Layer 5: Radar */}
      <div className={styles.radar} />

      {/* Layer 6: Vignette */}
      <div className={styles.vignette} />

      {/* Layer 7: Particles */}
      <div className={styles.particles}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={styles.particle} />
        ))}
      </div>

      {/* Top utility bar */}
      <div className={styles['util-bar']}>
        <div className={styles.left}>
          <span>
            <span className={styles['live-dot']} />
            Los Angeles · est. 2024
          </span>
          <span>Sino-American Real Estate Chamber</span>
        </div>
        <div className={styles.right} />
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <Link href="/zh" className={styles.brand}>
          <span className={styles.mark}>SAREC</span>
          <span className={styles.sub}>中美房地产商会</span>
        </Link>
        <ul className={styles['nav-menu']}>
          <li>
            <Link href="/zh/about">关于</Link>
          </li>
          <li>
            <Link href="/zh/services">服务</Link>
          </li>
          <li>
            <Link href="/zh/projects">项目</Link>
          </li>
          <li>
            <Link href="/zh/research">研究</Link>
          </li>
          <li>
            <Link href="/zh/membership">会员</Link>
          </li>
          <li>
            <Link href="/zh/events">活动</Link>
          </li>
        </ul>
        <Link href="/zh/contact" className={styles['nav-cta']}>
          联系我们
        </Link>
      </nav>

      {/* Side marks */}
      <div className={cx('side-mark', 'left')}>SAREC · MMXXIV</div>
      <div className={cx('side-mark', 'right')}>N 34.05° · W 118.24°</div>

      {/* Centered content */}
      <div className={styles['hero-content']}>
        <div className={styles.eyebrow}>
          <span>Cross-Border Real Estate Capital &amp; Project Platform</span>
        </div>

        <h1 className={styles.h1}>
          <span className={styles.row}>
            <span>
              连接中美<span className={styles.accent}>资本</span>
            </span>
          </span>
          <span className={styles.row}>
            <span>
              重构房地产项目
              <span className={styles['underline-wrap']}>协作</span>
            </span>
          </span>
        </h1>

        <p className={styles.sub}>
          SAREC 围绕 <strong>项目判断、结构设计、风险控制与资源协同</strong>
          ，帮助中国资本、美国项目方和专业服务机构建立更高效的跨境合作路径。
        </p>

        <div className={styles['cta-row']}>
          <Link href="/zh/contact" className={styles['cta-primary']}>
            <span>预约 30 分钟沟通</span>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <path
                d="M1 6h15m0 0L11 1m5 5L11 11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="square"
              />
            </svg>
          </Link>
          <Link href="/zh/about" className={styles['cta-ghost']}>
            了解 SAREC
          </Link>
        </div>
      </div>

      {/* Bottom strip */}
      <div className={styles['bottom-strip']}>
        <div className={styles['bottom-strip-inner']}>
          <div className={styles['ts-cell']}>
            <div className={styles['ts-num']}>
              28<small>YEARS</small>
            </div>
            <div className={styles['ts-lbl']}>
              Real Estate
              <br />
              Experience
            </div>
          </div>
          <div className={styles['ts-cell']}>
            <div className={styles['ts-num']}>
              15<small>YEARS</small>
            </div>
            <div className={styles['ts-lbl']}>
              Finance &amp;
              <br />
              Investment
            </div>
          </div>
          <div className={styles['ts-cell']}>
            <div className={styles['ts-num']}>
              LA<small>·</small>
            </div>
            <div className={styles['ts-lbl']}>
              Los Angeles
              <br />
              Market
            </div>
          </div>
          <div className={styles['ts-cell']}>
            <div className={styles['ts-num']}>
              CN<small>×</small>US
            </div>
            <div className={styles['ts-lbl']}>
              Cross-Border
              <br />
              Capital
            </div>
          </div>
          <div className={cx('ts-cell', 'scroll-hint')}>
            <span>Scroll</span>
            <div className={styles['scroll-line']} />
          </div>
        </div>
      </div>
    </section>
  );
}
