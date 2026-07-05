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
 * 【逐级叠加模型】：每档只存「本档新增」权益（addedBenefits）；某档「完整权益」=
 * 程序化累加所有 ≤ 本档的 addedBenefits（见 tierFullBenefits）——不手工复制四份清单。
 * /zh/join 紧凑卡取本档 core 新增（coreAddedBenefits，4-6 条，高亮「本档新增」）；
 * /zh/membership 阶梯式展示 addedBenefits + 累计完整权益；对比表由 tierFullBenefits 派生。
 * 【改权益只改这里一处。】
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
  /** 本档【新增】权益（仅新增,不含下级）；完整权益由 tierFullBenefits 累加派生。 */
  addedBenefits: TierBenefit[];
};

/** 可在线购买的四档普通会员 slug（有序,战略合作伙伴与仅邀请的 svp 均不在内）。 */
export const MEMBERSHIP_CARD_SLUGS = ['member', 'board', 'exec_board', 'vp'] as const;
export type MembershipCardSlug = (typeof MEMBERSHIP_CARD_SLUGS)[number];

export const MEMBERSHIP_TIER_CONTENT: Record<MembershipCardSlug, MembershipTierContent> = {
  member: {
    positioningZh: '适合个人会员、行业从业者、投资人、地产相关服务人员。',
    focusZh: '入门档：身份、活动、资讯、社群,不含企业曝光与上台权益。',
    addedBenefits: [
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
    addedBenefits: [
      { text: '可使用「SAREC 理事单位」身份展示', core: true },
      { text: '列入企业 / 单位会员名录', core: true },
      { text: '官网企业展示板块展示公司名称、Logo、简介', core: true, reviewGated: true },
      { text: 'SAREC 活动优先报名、优先通知', core: true },
      { text: '年会基础名单 / Logo 露出', core: true, reviewGated: true },
      { text: '内容投稿 / 项目动态经审核后发布或转发', core: true, reviewGated: true },
      { text: '可申请进入 SAREC 会员资源协同网络', reviewGated: true }
    ]
  },
  exec_board: {
    positioningZh: '适合希望获得更多曝光、活动资源和企业展示机会的企业。',
    focusZh: '重点展示、展架、上台申请、牌匾、内容合作、协同优先。',
    addedBenefits: [
      { text: '可使用「SAREC 常务理事单位」身份展示', core: true },
      { text: '官网更高优先级展示公司、项目或服务', core: true, reviewGated: true },
      { text: '年会更高优先级 Logo / 名称露出', core: true, reviewGated: true },
      { text: '每年可申请 1 次年会或重点活动展架 / 资料展示', core: true, reviewGated: true },
      { text: '可申请在活动中进行企业介绍、主题分享', core: true, reviewGated: true },
      { text: '可获得 SAREC 常务理事单位证书或牌匾', core: true },
      { text: '可参与 SAREC 文章、访谈、活动预告等内容合作', reviewGated: true },
      { text: '在律师、会计、贷款、保险、投资、项目等专业服务协同时享优先级', reviewGated: true }
    ]
  },
  vp: {
    positioningZh: '适合核心企业、重点服务机构、项目方、开发商、金融服务机构。',
    focusZh: '明显强于常务理事:副会长身份、核心展示、视频专访、项目推介、联合活动、私董会优先资格。',
    addedBenefits: [
      { text: '可使用「SAREC 副会长单位」身份展示', core: true },
      { text: '官网核心支持单位板块展示', core: true, reviewGated: true },
      { text: '年会最高优先级 Logo / 名称露出', reviewGated: true },
      { text: '优先申请主题发言、项目介绍', core: true, reviewGated: true },
      { text: '每年可申请 1 次 SAREC YouTube / 视频专访', core: true, reviewGated: true },
      { text: '每年可申请 1–2 次项目 / 服务推介', core: true, reviewGated: true },
      { text: '可优先申请与 SAREC 联合举办沙龙、讲座、闭门会', reviewGated: true },
      { text: '资源协同享高优先级', reviewGated: true },
      {
        text: '如 SAREC 后续推出私董会 / 闭门资源圈,副会长单位可享首批准入优先资格',
        core: true,
        reviewGated: true
      },
      { text: '可获得副会长单位年度合作牌匾或证书' }
    ]
  }
};

/** 会员档整体定位（理事及以上；用于「如何选择」与会员页导语）。 */
export const MEMBERSHIP_OVERVIEW_ZH =
  '会员档以企业身份加入商会,获得会员身份、官网展示、活动露出、内容展示与资源协同 —— 适合经纪团队、项目方、开发商、贷款 / 保险 / 装修 / 材料 / 物业等地产相关企业。';

/** 战略合作伙伴（非会员等级,单独页 /zh/strategic-partners 展示）。 */
export const STRATEGIC_PARTNER_CONTENT: {
  positioningZh: string;
  benefits: TierBenefit[];
} = {
  positioningZh:
    '战略合作伙伴不是会员等级,而是面向 SAREC 全体会员提供专业服务的机构与赞助合作方,重点是服务生态位、联合内容、联合活动与品牌合作 —— 适合律所、会计师事务所、保险经纪、贷款机构、财富管理、产权 / 托管 / 1031 等交易服务、建筑 / 装修 / 设计 / 材料 / 物业、开发商及其他专业服务机构。',
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

/** 「如何选择」引导（会员档 vs 战略合作伙伴；两页共用,单一源）。 */
export const HOW_TO_CHOOSE = {
  memberPath: '想以企业身份加入商会、获得会员身份与曝光 → 选会员档。',
  partnerPath: '想面向 SAREC 会员群体提供专业服务、做联合内容与活动 → 选战略合作伙伴。',
  bothNote: '两者可兼得;合作伙伴身份不等于会员等级。'
};

/** 全站统一合规脚注（展示 / 发言 / 推介 / 专访 / 联合活动 / 资源协同类权益）。 */
export const COMPLIANCE_FOOTNOTE =
  '以上展示、发言、推介、专访、联合活动及资源协同权益,须经 SAREC 审核、排期及内容标准确认。SAREC 不承诺客户数量、成交结果、融资结果、投资收益、业务收入或固定客户来源。';

/** 本档【新增】权益。 */
export function tierAddedBenefits(slug: MembershipCardSlug): TierBenefit[] {
  return MEMBERSHIP_TIER_CONTENT[slug].addedBenefits;
}

/** 本档 core 新增权益（/zh/join 卡片高亮,最多 6 条）。 */
export function coreAddedBenefits(slug: MembershipCardSlug): TierBenefit[] {
  return MEMBERSHIP_TIER_CONTENT[slug].addedBenefits.filter((b) => b.core).slice(0, 6);
}

export type DerivedBenefit = TierBenefit & { addedAt: MembershipCardSlug };

/** 本档【完整】权益 = 累加所有 ≤ 本档的 addedBenefits（逐级叠加派生,不手工复制）。 */
export function tierFullBenefits(slug: MembershipCardSlug): DerivedBenefit[] {
  const idx = MEMBERSHIP_CARD_SLUGS.indexOf(slug);
  const out: DerivedBenefit[] = [];
  for (let i = 0; i <= idx; i++) {
    const s = MEMBERSHIP_CARD_SLUGS[i];
    for (const b of MEMBERSHIP_TIER_CONTENT[s].addedBenefits) out.push({ ...b, addedAt: s });
  }
  return out;
}

/** 下一级更低档 slug（用于「已包含 X 全部权益」的次要说明；member 无下级返回 null）。 */
export function previousCardSlug(slug: MembershipCardSlug): MembershipCardSlug | null {
  const idx = MEMBERSHIP_CARD_SLUGS.indexOf(slug);
  return idx > 0 ? MEMBERSHIP_CARD_SLUGS[idx - 1] : null;
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
