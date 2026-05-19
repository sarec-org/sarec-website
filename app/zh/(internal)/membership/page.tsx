import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import styles from './membership.module.css';

export const metadata: Metadata = createPageMetadata({
  title: '会员服务｜SAREC 中美房地产商会',
  description:
    'SAREC 会员是商会层服务的入口。通过会员,系统接触美国房地产研究、培训、活动、考察和专业服务伙伴网络,逐步进入更深层的咨询、撮合与项目合作。',
  path: '/zh/membership'
});

export default function MembershipPage() {
  return (
    <main>
      {/* M01 Hero — Editorial Split 文字版变体(无图无视频,简洁机构感 + 双圆嵌套商会 SVG 印章)*/}
      <section className={styles.heroSection}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>MEMBERSHIP · 会员</span>
          <h1 className={styles.heroH1}>
            <span className={styles.heroRevealLine}>加入 SAREC 会员</span>
          </h1>
          <p className={styles.heroLead}>
            SAREC 会员是商会层服务的入口。通过会员,你可以系统接触美国房地产研究、培训、活动、考察和专业服务伙伴网络,并逐步进入更深层的咨询、撮合与项目合作。
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              申请加入会员
            </Link>
            <Link href="#benefits" className={styles.ctaSecondary}>
              查看会员权益
            </Link>
          </div>
        </div>

        <div className={styles.heroSealWrap} aria-hidden="true">
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <path id="sealTopArc" d="M 60 200 A 140 140 0 0 1 340 200" fill="none" />
              <path id="sealBottomArc" d="M 340 200 A 140 140 0 0 1 60 200" fill="none" />
            </defs>

            {/* 双圆嵌套 */}
            <circle
              cx="200"
              cy="200"
              r="195"
              fill="none"
              style={{ stroke: 'var(--gold)' }}
              strokeWidth="1.5"
            />
            <circle
              cx="200"
              cy="200"
              r="160"
              fill="none"
              style={{ stroke: 'var(--gold)' }}
              strokeWidth="1"
            />

            {/* 外圈拉丁文(沿圆周)*/}
            <text style={{ fill: 'var(--gold)', fontFamily: 'var(--mono)', letterSpacing: '0.4em' }} fontSize="13">
              <textPath href="#sealTopArc" startOffset="50%" textAnchor="middle">
                SINO-AMERICAN REAL ESTATE CHAMBER
              </textPath>
            </text>
            <text style={{ fill: 'var(--gold)', fontFamily: 'var(--mono)', letterSpacing: '0.4em' }} fontSize="13">
              <textPath href="#sealBottomArc" startOffset="50%" textAnchor="middle">
                EST · LOS ANGELES
              </textPath>
            </text>

            {/* 中线分隔 */}
            <line
              x1="80"
              y1="200"
              x2="320"
              y2="200"
              style={{ stroke: 'var(--gold-dim)' }}
              strokeWidth="0.5"
            />

            {/* 中心 SAREC 标识 */}
            <text
              x="200"
              y="195"
              style={{ fill: 'var(--gold)', fontFamily: 'var(--serif-zh)', letterSpacing: '0.1em' }}
              fontSize="48"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="alphabetic"
            >
              SAREC
            </text>

            {/* 中线下方:CORPORATE SEAL(替换原 EST · 2024)*/}
            <text
              x="200"
              y="225"
              style={{ fill: 'var(--gold-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.3em' }}
              fontSize="11"
              textAnchor="middle"
            >
              CORPORATE SEAL
            </text>
          </svg>
        </div>
      </section>

      {/* M02 - M06 placeholder — 批次 2 / 批次 3 实施 */}
      <section className={styles.placeholderSection}>
        <div className={styles.placeholderInner}>
          <p className={styles.placeholderText}>
            M02 - M06 区块将在批次 2 / 批次 3 实施。当前为临时 placeholder。
          </p>
        </div>
      </section>

      {/* M07 Conversion Panel — 3 CTA(1 主 + 2 副) */}
      <section className={styles.ctaBannerSection}>
        <div className={styles.ctaBannerInner}>
          <h2 className={styles.ctaBannerH2}>准备好加入 SAREC 会员了吗</h2>
          <p className={styles.ctaBannerLead}>
            不是单纯付费访问内容,而是进入一个长期合作和资源对接的网络。
          </p>
          <div className={styles.ctaBannerGroup}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              申请加入会员
            </Link>
            <div className={styles.ctaBannerSecondaryRow}>
              <Link href="/zh/services" className={styles.ctaSecondary}>
                查看完整服务架构
              </Link>
              <Link href="/zh/contact" className={styles.ctaSecondary}>
                预约 30 分钟沟通
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
