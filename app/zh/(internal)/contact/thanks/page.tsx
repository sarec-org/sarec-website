import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import styles from '../contact.module.css';

export const metadata: Metadata = {
  ...createPageMetadata({
    title: '已收到你的提交｜SAREC 中美房地产商会',
    description:
      'SAREC 团队会在 1 个工作日内回复（美国西部时间）。回复将通过你提交的邮箱发送，或通过你提供的微信 / WhatsApp 联系。',
    path: '/zh/contact/thanks'
  }),
  robots: { index: false, follow: false }
};

const timeline = [
  '01  SAREC 团队在 1 个工作日内回复',
  '02  根据你的需求安排 30 分钟沟通',
  '03  30 分钟通话 —— 双向判断',
  '04  匹配则深入合作，不匹配也告诉你'
];

const exploreLinks = [
  {
    code: '01',
    title: '阅读 SAREC 研究中心',
    body: '了解 SAREC 对美国房地产市场的深度判断。',
    href: '/zh/research'
  },
  {
    code: '02',
    title: '了解 SAREC 完整服务入口',
    body: '理解 SAREC 服务入口 —— 商会、项目咨询与结构设计、合作结构设计。',
    href: '/zh/services'
  },
  {
    code: '03',
    title: '了解创始人 Andy Wang',
    body: '了解 SAREC 创始人 Andy Wang 的背景、判断方法论和长期主义。',
    href: '/zh/about/founder'
  }
];

export default function ThanksPage() {
  return (
    <main className={styles.page}>
      {/* TK01 / 确认提交 */}
      <section className={styles.thanksHero}>
        <div className={styles.thanksHeroInner}>
          <span className={styles.eyebrow}>SUBMITTED · 已收到</span>
          <h1 className={styles.h1}>谢谢，已收到你的提交</h1>
          <p className={styles.lead}>
            SAREC 团队会在 1 个工作日内回复（美国西部时间）。
          </p>
          <p className={styles.lead}>
            回复将通过你提交的邮箱发送，或通过你提供的微信 / WhatsApp 联系。
          </p>
        </div>
      </section>

      {/* TK02 / 接下来会发生什么 */}
      <section className={`${styles.section} ${styles.sectionDeep}`}>
        <div className={styles.containerNarrow}>
          <span className={styles.eyebrow}>WHAT&apos;S NEXT · 接下来会发生什么</span>
          <h2 className={styles.h2}>接下来会发生什么</h2>
          <ul className={styles.thanksTimeline}>
            {timeline.map((line) => {
              const [num, ...rest] = line.split(/\s{2,}/);
              return (
                <li key={line} className={styles.thanksTimelineItem}>
                  <span className={styles.thanksTimelineNumber}>{num}</span>
                  <p className={styles.thanksTimelineText}>{rest.join(' ')}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* TK03 / 在等待回复期间 */}
      <section className={styles.section}>
        <div className={styles.containerNarrow}>
          <span className={styles.eyebrow}>WHILE YOU WAIT · 在等待回复期间</span>
          <h2 className={styles.h2}>在等待回复期间</h2>
          <div className={styles.thanksLinks}>
            {exploreLinks.map((it) => (
              <Link key={it.code} href={it.href} className={styles.thanksLink}>
                <span className={styles.thanksLinkCode}>{it.code} /</span>
                <span className={styles.thanksLinkTitle}>{it.title}</span>
                <span className={styles.thanksLinkBody}>{it.body}</span>
              </Link>
            ))}
          </div>

          {/* TK04 / Footer 链接(由 SiteFooter 全局接管,本处加一行邮箱提示) */}
          <p className={styles.thanksFooterNote}>
            如有疑问，可联系{' '}
            <a href="mailto:info@sinoamericanrec.org">info@sinoamericanrec.org</a>
          </p>
        </div>
      </section>
    </main>
  );
}
