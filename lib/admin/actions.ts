/**
 * 管理员手工操作（服务端）。每个动作在事务内更新业务表并写 admin_audit_log。
 * ------------------------------------------------------------------
 * 动作：mark_payment_paid / update_second_payment_due_date / mark_second_payment_paid /
 *       review_application(approve|reject) / update_display_status / list（只读）。
 * 失败抛 AdminError（带 status），不破坏原有状态（事务回滚）。
 * 金额默认必须与 payment.amount_cents 一致，除非 override=true 且带 note。
 * M6 不做 Cron / 到期提醒 / 自动退款 / subscription。
 */
import type { PoolClient } from 'pg';
import { query, withTransaction } from '@/lib/db/client';
import { getTierSeed } from '@/lib/membership/tiers';
import { dispatchPaymentNotificationsSafe } from '@/lib/email/notifications';

export class AdminError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type AdminCtx = { ip: string | null; userAgent: string | null };

const OFFLINE_PROVIDERS = ['offline', 'zelle', 'check', 'bank_transfer'];
const DISPLAY_STATUSES = [
  'not_submitted',
  'pending_review',
  'approved',
  'rejected',
  'published',
  'expired',
  'hidden'
];

function asString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}
function asInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  return null;
}
function asBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}
function requireString(v: unknown, name: string): string {
  const s = asString(v);
  if (!s) throw new AdminError(`missing or invalid: ${name}`);
  return s;
}

async function insertAudit(
  client: PoolClient,
  a: {
    applicationId: string | null;
    actionType: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    previousValue?: string | null;
    newValue?: string | null;
    adminIdentifier?: string | null;
    adminNote?: string | null;
    ctx: AdminCtx;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO admin_audit_log
       (application_id, admin_action_type, previous_status, new_status,
        previous_value, new_value, admin_identifier, admin_note, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      a.applicationId,
      a.actionType,
      a.previousStatus ?? null,
      a.newStatus ?? null,
      a.previousValue ?? null,
      a.newValue ?? null,
      a.adminIdentifier ?? null,
      a.adminNote ?? null,
      a.ctx.ip,
      a.ctx.userAgent
    ]
  );
}

// ── 只读列表 ──────────────────────────────────────────────────────
export async function listApplications(): Promise<Record<string, unknown>[]> {
  return query(
    `SELECT a.id, a.application_type, a.selected_tier_slug, a.payment_plan,
            a.company_name, a.contact_name, a.email,
            a.payment_status, a.application_status, a.display_status,
            a.current_price_cents,
            to_char(a.membership_start_date,'YYYY-MM-DD') AS membership_start_date,
            to_char(a.membership_end_date,'YYYY-MM-DD')   AS membership_end_date,
            to_char(a.second_payment_due_date,'YYYY-MM-DD') AS second_payment_due_date,
            a.second_payment_due_date_source,
            to_char(a.created_at,'YYYY-MM-DD HH24:MI') AS created_at
       FROM applications a
      ORDER BY a.created_at DESC
      LIMIT 50`
  );
}

type AppRow = {
  id: string;
  application_type: string;
  payment_plan: string | null;
  payment_status: string;
  application_status: string;
  display_status: string;
  selected_tier_slug: string | null;
  first_payment_paid_at: string | null;
  membership_start_date: string | null;
  second_payment_due_date: string | null;
  second_payment_due_date_source: string | null;
};

async function loadApp(client: PoolClient, applicationId: string): Promise<AppRow> {
  const r = await client.query<AppRow>(
    `SELECT id, application_type, payment_plan, payment_status, application_status, display_status,
            selected_tier_slug,
            to_char(first_payment_paid_at,'YYYY-MM-DD HH24:MI') AS first_payment_paid_at,
            to_char(membership_start_date,'YYYY-MM-DD') AS membership_start_date,
            to_char(second_payment_due_date,'YYYY-MM-DD') AS second_payment_due_date,
            second_payment_due_date_source
       FROM applications WHERE id=$1 FOR UPDATE`,
    [applicationId]
  );
  if (r.rows.length === 0) throw new AdminError('application not found', 404);
  return r.rows[0];
}

