/**
 * Checkout 输入校验 + 金额解析（纯函数，无副作用，可单测）。
 * ------------------------------------------------------------------
 * 铁律：金额只从 tiers.ts（唯一价格源）解析，绝不信任客户端传价。
 * 客户端只能提交选择项（tierSlug / paymentPlan）与资料字段。
 * 服务端据 slug 查档、验 isActive、算金额。
 */
import { getTierSeed, getStrategicPartnerTier, STRATEGIC_PARTNER_SLUG } from './tiers';
import type { MembershipTierSeed } from './types';

export type ApplicantFields = {
  companyName?: string;
  memberName?: string;
  contactName?: string;
  contactTitle?: string;
  email?: string;
  phone?: string;
  companyAddress?: string;
  websiteUrl?: string;
  industryCategory?: string;
  serviceArea?: string;
  companyDescription?: string;
  notes?: string;
};

export type CheckoutRequest = ApplicantFields & {
  applicationType?: string;
  tierSlug?: string;
  paymentPlan?: string;
  agree?: boolean;
};

export type NormalizedFields = {
  companyName: string;
  contactName: string;
  email: string;
  contactTitle: string | null;
  phone: string | null;
  companyAddress: string | null;
  websiteUrl: string | null;
  industryCategory: string | null;
  serviceArea: string | null;
  companyDescription: string | null;
  notes: string | null;
};

export type NormalizedCheckout = {
  applicationType: 'membership' | 'strategic_partner';
  tier: MembershipTierSeed;
  paymentPlan: 'annual' | 'semiAnnual';
  installmentNumber: 1;
  amountCents: number;
  secondPaymentAmountCents: number | null;
  fields: NormalizedFields;
};

export type ValidationResult =
  | { ok: true; value: NormalizedCheckout }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(x?: string): string | null {
  const t = (x ?? '').trim();
  return t.length > 0 ? t : null;
}

function normFields(
  body: CheckoutRequest,
  companyName: string,
  contactName: string,
  email: string
): NormalizedFields {
  return {
    companyName,
    contactName,
    email,
    contactTitle: clean(body.contactTitle),
    phone: clean(body.phone),
    companyAddress: clean(body.companyAddress),
    websiteUrl: clean(body.websiteUrl),
    industryCategory: clean(body.industryCategory),
    serviceArea: clean(body.serviceArea),
    companyDescription: clean(body.companyDescription),
    notes: clean(body.notes)
  };
}

export function validateCheckout(body: CheckoutRequest): ValidationResult {
  const applicationType = body.applicationType;
  if (applicationType !== 'membership' && applicationType !== 'strategic_partner') {
    return { ok: false, error: '未知的申请类型。' };
  }
  if (body.agree !== true) {
    return { ok: false, error: '请先勾选同意协议与隐私政策。' };
  }
  const email = (body.email ?? '').trim();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: '请填写有效的邮箱地址。' };
  }
  const contactName = (body.contactName ?? '').trim();
  if (!contactName) {
    return { ok: false, error: '请填写联系人姓名。' };
  }

  if (applicationType === 'membership') {
    const slug = (body.tierSlug ?? '').trim();
    const tier = getTierSeed(slug);
    if (!tier || tier.category !== 'membership') {
      return { ok: false, error: '请选择有效的会员档位。' };
    }
    if (!tier.isActive) {
      return { ok: false, error: '该档位暂不开放在线购买。' };
    }
    const companyName = (body.companyName ?? body.memberName ?? '').trim();
    if (!companyName) {
      return { ok: false, error: '请填写公司 / 会员名称。' };
    }
    if (tier.currentPriceCents <= 0) {
      return { ok: false, error: '档位金额配置有误。' };
    }
    return {
      ok: true,
      value: {
        applicationType,
        tier,
        paymentPlan: 'annual',
        installmentNumber: 1,
        amountCents: tier.currentPriceCents,
        secondPaymentAmountCents: null,
        fields: normFields(body, companyName, contactName, email)
      }
    };
  }

  // strategic_partner
  const tier = getStrategicPartnerTier();
  if (!tier || tier.slug !== STRATEGIC_PARTNER_SLUG || !tier.isActive) {
    return { ok: false, error: '战略合作伙伴暂不开放在线申请。' };
  }
  const plan = body.paymentPlan;
  if (plan !== 'annual' && plan !== 'semiAnnual') {
    return { ok: false, error: '请选择付款方式。' };
  }
  if (plan === 'semiAnnual' && !tier.supportsSemiAnnual) {
    return { ok: false, error: '该档位不支持分期付款。' };
  }
  const companyName = (body.companyName ?? '').trim();
  if (!companyName) {
    return { ok: false, error: '请填写公司名称。' };
  }
  const amountCents =
    plan === 'annual' ? tier.currentPriceCents : tier.firstPaymentAmountCents ?? 0;
  const secondPaymentAmountCents =
    plan === 'semiAnnual' ? tier.secondPaymentAmountCents ?? null : null;
  if (amountCents <= 0) {
    return { ok: false, error: '档位金额配置有误。' };
  }
  return {
    ok: true,
    value: {
      applicationType,
      tier,
      paymentPlan: plan,
      installmentNumber: 1,
      amountCents,
      secondPaymentAmountCents,
      fields: normFields(body, companyName, contactName, email)
    }
  };
}
