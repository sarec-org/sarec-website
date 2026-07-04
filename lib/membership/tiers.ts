/**
 * SAREC 档位 seed —— 定价单一真源（Gate 2 M1）
 * ------------------------------------------------------------------
 * ⚠️ 本文件是档位定价的权威来源。db/seed/0001_membership_tiers.sql 是它的 SQL 镜像，
 *    改价必须同时改这两处（M1 手工同步纪律，见 docs/membership/README.md）。
 * 价格一律 integer cents（$200 = 20000）。展示层再 formatCents() 成美元。
 * svp 仅预留：isActive = false，V1 不开放购买、前台不默认展示为可购买档位。
 * 页面/checkout 未来一律读 DB membership_tiers（信任 DB 定价，不信客户端传价）；
 * 本 TS 常量供类型安全的 seed / 校验 / 静态引用。
 */
import type { MembershipTierSeed } from './types';
import { PROMOTION_LABEL_2026 } from './types';

export const MEMBERSHIP_TIERS: MembershipTierSeed[] = [
  {
    slug: 'member',
    category: 'membership',
    nameZh: '会员',
    nameEn: 'Member',
    standardPriceCents: 20000, // $200
    currentPriceCents: 20000, // $200（无推广价）
    currency: 'usd',
    promotionLabel: null,
    isPromotionActive: false,
    stripeProductName: 'SAREC Member',
    membershipTermMonths: 12,
    supportsSemiAnnual: false,
    firstPaymentAmountCents: null,
    secondPaymentAmountCents: null,
    isActive: true, // V1 开放购买，走量 / 名录 / 社会证明
    sortOrder: 10
  },
  {
    slug: 'board',
    category: 'membership',
    nameZh: '理事单位',
    nameEn: 'Board Member Organization',
    standardPriceCents: 100000, // $1,000
    currentPriceCents: 50000, // $500 2026 Launch Rate
    currency: 'usd',
    promotionLabel: PROMOTION_LABEL_2026,
    isPromotionActive: true,
    stripeProductName: 'SAREC Board Member Organization',
    membershipTermMonths: 12,
    supportsSemiAnnual: false,
    firstPaymentAmountCents: null,
    secondPaymentAmountCents: null,
    isActive: true,
    sortOrder: 20
  },
  {
    slug: 'exec_board',
    category: 'membership',
    nameZh: '常务理事单位',
    nameEn: 'Executive Board Member Organization',
    standardPriceCents: 200000, // $2,000
    currentPriceCents: 100000, // $1,000 2026 Launch Rate
    currency: 'usd',
    promotionLabel: PROMOTION_LABEL_2026,
    isPromotionActive: true,
    stripeProductName: 'SAREC Executive Board Member Organization',
    membershipTermMonths: 12,
    supportsSemiAnnual: false,
    firstPaymentAmountCents: null,
    secondPaymentAmountCents: null,
    isActive: true,
    sortOrder: 30
  },
  {
    slug: 'vp',
    category: 'membership',
    nameZh: '副会长单位',
    nameEn: 'Vice President Organization',
    standardPriceCents: 600000, // $6,000
    currentPriceCents: 300000, // $3,000 2026 Launch Rate
    currency: 'usd',
    promotionLabel: PROMOTION_LABEL_2026,
    isPromotionActive: true,
    stripeProductName: 'SAREC Vice President Organization',
    membershipTermMonths: 12,
    supportsSemiAnnual: false,
    firstPaymentAmountCents: null,
    secondPaymentAmountCents: null,
    isActive: true,
    sortOrder: 40
  },
  {
    slug: 'svp',
    category: 'membership',
    nameZh: '常务副会长单位',
    nameEn: 'Senior Vice President Organization',
    standardPriceCents: 0, // 仅预留
    currentPriceCents: 0,
    currency: 'usd',
    promotionLabel: null,
    isPromotionActive: false,
    stripeProductName: 'SAREC Senior Vice President Organization',
    membershipTermMonths: 12,
    supportsSemiAnnual: false,
    firstPaymentAmountCents: null,
    secondPaymentAmountCents: null,
    isActive: false, // V1 不开放购买；前台占位或不展示
    sortOrder: 50
  },
  {
    slug: 'strategic_partner',
    category: 'strategic_partner',
    nameZh: '战略合作伙伴',
    nameEn: 'Strategic Partner',
    standardPriceCents: 600000, // $6,000
    currentPriceCents: 600000, // $6,000（无推广价）
    currency: 'usd',
    promotionLabel: null,
    isPromotionActive: false,
    stripeProductName: 'SAREC Strategic Partner',
    membershipTermMonths: 12,
    supportsSemiAnnual: true, // annual 一次性 / semiAnnual 分两期
    firstPaymentAmountCents: 300000, // semiAnnual 首期 $3,000
    secondPaymentAmountCents: 300000, // semiAnnual 第二期 $3,000（人工跟进，非自动扣款）
    isActive: true,
    sortOrder: 60
  }
];

/** 便捷查询：按 slug 取档位（未来运行时应以 DB 为准，本函数仅供静态校验/测试）。 */
export function getTierSeed(slug: string): MembershipTierSeed | undefined {
  return MEMBERSHIP_TIERS.find((t) => t.slug === slug);
}