// ── 1. mark_payment_paid（线下/Zelle/check/bank_transfer 首期）──────
export async function markPaymentPaid(
  p: Record<string, unknown>,
  ctx: AdminCtx
): Promise<{ ok: true; paymentId: string; applicationPaymentStatus: string }> {
  const applicationId = requireString(p.applicationId, 'applicationId');
  const provider = requireString(p.paymentProvider, 'paymentProvider');
  if (!OFFLINE_PROVIDERS.includes(provider)) {
    throw new AdminError(`paymentProvider must be one of ${OFFLINE_PROVIDERS.join('/')}`);
  }
  const amountCents = asInt(p.amountCents);
  if (amountCents === null) throw new AdminError('missing or invalid: amountCents');
  const override = asBool(p.override) === true;
  const adminNote = asString(p.adminNote);
  const adminIdentifier = asString(p.adminIdentifier);
  const reference = asString(p.offlinePaymentReference);
  const paymentIdParam = asString(p.paymentId);
  if (override && !adminNote) throw new AdminError('override requires adminNote');

  const result = await withTransaction(async (client) => {
    const app = await loadApp(client, applicationId);

    // 定位 payment
    let payRow: { id: string; amount_cents: number; payment_status: string; installment_number: number | null };
    if (paymentIdParam) {
      const r = await client.query(
        `SELECT id, amount_cents, payment_status, installment_number FROM payments
          WHERE id=$1 AND application_id=$2 FOR UPDATE`,
        [paymentIdParam, applicationId]
      );
      if (r.rows.length === 0) throw new AdminError('payment not found for application', 404);
      payRow = r.rows[0];
    } else {
      const r = await client.query(
        `SELECT id, amount_cents, payment_status, installment_number FROM payments
          WHERE application_id=$1 AND payment_status='pending'
            AND (installment_number IS NULL OR installment_number=1)
          ORDER BY created_at FOR UPDATE`,
        [applicationId]
      );
      if (r.rows.length === 0) throw new AdminError('no pending first payment for application', 404);
      if (r.rows.length > 1) throw new AdminError('multiple pending payments — specify paymentId');
      payRow = r.rows[0];
    }

    if (payRow.payment_status === 'paid') throw new AdminError('payment already paid');
    if (payRow.amount_cents !== amountCents && !override) {
      throw new AdminError(
        `amount mismatch: payment=${payRow.amount_cents} provided=${amountCents} (pass override + adminNote to force)`
      );
    }

    await client.query(
      `UPDATE payments SET payment_status='paid', paid_at=now(),
              admin_marked_paid_at=now(), admin_marked_paid_by=$2,
              payment_provider=$3, offline_payment_method=$3, offline_payment_reference=$4,
              updated_at=now()
        WHERE id=$1`,
      [payRow.id, adminIdentifier, provider, reference]
    );

    const isSemiAnnualFirst =
      app.application_type === 'strategic_partner' &&
      app.payment_plan === 'semiAnnual' &&
      (payRow.installment_number === 1 || payRow.installment_number === null);
    const newAppPayStatus = isSemiAnnualFirst ? 'partially_paid' : 'paid';

    await client.query(
      `UPDATE applications SET
         payment_status=$2,
         application_status = CASE WHEN application_status IN ('draft','pending_payment')
                                   THEN 'under_review' ELSE application_status END,
         first_payment_paid_at = COALESCE(first_payment_paid_at, now()),
         membership_start_date = COALESCE(membership_start_date, (now())::date),
         membership_end_date = COALESCE(membership_end_date,
                                        (COALESCE(membership_start_date,(now())::date) + interval '12 months')::date),
         updated_at=now()
       WHERE id=$1`,
      [applicationId, newAppPayStatus]
    );

    await insertAudit(client, {
      applicationId,
      actionType: 'mark_offline_paid',
      previousStatus: payRow.payment_status,
      newStatus: 'paid',
      previousValue: app.payment_status,
      newValue: newAppPayStatus,
      adminIdentifier,
      adminNote: `${adminNote ?? ''} | provider=${provider} ref=${reference ?? '-'} amount=${amountCents}${override ? ' OVERRIDE' : ''}`,
      ctx
    });

    return { paymentId: payRow.id, applicationPaymentStatus: newAppPayStatus };
  });

  // 复用 M5 邮件（幂等 claim-before-send）；失败不影响本操作。
  await dispatchPaymentNotificationsSafe(applicationId, result.paymentId);

  return { ok: true, ...result };
}

