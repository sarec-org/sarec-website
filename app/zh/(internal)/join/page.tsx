import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import {
  listMembershipTiers,
  formatCents,
  MEMBERSHIP_CARD_SLUGS,
  getStrategicPartnerTier,
  PROMOTION_DISCLAIMER,
  COMPLIANCE_FOOTNOTE,
  MEMBERSHIP_OVERVIEW_ZH,
  HOW_TO_CHOOSE
} from '@/lib/membership/tiers';
import { JoinForm } from '@/components/membership/JoinForm';
import { TierCard } from '@/components/membership/TierCard';
import styles from '@/components/membership/membership.module.css';

export const metadata: Metadata = createPageMetadata({
  title: '加入 SAREC｜在线入会申请',
  description:
    'SAREC 中美房地产商会在线入会申请：会员 $200、理事单位 $500、常务理事单位 $1,000、副会长单位 $3,000。2026 年度推广价限时开放。',
  path: '/zh/join'
});

// 价格与权益均来自唯一数据源 lib/membership/tiers.ts（页面不硬编码价格或权益文案）。
export default function JoinPage() {
  const tiers = listMembershipTiers();
  const sp = getStrategicPartnerTier();
  const formTiers = tiers
    .filter((t) => t.isActive)
    .map((t) => ({
      slug: t.slug,
      nameZh: t.nameZh,
      currentPriceLabel: formatCents(t.currentPriceCents)
    }));

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <p className={styles.eyebrow}>MEMBERSHIP · 在线入会</p>
      <h1 className={styles.h1}>加入 SAREC 中美房地产商会</h1>
      <p className={styles.lead}>{MEMBERSHIP_OVERVIEW_ZH}</p>

      {/* Launch Rate 免责说明 —— 紧贴价格卡上方，复用价格源既有定稿（中文） */}
      <div className={styles.promoNote}>
        <p>{PROMOTION_DISCLAIMER.zh}</p>
      </div>

      <h2 className={styles.sectionH2}>四档会员 · 2026 Launch Rate</h2>
      <p className={styles.gridHint}>
        每档分两块逐条列出:【已包含权益】(下级各档全部)与【本档新增 / 升级重点】。
      </p>
      <div className={styles.tierGridJoin}>
        {MEMBERSHIP_CARD_SLUGS.map((slug) => (
          <TierCard key={slug} slug={slug} variant="compact" />
        ))}
      </div>

      <p className={styles.reviewNote}>
        完整说明与四档对比见 <Link href="/zh/membership">会员权益说明</Link>。＊ {COMPLIANCE_FOOTNOTE}
      </p>

      {/* 如何选择：会员档 vs 战略合作伙伴 */}
      <div className={styles.chooseBlock}>
        <h2 className={styles.chooseH2}>如何选择</h2>
        <ul className={styles.chooseList}>
          <li>{HOW_TO_CHOOSE.memberPath}</li>
          <li>{HOW_TO_CHOOSE.partnerPath}</li>
        </ul>
        <p className={styles.chooseNote}>{HOW_TO_CHOOSE.bothNote}</p>
      </div>

      {/* 战略合作伙伴明显入口（非普通会员层级） */}
      <div className={styles.partnerCallout}>
        <div>
          <h2 className={styles.partnerCalloutH2}>战略合作伙伴</h2>
          <p className={styles.partnerCalloutBody}>
            面向为 SAREC 会员群体提供专业服务的机构与赞助合作方。
            {sp &&
              `${formatCents(sp.currentPriceCents)} / 年，或 ${formatCents(
                sp.firstPaymentAmountCents ?? 0
              )} + ${formatCents(sp.secondPaymentAmountCents ?? 0)} 半年两期。`}
          </p>
        </div>
        <Link href="/zh/strategic-partners" className={styles.btnLink}>
          了解战略合作伙伴 →
        </Link>
      </div>

      <h2 className={styles.sectionH2} id="apply">
        在线申请
      </h2>
      <JoinForm tiers={formTiers} />

      <p className={styles.reviewNote}>付款由 Stripe 安全处理。</p>
    </div>
  );
}
