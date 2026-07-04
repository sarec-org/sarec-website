/**
 * Checkout 编排（服务端）：校验 → 写库（application / payment / agreement acceptance）
 * → 创建 Stripe Checkout Session（test mode，price_data 动态传价）→ 回写 session id。
 * ------------------------------------------------------------------
 * M3 边界：不写 webhook、不标 paid、不发邮件、不做 subscription、不收第二期。
 * 金额只从 tiers.ts 解析（见 checkout.ts），客户端传价一律忽略。
 */
import { query, withTransaction } from '@/lib/db/client';
import { getStripe } from '@/lib/stripe/client';
import { getAgreementMeta, AGREEMENT_LANGUAGE_MODE } from './agreements';
import { validateCheckout, type CheckoutRequest } from './checkout';
import { SECOND_PAYMENT_DEFAULT_INTERVAL_MONTHS, type AgreementType } from './types';

export type CheckoutContext = { ip: string | null; userAgent: string | null };

export type CheckoutServiceResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status: number };

export async function createCheckoutSession(
  body: CheckoutRequest,
  ctx: CheckoutContext
): Promise<CheckoutServiceResult> {
  const v = validateCheckout(body);
  if (!v.ok) {
    return { ok: false, error: v.error, status: 400 };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!process.env.DATABASE_URL || !process.env.STRIPE_SECRET_KEY || !siteUrl) {
    return {
      ok: false,
      error: '付款功能尚未配置，请稍后再试或直接联系我们。',
      status: 503
    };
  }

  const { applicationType, tier, paymentPlan, amountCents, fields } = v.value;

  const mainAgreementType: AgreementType =
    applicationType === 'membership'
      ? 'membership_agreement'
      : 'strategic_partnership_agreement';
  const mainAgreement = getAgreementMeta(mainAgreementType);
  const privacyAgreement = getAgreementMeta('privacy_policy');

  // 战略合作伙伴半年两期：默认第二期到期日 = 今天 + 6 个月（未来允许管理员覆盖）。
  let secondDue: string | null = null;
  let secondDueSource: 'auto_calculated' | null = null;
  if (applicationType === 'strategic_partner' && paymentPlan === 'semiAnnual') {
    const d = new Date();
    d.setMonth(d.getMonth() + SECOND_PAYMENT_DEFAULT_INTERVAL_MONTHS);
    secondDue = d.toISOString().slice(0, 10);
    secondDueSource = 'auto_calculated';
  }

  // 取档位 DB id（用于 FK）；缺失不阻断，slug 仍留档。
  let tierId: number | null = null;
  try {
    const rows = await query<{ id: number }>(
      'SELECT id FROM membership_tiers WHERE slug = $1',
      [tier.slug]
    );
    tierId = rows[0]?.id ?? null;
  } catch {
    tierId = null;
  }

  // 一个事务内写入 application + payment + 两条 agreement acceptance。
  const { applicationId, paymentId } = await withTransaction(async (client) => {
    const appRes = await client.query(
      `INSERT INTO applications (
         application_type, selected_tier_id, selected_tier_slug, payment_plan,
         application_status, payment_status,
         company_name, contact_name, contact_title, email, phone,
         company_address, website_url, industry_category, service_area,
         company_description, notes,
         standard_price_cents, current_price_cents, currency, promotion_label,
         second_payment_due_date, second_payment_due_date_source
       ) VALUES (
         $1,$2,$3,$4,
         'pending_payment','pending_payment',
         $5,$6,$7,$8,$9,
         $10,$11,$12,$13,
         $14,$15,
         $16,$17,$18,$19,
         $20,$21
       ) RETURNING id`,
      [
        applicationType,
        tierId,
        tier.slug,
        paymentPlan,
        fields.companyName,
        fields.contactName,
        fields.contactTitle,
        fields.email,
        fields.phone,
        fields.companyAddress,
        fields.websiteUrl,
        fields.industryCategory,
        fields.serviceArea,
        fields.companyDescription,
        fields.notes,
        tier.standardPriceCents,
        tier.currentPriceCents,
        tier.currency,
        tier.promotionLabel,
        secondDue,
        secondDueSource
      ]
    );
    const applicationId = appRes.rows[0].id as string;

    const payRes = await client.query(
      `INSERT INTO payments (
         application_id, payment_provider, payment_plan, installment_number,
         amount_cents, currency, payment_status
       ) VALUES ($1,'stripe',$2,1,$3,$4,'pending') RETURNING id`,
      [applicationId, paymentPlan, amountCents, tier.currency]
    );
    const paymentId = payRes.rows[0].id as string;

    for (const ag of [mainAgreement, privacyAgreement]) {
      await client.query(
        `INSERT INTO agreement_acceptances (
           application_id, agreement_type, agreement_version, agreement_title,
           agreement_url, agreement_hash, agreement_language_mode,
           selected_tier, standard_price_cents, actual_paid_price_cents, promotion_label,
           payment_plan, company_name, contact_name, email, phone,
           agree_time, ip_address, user_agent, payment_status
         ) VALUES (
           $1,$2,$3,$4,
           $5,$6,$7,
           $8,$9,$10,$11,
           $12,$13,$14,$15,$16,
           now(),$17,$18,'pending'
         )`,
        [
          applicationId,
          ag.type,
          ag.version,
          ag.title,
          ag.url,
          ag.hash,
          AGREEMENT_LANGUAGE_MODE,
          tier.slug,
          tier.standardPriceCents,
          amountCents,
          tier.promotionLabel,
          paymentPlan,
          fields.companyName,
          fields.contactName,
          fields.email,
          fields.phone,
          ctx.ip,
          ctx.userAgent
        ]
      );
    }

    return { applicationId, paymentId };
  });

  // 创建 Stripe Checkout Session（mode=payment，动态 price_data，不用固定 Price ID）。
  const stripe = getStripe();
  const productName =
    applicationType === 'strategic_partner' && paymentPlan === 'semiAnnual'
      ? `${tier.nameEn} — Semi-annual installment 1 of 2`
      : tier.nameEn;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: tier.currency,
          unit_amount: amountCents,
          product_data: { name: productName }
        }
      }
    ],
    customer_email: fields.email,
    success_url: `${siteUrl}/zh/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/zh/checkout/cancel`,
    metadata: {
      applicationId,
      paymentId,
      applicationType,
      selectedTierSlug: tier.slug,
      paymentPlan,
      installmentNumber: '1',
      agreementVersion: mainAgreement.version,
      privacyPolicyVersion: privacyAgreement.version
    }
  });

  if (!session.url) {
    return { ok: false, error: '创建付款会话失败，请稍后再试。', status: 502 };
  }

  // 回写 session id（payment + agreement acceptance）。M4 webhook 据此回填 paid。
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
  await query(
    'UPDATE payments SET stripe_checkout_session_id = $1, stripe_customer_id = $2, updated_at = now() WHERE id = $3',
    [session.id, stripeCustomerId, paymentId]
  );
  await query(
    'UPDATE agreement_acceptances SET stripe_checkout_session_id = $1, updated_at = now() WHERE application_id = $2',
    [session.id, applicationId]
  );

  return { ok: true, url: session.url };
}