// ── 2. update_second_payment_due_date（写 manual_override）──────────
export async function updateSecondPaymentDueDate(
  p: Record<string, unknown>,
  ctx: AdminCtx
): Promise<{ ok: true; secondPaymentDueDate: string }> {
  const applicationId = requireString(p.applicationId, 'applicationId');
  const date = requireString(p.secondPaymentDueDate, 'secondPaymentDueDate');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AdminError('secondPaymentDueDate must be YYYY-MM-DD');
  const adminNote = asString(p.adminNote);
  const adminIdentifier = asString(p.adminIdentifier);

  await withTransaction(async (client) => {
    const app = await loadApp(client, applicationId);
    await client.query(
      `UPDATE applications SET
         second_payment_due_date=$2::date,
         second_payment_due_date_source='manual_override',
         second_payment_due_date_note=$3,
         updated_at=now()
       WHERE id=$1`,
      [applicationId, date, adminNote]
    );
    await insertAudit(client, {
      applicationId,
      actionType: 'update_second_payment_due_date',
      previousValue: `${app.second_payment_due_date ?? '-'} (${app.second_payment_due_date_source ?? '-'})`,
      newValue: `${date} (manual_override)`,
      adminIdentifier,
      adminNote,
      ctx
    });
  });

  return { ok: true, secondPaymentDueDate: date };
}

// ── 3. mark_second_payment_paid（semiAnnual 第二期）────────────────
export async function markSecondPaymentPaid(
  p: Record<string, unknown>,
  ctx: AdminCtx
): Promise<{ ok: true; paymentId: string; applicationPaymentStatus: string }> {
  const applicationId = requireString(p.applicationId, 'applicationId');
  const provider = requireString(p.paymentProvider, 'paymentProvider');
  if (!OFFLINE_PROVIDERS.includes(provider)) {
    throw new AdminError(`paymentProvider must be one of ${OFFLINE_PROVIDERS.join('/')}`);
  }
  const amountCents = asInt(p.amountCents);
  if (amountCents === null) throw new AdminError('missing or invalid: amountCents');
  const override = asBool(p.override) === true;
  const adminNote = asString(p.adminNote);
  const adminIdentifier = asString(p.adminIdentifier);
  const reference = asString(p.offlinePaymentReference);
  if (override && !adminNote) throw new AdminError('override requires adminNote');

  const result = await withTransaction(async (client) => {
    const app = await loadApp(client, applicationId);
    if (!(app.application_type === 'strategic_partner' && app.payment_plan === 'semiAnnual')) {
      throw new AdminError('mark_second_payment_paid only applies to strategic_partner semiAnnual');
    }
    const tier = app.selected_tier_slug ? getTierSeed(app.selected_tier_slug) : undefined;
    const expected = tier?.secondPaymentAmountCents ?? null;
    if (expected !== null && amountCents !== expected && !override) {
      throw new AdminError(
        `amount mismatch: expected second installment=${expected} provided=${amountCents} (pass override + adminNote to force)`
      );
    }

    // 找/建 installment 2
    const existing = await client.query(
      `SELECT id, payment_status FROM payments
        WHERE application_id=$1 AND installment_number=2 FOR UPDATE`,
      [applicationId]
    );
    let paymentId: string;
    if (existing.rows.length > 0) {
      if (existing.rows[0].payment_status === 'paid') throw new AdminError('second payment already paid');
      paymentId = existing.rows[0].id;
      await client.query(
        `UPDATE payments SET payment_status='paid', paid_at=now(),
                admin_marked_paid_at=now(), admin_marked_paid_by=$2,
                payment_provider=$3, offline_payment_method=$3, offline_payment_reference=$4,
                amount_cents=$5, updated_at=now()
          WHERE id=$1`,
        [paymentId, adminIdentifier, provider, reference, amountCents]
      );
    } else {
      const ins = await client.query(
        `INSERT INTO payments
           (application_id, payment_provider, payment_plan, installment_number,
            amount_cents, currency, payment_status, paid_at,
            admin_marked_paid_at, admin_marked_paid_by, offline_payment_method, offline_payment_reference)
         VALUES ($1,$2,'semiAnnual',2,$3,'usd','paid',now(),now(),$4,$2,$5)
         RETURNING id`,
        [applicationId, provider, amountCents, adminIdentifier, reference]
      );
      paymentId = ins.rows[0].id;
    }

    await client.query(
      `UPDATE applications SET
         second_payment_paid_at=now(),
         payment_status='paid',
         membership_start_date = COALESCE(membership_start_date, (now())::date),
         membership_end_date = COALESCE(membership_end_date,
                                        (COALESCE(membership_start_date,(now())::date) + interval '12 months')::date),
         updated_at=now()
       WHERE id=$1`,
      [applicationId]
    );

    await insertAudit(client, {
      applicationId,
      actionType: 'mark_second_payment_paid',
      previousStatus: app.payment_status,
      newStatus: 'paid',
      previousValue: `installment2 amount=${amountCents}`,
      newValue: `provider=${provider} ref=${reference ?? '-'}${override ? ' OVERRIDE' : ''}`,
      adminIdentifier,
      adminNote,
      ctx
    });

    return { paymentId, applicationPaymentStatus: 'paid' };
  });

  return { ok: true, ...result };
}

