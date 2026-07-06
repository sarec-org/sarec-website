/**
 * 会员运营流转状态（秘书工作台）—— 单一定义源。
 * ------------------------------------------------------------------
 * operations_status 独立于 application_status（付款/审核）；秘书按此推进入会流程。
 * 付款成功后由 webhook 自动置初始态；秘书 / 东哥经 admin API 手工流转,每步写 audit log。
 */
export const OPERATIONS_STATUSES = [
  'paid_under_review',
  'need_more_info',
  'needs_owner_review',
  'approved',
  'onboarding_completed',
  'rejected',
  'refund_pending'
] as const;

export type OperationsStatus = (typeof OPERATIONS_STATUSES)[number];

/** 中文标签（工作台筛选 / 展示用）。 */
export const OPERATIONS_STATUS_LABELS_ZH: Record<OperationsStatus, string> = {
  paid_under_review: '已付款 / 待审核',
  need_more_info: '需补资料',
  needs_owner_review: '需东哥确认',
  approved: '已通过',
  onboarding_completed: '已完成入会',
  rejected: '已拒绝',
  refund_pending: '退款待确认'
};

/** 秘书可手工设置的运营状态（paid_under_review 由系统自动置,不在按钮里）。 */
export const OPERATIONS_ACTION_STATUSES: OperationsStatus[] = [
  'need_more_info',
  'needs_owner_review',
  'approved',
  'onboarding_completed',
  'rejected',
  'refund_pending'
];

export function isOperationsStatus(v: unknown): v is OperationsStatus {
  return typeof v === 'string' && (OPERATIONS_STATUSES as readonly string[]).includes(v);
}

/** 单位类会员档位（理事 / 常务理事 / 副会长）——需补 Logo / 简介 / 牌匾抬头等。 */
const UNIT_TIER_SLUGS = ['board', 'exec_board', 'vp', 'svp'] as const;

export function isUnitTier(tierSlug: string | null | undefined): boolean {
  return Boolean(tierSlug) && (UNIT_TIER_SLUGS as readonly string[]).includes(tierSlug as string);
}

export function isStrategicPartner(applicationType: string | null | undefined): boolean {
  return applicationType === 'strategic_partner';
}

/**
 * 付款成功后的自动运营状态：
 * 普通会员 $200（member）→ paid_under_review（秘书可初审,资料完整可准备通过）
 * 理事 / 常务理事 / 副会长 / 战略合作伙伴 → needs_owner_review（需东哥确认后批准）
 */
export function autoOperationsStatusAfterPaid(
  applicationType: string | null | undefined,
  tierSlug: string | null | undefined
): OperationsStatus {
  if (applicationType === 'membership' && tierSlug === 'member') {
    return 'paid_under_review';
  }
  return 'needs_owner_review';
}
