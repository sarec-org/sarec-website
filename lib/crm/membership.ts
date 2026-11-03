/**
 * 会费：网上全流程自助（东哥 2026-11-03 补充要求）
 * ------------------------------------------------------------------
 * 填表 → 确认协议 → 生成会费订单（orders.purpose = 'membership'）→ 付款页选择：
 *   · Stripe 刷卡：webhook / 回跳核验后立即生效；
 *   · Zelle：提交付款说明（备注订单号）即生效；工作人员事后核对到账，核实未到账才撤销。
 * 付款前没有任何人工审批；“能否在官网展示”是另一件事（display_status），不影响会员身份。
 * 续费可用积分抵扣，最多抵一半，只用于续费、不用于首次入会（C.3）。
 */
import type { PoolClient } from 'pg';
import { getPool, withTransaction } from '@/lib/db/client';
import { getAdminEmail, getFromAddress, getResend, isEmailConfigured } from '@/lib/email/resend-client';
import { validateCheckout, type CheckoutRequest } from '@/lib/membership/checkout';
import { insertApplicationRecords, type CheckoutContext } from '@/lib/membership/checkout-service';
import { formatCents, getTierSeed } from '@/lib/membership/tiers';
import { CrmError, normalizeEmail, normalizePhone } from './events';
import { getSetting, newOrderNo, redeemPoints, type OrderRow } from './orders';
import { pointsBalance, type Db } from './profile';

const ACTIVE_APP_STATUSES = ['approved', 'paid', 'second_payment_due'];

export type MemberStatus = {
  isMember: boolean;
  tierSlug: string | null;
  tierName: string | null;
  memberNo: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  paymentPending: boolean;
  expired: boolean;
};

export async function memberStatus(db: Db, contactId: string): Promise<MemberStatus> {
  const { rows: c } = await db.query<{ member_no: string; name: string }>(`SELECT member_no::text, name FROM contacts WHERE id = $1`, [contactId]);
  const { rows } = await db.query<{
    slug: string; name_zh: string | null; start: string | null; end: string | null; payment_status: string; app_status: string;
  }>(
    `SELECT a.selected_tier_slug AS slug, t.name_zh, a.membership_start_date::text AS start, a.membership_end_date::text AS end,
            a.payment_status, a.application_status AS app_status
       FROM applications a LEFT JOIN membership_tiers t ON t.slug = a.selected_tier_slug
      WHERE a.contact_id = $1 AND a.membership_end_date IS NOT NULL
        AND (a.application_status = ANY($2) OR (a.application_status = 'under_review' AND a.payment_status IN ('paid','partially_paid')))
      ORDER BY a.membership_end_date DESC LIMIT 1`,
    [contactId, ACTIVE_APP_STATUSES]
  );
  const r = rows[0];
  const today = new Date().toISOString().slice(0, 10);
  const expired = !!r && !!r.end && r.end < today;
  return {
    isMember: !!r && !expired,
    tierSlug: r?.slug ?? null,
    tierName: r ? r.name_zh ?? getTierSeed(r.slug)?.nameZh ?? r.slug : null,
    memberNo: Number(c[0]?.member_no ?? 0),
    name: c[0]?.name ?? '',
    startDate: r?.start ?? null,
    endDate: r?.end ?? null,
    paymentPending: !!r && r.payment_status === 'pending_payment',
    expired
  };
}