// ── 4. review_application（approve / reject）──────────────────────
export async function reviewApplication(
  p: Record<string, unknown>,
  ctx: AdminCtx
): Promise<{ ok: true; applicationStatus: string }> {
  const applicationId = requireString(p.applicationId, 'applicationId');
  const decision = requireString(p.decision, 'decision');
  if (decision !== 'approve' && decision !== 'reject') {
    throw new AdminError("decision must be 'approve' or 'reject'");
  }
  const adminNote = asString(p.adminNote);
  const adminIdentifier = asString(p.adminIdentifier);
  const newStatus = decision === 'approve' ? 'approved' : 'rejected';

  await withTransaction(async (client) => {
    const app = await loadApp(client, applicationId);
    await client.query(
      `UPDATE applications SET application_status=$2, updated_at=now() WHERE id=$1`,
      [applicationId, newStatus]
    );
    await insertAudit(client, {
      applicationId,
      actionType: decision, // 'approve' | 'reject'
      previousStatus: app.application_status,
      newStatus,
      adminIdentifier,
      adminNote,
      ctx
    });
  });

  return { ok: true, applicationStatus: newStatus };
}

// ── 5. update_display_status ──────────────────────────────────────
export async function updateDisplayStatus(
  p: Record<string, unknown>,
  ctx: AdminCtx
): Promise<{ ok: true; displayStatus: string }> {
  const applicationId = requireString(p.applicationId, 'applicationId');
  const displayStatus = requireString(p.displayStatus, 'displayStatus');
  if (!DISPLAY_STATUSES.includes(displayStatus)) {
    throw new AdminError(`displayStatus must be one of ${DISPLAY_STATUSES.join('/')}`);
  }
  const displayOnWebsite = asBool(p.displayOnWebsite);
  const displayPriority = asInt(p.displayPriority);
  const displayStartDate = asString(p.displayStartDate);
  const displayEndDate = asString(p.displayEndDate);
  const adminNote = asString(p.adminNote);
  const adminIdentifier = asString(p.adminIdentifier);

  await withTransaction(async (client) => {
    const app = await loadApp(client, applicationId);
    await client.query(
      `UPDATE applications SET
         display_status=$2,
         display_on_website = COALESCE($3, display_on_website),
         display_priority   = COALESCE($4, display_priority),
         display_start_date = COALESCE($5::date, display_start_date),
         display_end_date   = COALESCE($6::date, display_end_date),
         updated_at=now()
       WHERE id=$1`,
      [applicationId, displayStatus, displayOnWebsite, displayPriority, displayStartDate, displayEndDate]
    );
    await insertAudit(client, {
      applicationId,
      actionType: 'update_display_status',
      previousStatus: app.display_status,
      newStatus: displayStatus,
      adminIdentifier,
      adminNote,
      ctx
    });
  });

  return { ok: true, displayStatus };
}
