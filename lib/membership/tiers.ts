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

/** ────────────────────────────────────────────────────────────
 * 会员权益 —— 单一数据源（内容，非价格；不进 seed）。
 * /zh/join 紧凑卡取 core=true 的 4-6 条；/zh/membership 展示完整列表 + 对比表由此派生。
 * 【改权益只改这里一处，两页不各存一份。】
 * reviewGated=true = 展示 / 发言 / 推介 / 专访 / 联合 / 协同 / 私董会类，带合规脚注（＊）。
 * 措辞安全线：一律「可 / 可申请 / 优先申请 / 经审核与排期后安排」，绝不写「保证获得 /
 * 一定安排 / 每年享有 / 必得 / 固定提供」。私董会须写成「后续如推出…可享首批准入优先资格」。
 * ──────────────────────────────────────────────────────────── */
export type TierBenefit = { text: string; core?: boolean; reviewGated?: boolean };

export type MembershipTierContent = {
  /** 适合谁 / 定位 */
  positioningZh: string;
  /** 页面表达重点（一句话） */
  focusZh: string;
  /** 完整权益（单一源）；core 入 /zh/join 卡，reviewGated 带 ＊ */
  benefits: TierBenefit[];
};

/** 可在线购买的四档普通会员 slug（有序，战略合作伙伴与仅邀请的 svp 均不在内）。 */
export const MEMBERSHIP_CARD_SLUGS = ['member', 'board', 'exec_board', 'vp'] as const;
export type MembershipCardSlug = (typeof MEMBERSHIP_CARD_SLUGS)[number];

export const MEMBERSHIP_TIER_CONTENT: Record<MembershipCardSlug, MembershipTierContent> = {
  member: {
    positioningZh: '适合个人会员、行业从业者、投资人、地产相关服务人员。',
    focusZh: '入门会员：重点是身份、活动、资讯、社群。',
    benefits: [
      { text: 'SAREC 年度会员身份', core: true },
      { text: '可列入 SAREC 会员名录', core: true },
      { text: '可参加 SAREC 公开活动、讲座、沙龙', core: true },
      { text: '优先获取 SAREC 市场简报、行业资讯、活动通知', core: true },
      { text: '可加入会员社群或活动通知群', core: true },
      { text: '部分付费活动可享会员优惠价', core: true }
    ]
  },
  board: {
    positioningZh: '适合中小企业、地产经纪团队、贷款、保险、装修、材料、服务商等。',
    focusZh: '正式企业身份、官网露出、活动优先、基础品牌曝光。',
    benefits: [
      { text: '包含会员全部权益', core: true },
      { text: '可使用「SAREC 理事单位」身份展示', core: true },
      { text: '可在官网会员 / 企业展示板块展示公司名称、Logo、简介', core: true, reviewGated: true },
      { text: 'SAREC 活动优先报名、优先通知', core: true },
      { text: '年会或重点活动中可获得基础名单 / Logo 露出', core: true, reviewGated: true },
      { text: '可申请进入 SAREC 会员资源协同网络', core: true, reviewGated: true },
      { text: '可提交行业观点、项目动态，经审核后发布或转发', reviewGated: true }
    ]
  },
  exec_board: {
    positioningZh: '适合希望在商会中获得更多曝光、活动资源和企业展示机会的企业。',
    focusZh: '重点展示、展架、上台申请、牌匾、内容合作、资源协同优先。',
    benefits: [
      { text: '包含理事单位全部权益', core: true },
      { text: '可使用「SAREC 常务理事单位」身份展示', core: true },
      { text: '可在官网更高优先级展示公司、项目或服务', core: true, reviewGated: true },
      { text: '每年可申请 1 次年会或重点活动展架 / 资料展示机会', core: true, reviewGated: true },
      { text: '可申请在活动中进行企业介绍、主题分享或项目介绍', core: true, reviewGated: true },
      { text: '可获得 SAREC 常务理事单位证书或牌匾', core: true },
      { text: '可参与 SAREC 文章、访谈、活动预告等内容合作', reviewGated: true },
      { text: '在律师、会计、贷款、保险、投资、项目等专业服务协同时享优先级', reviewGated: true }
    ]
  },
  vp: {
    positioningZh:
      '适合核心企业、重点服务机构、项目方、开发商、金融服务机构、希望深度绑定 SAREC 的企业。',
    focusZh: '副会长身份、核心展示、重点露出、视频专访、项目推介、联合活动、私董会优先资格。',
    benefits: [
      { text: '包含常务理事单位全部权益', core: true },
      { text: '可使用「SAREC 副会长单位」身份展示', core: true },
      { text: '在官网副会长单位 / 核心支持单位板块展示', core: true, reviewGated: true },
      { text: '年会或大型活动中获得更高优先级 Logo / 名称露出', reviewGated: true },
      { text: '优先申请主题发言、项目介绍、企业介绍', reviewGated: true },
      { text: '每年可申请 1 次 SAREC YouTube / 视频专访', core: true, reviewGated: true },
      { text: '每年可申请 1–2 次项目或服务推介机会', core: true, reviewGated: true },
      { text: '可优先申请与 SAREC 联合举办专题沙龙、讲座或闭门会', reviewGated: true },
      { text: '在律师、会计、贷款、保险、投资、开发商、经纪等资源协同时享高优先级', reviewGated: true },
      {
        text: '如 SAREC 后续推出私董会 / 闭门资源圈，副会长单位可享首批准入优先资格',
        core: true,
        reviewGated: true
      },
      { text: '可获得副会长单位年度合作牌匾或证书' }
    ]
  }
};

/** 战略合作伙伴（非普通会员层级，单独页 /zh/strategic-partners 展示）。 */
export const STRATEGIC_PARTNER_CONTENT: {
  positioningZh: string;
  benefits: TierBenefit[];
} = {
  positioningZh:
    '适合律师事务所、会计师事务所、保险经纪、贷款公司、券商、财富管理、地产经纪公司、开发商、建筑公司、装修公司、材料商、物业管理、跨境服务机构。',
  benefits: [
    { text: '可使用「SAREC Strategic Partner / 战略合作伙伴」身份' },
    { text: '在官网战略合作伙伴板块展示公司 Logo、简介、服务方向', reviewGated: true },
    { text: '可与 SAREC 联合发布专业文章、市场解读、视频内容', reviewGated: true },
    { text: '可申请参与或联合举办专题讲座、线上分享、线下沙龙', reviewGated: true },
    { text: '可申请进行专业服务、项目或产品推介', reviewGated: true },
    { text: '年会或重点活动中获得战略合作伙伴露出', reviewGated: true },
    { text: '可申请 SAREC 视频访谈或专题内容合作', reviewGated: true },
    { text: '与 SAREC 会员、理事单位、常务理事单位、副会长单位之间进行资源协同', reviewGated: true },
    { text: '可获得战略合作伙伴证书或牌匾' }
  ]
};

/** 全站统一合规脚注（展示 / 发言 / 推介 / 专访 / 联合活动 / 资源协同类权益）。 */
export const COMPLIANCE_FOOTNOTE =
  '以上展示、发言、推介、专访、联合活动及资源协同权益，须经 SAREC 审核、排期及内容标准确认。SAREC 不承诺客户数量、成交结果、融资结果、投资收益、业务收入或固定客户来源。';

/** 取某档核心权益（用于 /zh/join 紧凑卡，最多 6 条）。 */
export function coreBenefits(slug: MembershipCardSlug): TierBenefit[] {
  return MEMBERSHIP_TIER_CONTENT[slug].benefits.filter((b) => b.core).slice(0, 6);
}

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