/** 是否续费：之前有过已生效的会费（含已到期）。 */
async function isRenewal(db: Db, contactId: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM applications WHERE contact_id = $1 AND membership_end_date IS NOT NULL
        AND (application_status = ANY($2) OR (application_status = 'under_review' AND payment_status IN ('paid','partially_paid'))) LIMIT 1`,
    [contactId, ACTIVE_APP_STATUSES]
  );
  return !!rows[0];
}

export type RenewalQuote = {
  renewal: boolean;
  feeCents: number;
  balance: number;
  pointsPerDollar: number;
  maxDiscountCents: number;
  pointsNeeded: number;
};

export async function renewalQuote(db: Db, contactId: string | null, feeCents: number): Promise<RenewalQuote> {
  const ppd = Number(await getSetting(db, 'points_per_dollar', 10)) || 10;
  if (!contactId || !(await isRenewal(db, contactId))) {
    return { renewal: false, feeCents, balance: 0, pointsPerDollar: ppd, maxDiscountCents: 0, pointsNeeded: 0 };
  }
  const balance = await pointsBalance(db, contactId);
  const halfDollars = Math.floor(feeCents / 2 / 100);
  const byBalance = Math.floor(Math.max(0, balance) / ppd);
  const dollars = Math.max(0, Math.min(halfDollars, byBalance));
  return { renewal: true, feeCents, balance, pointsPerDollar: ppd, maxDiscountCents: dollars * 100, pointsNeeded: dollars * ppd };
}

async function contactForApplication(db: Db, sessionContactId: string | null, email: string, name: string, phone: string | null): Promise<{ id: string; created: boolean }> {
  if (sessionContactId) return { id: sessionContactId, created: false };
  const { rows } = await db.query<{ id: string }>(`SELECT id FROM contacts WHERE email = $1`, [email]);
  if (rows[0]) return { id: rows[0].id, created: false };
  // 未验证的手机号不用来认人（防止把申请挂到别人档案上）；号码已被占用时只存在申请表里
  let p = phone ? normalizePhone(phone) : null;
  if (p) {
    const { rows: taken } = await db.query(`SELECT 1 FROM contacts WHERE phone_e164 = $1`, [p]);
    if (taken[0]) p = null;
  }
  // 未验证邮箱先建档；会员以后用同一邮箱收验证码登录，即进入同一份档案
  const { rows: ins } = await db.query<{ id: string }>(
    `INSERT INTO contacts (name, email, phone_e164, acquisition_source) VALUES ($1, $2, $3, 'membership_application') RETURNING id`,
    [name, email, p]
  );
  return { id: ins[0].id, created: true };
}

/** 提交入会 / 续费申请 → 订单号（下一步进付款页）。不需要任何审批。 */
export async function applyMembership(
  req: CheckoutRequest & { usePoints?: boolean },
  ctx: CheckoutContext,
  sessionContactId: string | null
): Promise<{ orderNo: string; amountCents: number; pointsRedeemed: number; contactId: string; newContact: boolean }> {
  const v = validateCheckout(req);
  if (!v.ok) throw new CrmError('invalid', v.error);
  const email = normalizeEmail(v.value.fields.email);
  if (!email) throw new CrmError('invalid', '请填写有效的邮箱地址。');

  return withTransaction(async (db) => {
    const who = await contactForApplication(db, sessionContactId, email, v.value.fields.contactName, v.value.fields.phone);
    const contactId = who.id;
    // 同一人同一档位还有没付的会费单：直接带回原订单，不重复下单
    const { rows: open } = await db.query<{ order_no: string; amount_cents: number; points_redeemed: number }>(
      `SELECT o.order_no, o.amount_cents, o.points_redeemed FROM orders o JOIN applications a ON a.id = o.related_id
        WHERE o.contact_id = $1 AND o.purpose = 'membership' AND o.status = 'pending_payment'
          AND a.selected_tier_slug = $2 AND o.created_at > now() - interval '7 days'
        ORDER BY o.created_at DESC LIMIT 1`,
      [contactId, v.value.tier.slug]
    );
    if (open[0]) return { orderNo: open[0].order_no, amountCents: open[0].amount_cents, pointsRedeemed: open[0].points_redeemed, contactId, newContact: false };

    const gross = v.value.amountCents;
    let discount = 0;
    let points = 0;
    if (req.usePoints && sessionContactId && sessionContactId === contactId) {
      const q = await renewalQuote(db, contactId, gross);
      discount = q.maxDiscountCents;
      points = q.pointsNeeded;
    }
    const net = gross - discount;
    const { applicationId, paymentId } = await insertApplicationRecords(db as PoolClient, v.value, ctx, 'offline', net);
    await db.query(`UPDATE applications SET contact_id = $2 WHERE id = $1`, [applicationId, contactId]);
    const orderNo = newOrderNo();
    const desc = `${v.value.tier.nameZh}${v.value.paymentPlan === 'semiAnnual' ? '（分期第 1 期）' : ''} 年费`;
    const { rows: o } = await db.query<{ id: string }>(
      `INSERT INTO orders (order_no, contact_id, purpose, related_id, description, amount_cents, gross_cents, points_redeemed, application_payment_id, provider)
       VALUES ($1, $2, 'membership', $3, $4, $5, $6, $7, $8, 'zelle') RETURNING id`,
      [orderNo, contactId, applicationId, desc, net, gross, points, paymentId]
    );
    await redeemPoints(db, contactId, o[0].id, points);
    return { orderNo, amountCents: net, pointsRedeemed: points, contactId, newContact: who.created };
  });
}

/** 让会费生效（幂等）：正式会员身份 + 有效期；续费接在原到期日之后。 */
export async function activateMembership(db: Db, applicationId: string, source: 'zelle_submitted' | 'paid'): Promise<boolean> {
  const { rows } = await db.query<{
    id: string; contact_id: string | null; application_status: string; application_type: string; payment_plan: string | null;
    membership_end_date: string | null;
  }>(`SELECT id, contact_id, application_status, application_type, payment_plan, membership_end_date::text FROM applications WHERE id = $1 FOR UPDATE`, [applicationId]);
  const a = rows[0];
  if (!a) return false;
  const semi = a.application_type === 'strategic_partner' && a.payment_plan === 'semiAnnual';
  const payStatus = source === 'paid' ? (semi ? 'partially_paid' : 'paid') : 'pending_payment';
  if (a.application_status === 'approved' && a.membership_end_date) {
    if (source === 'paid') await db.query(`UPDATE applications SET payment_status = $2, updated_at = now() WHERE id = $1`, [applicationId, payStatus]);
    return false; // 已生效
  }
  // 续费：从本人现有有效期结束的第二天开始；否则从今天开始
  const { rows: prev } = await db.query<{ end: string | null }>(
    `SELECT max(membership_end_date)::text AS end FROM applications
      WHERE contact_id = $1 AND id <> $2 AND membership_end_date >= current_date
        AND (application_status = ANY($3) OR (application_status = 'under_review' AND payment_status IN ('paid','partially_paid')))`,
    [a.contact_id, applicationId, ACTIVE_APP_STATUSES]
  );
  const start = prev[0]?.end ? `(date '${prev[0].end}' + 1)` : 'current_date';
  await db.query(
    `UPDATE applications SET application_status = 'approved', payment_status = $2,
            first_payment_paid_at = CASE WHEN $2 <> 'pending_payment' THEN COALESCE(first_payment_paid_at, now()) ELSE first_payment_paid_at END,
            membership_start_date = ${start}, membership_end_date = (${start} + interval '12 months' - interval '1 day')::date,
            second_payment_due_date = CASE WHEN $3 AND second_payment_due_date_source <> 'manual_override' THEN (current_date + interval '6 months')::date ELSE second_payment_due_date END,
            updated_at = now()
      WHERE id = $1`,
    [applicationId, payStatus, semi]
  );
  await db.query(
    `INSERT INTO crm_audit_log (actor, action, target_type, target_id, reason) VALUES ('system', 'activate_membership', 'application', $1, $2)`,
    [applicationId, source === 'paid' ? '付款到账，会籍生效' : '已提交 Zelle 付款说明，会籍先生效，待核对到账']
  );
  await sendWelcomeEmail(db, applicationId, source).catch((e) =>
    console.error('[membership] welcome email failed:', e instanceof Error ? e.message : 'unknown')
  );
  return true;
}

/** 会费订单到账（Stripe 回调 / Zelle 核款）。 */
export async function membershipPaid(db: Db, o: OrderRow, provider: string): Promise<void> {
  const payProvider = provider === 'stripe' ? 'stripe' : provider === 'zelle' ? 'zelle' : provider === 'check' ? 'check' : 'offline';
  if (o.application_payment_id) {
    await db.query(
      `UPDATE payments SET payment_status = 'paid', payment_provider = $2, paid_at = now(),
              admin_marked_paid_at = CASE WHEN $2 <> 'stripe' THEN now() END, admin_marked_paid_by = $3,
              offline_payment_reference = $4, amount_cents = $5, updated_at = now()
        WHERE id = $1 AND payment_status <> 'paid'`,
      [o.application_payment_id, payProvider, o.verified_by, o.order_no, o.amount_cents]
    );
  }
  await activateMembership(db, o.related_id!, 'paid');
}

async function sendWelcomeEmail(db: Db, applicationId: string, source: 'zelle_submitted' | 'paid'): Promise<void> {
  if (!isEmailConfigured()) return;
  const { rows } = await db.query<{ email: string; contact_name: string | null; slug: string; end: string; member_no: string | null }>(
    `SELECT a.email, a.contact_name, a.selected_tier_slug AS slug, a.membership_end_date::text AS end, c.member_no::text
       FROM applications a LEFT JOIN contacts c ON c.id = a.contact_id WHERE a.id = $1`,
    [applicationId]
  );
  const r = rows[0];
  if (!r) return;
  const tier = getTierSeed(r.slug);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');
  const pendingLine =
    source === 'zelle_submitted' ? '我们已收到您的 Zelle 付款说明，工作人员会尽快核对到账，核对期间会员身份照常有效。' : '您的付款已到账。';
  const text = `${r.contact_name ?? ''} 您好：

欢迎正式加入中美房地产商会（SAREC）！
${pendingLine}

会员等级：${tier?.nameZh ?? r.slug}
会员编号：${r.member_no ?? '—'}
有效期至：${r.end}

您可以随时登录查看会员身份和到期日：${site}/zh/me
（用本邮箱收验证码即可登录，不需要密码）

如果您希望把单位介绍展示在商会官网，工作人员会另外联系您核对展示资料；这不影响您的会员身份。

中美房地产商会 SAREC`;
  const resend = getResend();
  await resend.emails.send({ from: getFromAddress(), to: r.email, subject: '欢迎成为 SAREC 正式会员', text });
  const admin = getAdminEmail();
  if (admin) {
    await resend.emails.send({
      from: getFromAddress(),
      to: admin,
      subject: `[SAREC] 新会员生效：${r.contact_name ?? r.email}（${tier?.nameZh ?? r.slug}）`,
      text: `${r.contact_name ?? ''} <${r.email}> 已成为 ${tier?.nameZh ?? r.slug}，有效期至 ${r.end}。\n${
        source === 'zelle_submitted' ? '付款方式 Zelle：请在后台“核款工作台”核对到账。' : '付款已到账。'
      }\n${site}/zh/staff/payments`
    });
  }
}

export { formatCents };

/** 一次性：把现有会员申请按邮箱关联到客户档案（scripts/link-applications-to-contacts.ts 调用）。 */
export async function linkApplicationsToContacts(): Promise<{ linked: number; created: number }> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; email: string; contact_name: string | null; company_name: string | null; phone: string | null }>(
    `SELECT id, email, contact_name, company_name, phone FROM applications WHERE contact_id IS NULL`
  );
  let linked = 0;
  let created = 0;
  for (const a of rows) {
    const email = normalizeEmail(a.email);
    if (!email) continue;
    await withTransaction(async (db) => {
      const { rows: c } = await db.query<{ id: string }>(`SELECT id FROM contacts WHERE email = $1`, [email]);
      let id = c[0]?.id;
      if (!id) {
        const ins = await db.query<{ id: string }>(
          `INSERT INTO contacts (name, email, acquisition_source) VALUES ($1, $2, 'membership_import') RETURNING id`,
          [a.contact_name || a.company_name || email, email]
        );
        id = ins.rows[0].id;
        created++;
      }
      await db.query(`UPDATE applications SET contact_id = $2 WHERE id = $1`, [a.id, id]);
      linked++;
    });
  }
  return { linked, created };
}
