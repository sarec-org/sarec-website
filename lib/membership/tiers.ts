/**
 * SAREC 档位 —— 唯一价格源（single source of truth）。
 * ------------------------------------------------------------------
 * 价格数字只存在于 lib/membership/tiers.data.json（本文件的底层数据）。
 * - 页面从本文件读取档位 / 价格 / promotion label / 权益摘要（typed）。
 * - seed 由 scripts/generate-tier-seed.mjs 读取同一份 tiers.data.json 生成
 *   db/seed/0001_membership_tiers.sql（不手写第二份价格）。
 * - 未来 Stripe 也从这里取价，绝不第三处手写。
 * 改价只改 tiers.data.json 一处，再 `node scripts/generate-tier-seed.mjs` 重生成 seed。
 * 价格一律 integer cents（$200 = 20000）；展示层用 formatCents() 格式化。
 */
import tiersData from './tiers.data.json';
import type { MembershipTierSeed } from './types';

// JSON 导入被 TS 推断为宽化标量（string/number），此处收敛为强类型。
export const MEMBERSHIP_TIERS = tiersData as unknown as MembershipTierSeed[];

export function getTierSeed(slug: string): MembershipTierSeed | undefined {
  return MEMBERSHIP_TIERS.find((t) => t.slug === slug);
}

export const MEMBERSHIP_TIER_SLUGS = ['member', 'board', 'exec_board', 'vp', 'svp'] as const;
export const STRATEGIC_PARTNER_SLUG = 'strategic_partner';

/** 会员档位（category = 'membership'），按 sortOrder 排列。 */
export function listMembershipTiers(): MembershipTierSeed[] {
  return MEMBERSHIP_TIERS.filter((t) => t.category === 'membership').sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export function getStrategicPartnerTier(): MembershipTierSeed | undefined {
  return getTierSeed(STRATEGIC_PARTNER_SLUG);
}

/** cents → "$1,000"（整数美元展示；本项目档位金额均为整数美元）。 */
export function formatCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

/** 推广价说明（双语，页面直接引用）。 */
export const PROMOTION_DISCLAIMER = {
  en: 'The 2026 Launch Rate is available for a limited time and may be modified or discontinued by SAREC at any time. Confirmed paid memberships will retain the rate shown at checkout for the applicable membership term.',
  zh: '2026 年度推广价为限时优惠，SAREC 可根据实际情况随时调整或结束。已完成付款的会员，按付款时页面显示价格执行当前会员年度权益。'
};

/** 展示 / 宣传类权益统一限制语（双语）。 */
export const SAREC_REVIEW_NOTE = {
  en: 'Subject to SAREC review, scheduling, and editorial standards.',
  zh: '须经 SAREC 审核、排期及内容标准确认。'
};

/** 权益摘要（内容，非价格；仅页面用，不进 seed）。gated=true 的条目带 SAREC review 限制。 */
export type TierBenefit = { text: string; gated?: boolean };
export type TierBenefitBlock = { taglineZh: string; benefits: TierBenefit[] };

export const TIER_BENEFITS: Record<string, TierBenefitBlock> = {
  member: {
    taglineZh: '在场 —— 加入 SAREC 会员网络，形成社会证明。',
    benefits: [
      { text: '列入 SAREC 会员名录' },
      { text: '线下 / 线上活动参与权' },
      { text: '公开研究与市场简报优先获取' },
      { text: '会员社群参与' }
    ]
  },
  board: {
    taglineZh: '企业露出 —— 官网展示位 + 活动优先。',
    benefits: [
      { text: '包含「会员」全部权益' },
      { text: '官网会员企业展示位', gated: true },
      { text: '活动优先报名' },
      { text: '每年 1 次企业推荐机会', gated: true }
    ]
  },
  exec_board: {
    taglineZh: '项目露出 —— 项目展示 + 发言与内容合作。',
    benefits: [
      { text: '包含「理事单位」全部权益' },
      { text: '会员项目展示位', gated: true },
      { text: '年度活动发言申请权', gated: true },
      { text: '内容合作机会', gated: true }
    ]
  },
  vp: {
    taglineZh: '领导层露出 —— 主动推介、专访与优先资源协同。',
    benefits: [
      { text: '包含「常务理事单位」全部权益' },
      { text: '领导层 / 副会长展示', gated: true },
      { text: '主题分享 / 专访 / 视频内容机会', gated: true },
      { text: '项目推介机会', gated: true },
      { text: '优先资源协同', gated: true }
    ]
  },
  svp: {
    taglineZh: '常务副会长单位 —— 仅限邀请（By invitation）。',
    benefits: [{ text: '仅限邀请，V1 不开放在线购买。' }]
  },
  strategic_partner: {
    taglineZh: '战略层合作 —— 深度资源协同、联合内容与活动。',
    benefits: [
      { text: '深度资源协同机会', gated: true },
      { text: '联合内容与活动合作机会', gated: true },
      { text: '官网优先展示', gated: true },
      { text: '项目 / 主题推介机会', gated: true }
    ]
  }
};

/** 战略合作伙伴行业分类。 */
export const STRATEGIC_PARTNER_INDUSTRIES: string[] = [
  '保险',
  '律师',
  '会计',
  '贷款',
  '地产经纪',
  '建筑 / 装修',
  '材料商',
  '券商 / 财富管理',
  '开发商',
  '项目方',
  '其他专业服务'
];
