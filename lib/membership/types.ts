/**
 * SAREC 会员 / 战略合作伙伴 V1 —— 共享类型与状态枚举（Gate 2 M1）
 * ------------------------------------------------------------------
 * 单一真源，供未来 API / 页面 / seed 复用，避免 stringly-typed 漂移。
 * 与 db/migrations/0001_membership_v1_init.sql 的 CHECK 约束保持一致。
 * 本文件仅类型 + 常量数据，无运行时副作用、无外部依赖。
 * 价格一律 integer cents（字段名带 Cents）。
 */

export type TierCategory = 'membership' | 'strategic_partner';

export type PaymentPlan = 'annual' | 'semiAnnual' | 'offline';

export type ApplicationType = 'membership' | 'strategic_partner';

export type ApplicationStatus =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'second_payment_due'
  | 'past_due'
  | 'cancelled';

export type PaymentStatus =
  | 'unpaid'
  | 'pending_payment'
  | 'paid'
  | 'partially_paid'
  | 'refunded'
  | 'failed';

export type PaymentProvider = 'stripe' | 'offline' | 'zelle' | 'check' | 'bank_transfer';

export type PaymentRecordStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export type SecondPaymentDueDateSource = 'auto_calculated' | 'manual_override';

export type DisplayStatus =
  | 'not_submitted'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'expired'
  | 'hidden';

export type DisplayCategory =
  | 'member_company'
  | 'member_project'
  | 'strategic_partner'
  | 'leadership';

export type AgreementType =
  | 'membership_agreement'
  | 'strategic_partnership_agreement'
  | 'privacy_policy';

export type AgreementLanguageMode = 'bilingual_english_controls';

export type ReminderTarget = 'applicant' | 'admin';

export type ReminderType =
  | 'expiry_30'
  | 'expiry_7'
  | 'expiry_0'
  | 'second_payment_30'
  | 'second_payment_7'
  | 'second_payment_0';

/** 档位配置形状（对应 membership_tiers 表；金额一律 cents）。 */
export type MembershipTierSeed = {
  slug: string;
  category: TierCategory;
  nameZh: string;
  nameEn: string;
  standardPriceCents: number;
  currentPriceCents: number;
  currency: string;
  promotionLabel: string | null;
  isPromotionActive: boolean;
  stripeProductName: string;
  membershipTermMonths: number;
  supportsSemiAnnual: boolean;
  firstPaymentAmountCents: number | null;
  secondPaymentAmountCents: number | null;
  isActive: boolean;
  sortOrder: number;
};

/** semiAnnual 第二期到期日默认间隔（月）。允许管理员手工覆盖，见 README「第二期到期日」。 */
export const SECOND_PAYMENT_DEFAULT_INTERVAL_MONTHS = 6;

/** 优惠标签统一文案。 */
export const PROMOTION_LABEL_2026 = '2026 Launch Rate / 2026 年度推广价';
