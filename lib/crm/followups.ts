/**
 * 待跟进任务 + 待处理（失败 / 异常）—— SAREC 1.2 第 I 节
 * ------------------------------------------------------------------
 * 触发：网站 AI 助手留下的线索；活动后 24 小时内“报名时选了希望了解 X”的人；新咨询（网站表单 / AI 助手 / 小程序）；
 *      30 天内到期的会员。
 * 原则：
 *   · 同一触发只生成一条（dedupe_key 唯一），重试、重复扫描不会重复生成、重复通知、重复计分；
 *   · 定时扫描只查数据库、用模板写联系草稿，绝不调用 AI（AI 草稿只在访客对话里生成）；
 *   · 每一步失败都进 ops_exceptions（待处理），可在后台重试，重试同样幂等。
 */
import { getPool } from '@/lib/db/client';
import { getFromAddress, getResend, isEmailConfigured } from '@/lib/email/resend-client';
import { CrmError } from './events';
import type { Db } from './profile';
import { laToday } from '@/lib/laDate';

export type FollowupSource = 'agent_lead' | 'post_event_interest' | 'inquiry' | 'expiring_member' | 'manual';
export type FollowupStatus = 'todo' | 'contacted' | 'meeting' | 'won' | 'dropped';

export const SOURCE_LABEL: Record<FollowupSource, string> = {
  agent_lead: 'AI 助手线索',
  post_event_interest: '活动后希望了解',
  inquiry: '新咨询',
  expiring_member: '会员 30 天内到期',
  manual: '手动添加'
};
export const STATUS_LABEL: Record<FollowupStatus, string> = {
  todo: '待联系',
  contacted: '已联系',
  meeting: '已约谈',
  won: '已成交',
  dropped: '暂不跟进'
};
export const FOLLOWUP_STATUSES = Object.keys(STATUS_LABEL) as FollowupStatus[];

export type FollowupInput = {
  source: FollowupSource;
  dedupeKey: string;
  contactId?: string | null;
  name?: string | null;
  contactText?: string | null;
  need?: string | null;
  detail?: Record<string, unknown> | null;
  draft?: string | null;
  draftBy?: 'ai' | 'template';
  eventId?: string | null;
  inquiryId?: string | null;
  nextDate?: string | null;
};

/** 生成待跟进任务；同一 dedupeKey 已存在时直接返回原任务（created = false）。 */
export async function upsertFollowup(db: Db, f: FollowupInput): Promise<{ id: string; created: boolean }> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO followups (source, dedupe_key, contact_id, name, contact_text, need, detail, draft, draft_by, event_id, inquiry_id, next_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`,
    [
      f.source,
      f.dedupeKey,
      f.contactId ?? null,
      f.name?.slice(0, 200) ?? null,
      f.contactText?.slice(0, 300) ?? null,
      f.need?.slice(0, 2000) ?? null,
      f.detail ? JSON.stringify(f.detail) : null,
      f.draft?.slice(0, 4000) ?? null,
      f.draftBy ?? 'template',
      f.eventId ?? null,
      f.inquiryId ?? null,
      f.nextDate ?? null
    ]
  );
  if (rows[0]) return { id: rows[0].id, created: true };
  const { rows: ex } = await db.query<{ id: string }>(`SELECT id FROM followups WHERE dedupe_key = $1`, [f.dedupeKey]);
  return { id: ex[0].id, created: false };
}

// ── 待处理（失败 / 异常）────────────────────────────────────────────────

export async function recordException(kind: string, dedupeKey: string, ref: string | null, error: string, payload?: unknown): Promise<void> {
  await getPool()
    .query(
      `INSERT INTO ops_exceptions (kind, dedupe_key, ref, error, payload) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (dedupe_key) DO UPDATE SET attempts = ops_exceptions.attempts + 1, error = EXCLUDED.error,
         status = 'open', updated_at = now()`,
      [kind, dedupeKey, ref, error.slice(0, 500), payload === undefined ? null : JSON.stringify(payload)]
    )
    .catch((e) => console.error('[ops_exceptions]', e instanceof Error ? e.message : 'error'));
}

export async function resolveException(dedupeKey: string, by: string): Promise<void> {
  await getPool().query(
    `UPDATE ops_exceptions SET status = 'resolved', resolved_by = $2, updated_at = now() WHERE dedupe_key = $1 AND status = 'open'`,
    [dedupeKey, by]
  );
}

// ── 邮件通知（线索 / 新咨询 → info@；只发一次）──────────────────────────────

/** 线索通知收件人：LEAD_NOTIFY_EMAIL，默认 info@sinoamericanrec.org（预览环境只会发到测试白名单） */
/** 邮件标题不能有换行：压成一行再截断 */
const oneLine = (t: string, n: number) => t.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, n);

export function leadNotifyEmail(): string {
  return (process.env.LEAD_NOTIFY_EMAIL || 'info@sinoamericanrec.org').trim();
}

/** 发一次“新线索 / 新咨询”通知邮件。已发过不再发；失败进待处理。返回是否已通知。 */
export async function notifyFollowup(id: string, base?: string): Promise<boolean> {
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string; source: FollowupSource; name: string | null; contact_text: string | null; need: string | null;
    draft: string | null; notified_at: Date | null; detail: Record<string, unknown> | null;
  }>(`SELECT id, source, name, contact_text, need, draft, notified_at, detail FROM followups WHERE id = $1`, [id]);
  const f = rows[0];
  if (!f) return false;
  if (f.notified_at) return true;
  const key = `followup_email:${id}`;
  if (!isEmailConfigured()) {
    await recordException('followup_email', key, id, '邮件服务未配置');
    return false;
  }
  const link = `${(base || process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '')}/zh/staff/followups`;
  const lines = [
    `来源：${SOURCE_LABEL[f.source]}`,
    `称呼：${f.name || '未留'}`,
    `联系方式：${f.contact_text || '未留'}`,
    `需求：${f.need || '—'}`,
    f.draft ? `\n建议联系内容（草稿，请人工确认后再发）：\n${f.draft}` : '',
    `\n后台处理：${link}`
  ].filter(Boolean);
  try {
    const res = await getResend().emails.send({
      from: getFromAddress(),
      to: leadNotifyEmail(),
      subject: `【SAREC ${SOURCE_LABEL[f.source]}】${oneLine(f.name || '访客', 40)}${f.need ? ' · ' + oneLine(f.need, 30) : ''}`,
      text: lines.join('\n')
    });
    if (res.error) throw new Error(res.error.message);
    await pool.query(`UPDATE followups SET notified_at = now() WHERE id = $1 AND notified_at IS NULL`, [id]);
    await resolveException(key, 'system');
    return true;
  } catch (e) {
    await recordException('followup_email', key, id, e instanceof Error ? e.message : 'send failed');
    return false;
  }
}

// ── 后台列表与状态流转 ──────────────────────────────────────────────────

export async function listFollowups(f: { status?: string | null; source?: string | null; q?: string | null } = {}) {
  const { rows } = await getPool().query(
    `SELECT f.id, f.source, f.name, f.contact_text, f.need, f.draft, f.draft_by, f.status, f.owner, f.next_date::text AS next_date,
            f.created_at, f.updated_at, f.notified_at, f.contact_id, e.title AS event_title, c.member_no::int AS member_no
       FROM followups f LEFT JOIN events e ON e.id = f.event_id LEFT JOIN contacts c ON c.id = f.contact_id
      WHERE ($1::text IS NULL OR f.status = $1) AND ($2::text IS NULL OR f.source = $2)
        AND ($3::text IS NULL OR f.name ILIKE '%' || $3 || '%' OR f.contact_text ILIKE '%' || $3 || '%' OR f.need ILIKE '%' || $3 || '%')
      ORDER BY (f.status IN ('won','dropped')), f.next_date NULLS FIRST, f.created_at DESC LIMIT 300`,
    [f.status || null, f.source || null, f.q?.trim() || null]
  );
  const { rows: counts } = await getPool().query<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM followups GROUP BY status`);
  return { followups: rows, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) };
}

export async function followupLog(id: string) {
  const { rows } = await getPool().query(
    `SELECT actor, from_status, to_status, note, created_at FROM followup_log WHERE followup_id = $1 ORDER BY created_at`,
    [id]
  );
  return rows;
}

export async function updateFollowup(
  actor: string,
  id: string,
  b: { status?: string; owner?: string | null; nextDate?: string | null; note?: string | null; draft?: string | null }
) {
  const pool = getPool();
  const { rows } = await pool.query<{ status: FollowupStatus }>(`SELECT status FROM followups WHERE id = $1`, [id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这条任务');
  if (b.status && !FOLLOWUP_STATUSES.includes(b.status as FollowupStatus)) throw new CrmError('bad_request', '状态不对');
  if (b.nextDate && !/^\d{4}-\d{2}-\d{2}$/.test(b.nextDate)) throw new CrmError('bad_request', '日期格式应为 YYYY-MM-DD');
  await pool.query(
    `UPDATE followups SET status = COALESCE($2, status), owner = CASE WHEN $3::boolean THEN $4 ELSE owner END,
            next_date = CASE WHEN $5::boolean THEN $6::date ELSE next_date END,
            draft = COALESCE($7, draft), updated_at = now() WHERE id = $1`,
    [id, b.status ?? null, b.owner !== undefined, b.owner?.trim() || null, b.nextDate !== undefined, b.nextDate || null, b.draft ?? null]
  );
  if ((b.status && b.status !== rows[0].status) || b.note?.trim()) {
    await pool.query(
      `INSERT INTO followup_log (followup_id, actor, from_status, to_status, note) VALUES ($1, $2, $3, $4, $5)`,
      [id, actor, rows[0].status, b.status ?? rows[0].status, b.note?.trim()?.slice(0, 1000) || null]
    );
  }
  return { ok: true };
}

export async function createManualFollowup(actor: string, b: { name?: string; contactText?: string; need?: string; owner?: string; nextDate?: string }) {
  if (!b.name?.trim() && !b.contactText?.trim()) throw new CrmError('bad_request', '请至少填写称呼或联系方式');
  const r = await upsertFollowup(getPool(), {
    source: 'manual',
    dedupeKey: `manual:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    name: b.name,
    contactText: b.contactText,
    need: b.need
  });
  await updateFollowup(actor, r.id, { owner: b.owner ?? null, nextDate: b.nextDate || null, note: '手动添加' });
  return r;
}

export async function listExceptions(status = 'open') {
  const { rows } = await getPool().query(
    `SELECT id, kind, dedupe_key, ref, error, attempts, status, created_at, updated_at FROM ops_exceptions
      WHERE ($1 = 'all' OR status = $1) ORDER BY updated_at DESC LIMIT 200`,
    [status]
  );
  return rows;
}

/** 重试一条待处理：按类型重新执行（各处理本身幂等，不会重复发送 / 重复计分）。 */
export async function retryException(actor: string, id: string, base?: string): Promise<{ ok: boolean; message: string }> {
  const pool = getPool();
  const { rows } = await pool.query<{ kind: string; dedupe_key: string; ref: string | null; status: string }>(
    `SELECT kind, dedupe_key, ref, status FROM ops_exceptions WHERE id = $1`,
    [id]
  );
  const x = rows[0];
  if (!x) throw new CrmError('not_found', '找不到这条记录');
  if (x.status !== 'open') return { ok: true, message: '已处理过' };
  let ok = false;
  if (x.kind === 'followup_email' && x.ref) ok = await notifyFollowup(x.ref, base);
  else if (x.kind === 'photo_notice' && x.ref) {
    const { sendPhotoNotices } = await import('./photos');
    const r = await sendPhotoNotices(x.ref);
    ok = r.failed === 0;
  } else if (x.kind === 'followup_scan') {
    await scanFollowups();
    ok = true;
  } else if (x.kind === 'agent_lead_email' && x.ref) ok = await notifyFollowup(x.ref, base);
  if (ok) await resolveException(x.dedupe_key, actor);
  return { ok, message: ok ? '重试成功' : '仍未成功，请稍后再试或手动处理' };
}

export async function ignoreException(actor: string, id: string) {
  await getPool().query(`UPDATE ops_exceptions SET status = 'ignored', resolved_by = $2, updated_at = now() WHERE id = $1`, [id, actor]);
}

// ── 定时扫描（每天一次；只查库 + 模板草稿，不调 AI）───────────────────────────

const fmtDate = (d: Date) => laToday(d); // 洛杉矶日期

/** 活动后 24 小时内：报名时选了“近期需求”（Q09）的人；30 天内到期的会员。重复扫描不重复生成。 */
export async function scanFollowups(now = new Date()): Promise<{ postEvent: number; expiring: number }> {
  const pool = getPool();
  let postEvent = 0;
  let expiring = 0;
  // 1) 活动结束后 24 小时内：本场任务里回答了 Q09（近期需求）且有具体需求的人
  const { rows: interested } = await pool.query<{
    contact_id: string; name: string; event_id: string; title: string; value: { choices?: string[]; detail?: string };
    phone: string | null; email: string | null;
  }>(
    `SELECT DISTINCT ON (a.contact_id, e.id) a.contact_id, c.name, e.id AS event_id, e.title, a.value,
            COALESCE(c.phone_e164, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.is_current)) AS phone,
            COALESCE(c.email, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'email' AND m.is_current)) AS email
       FROM events e
       JOIN profile_tasks t ON t.event_id = e.id AND t.kind = 'event'
       JOIN profile_answers a ON a.task_id = t.id AND a.item_code = 'Q09' AND a.status = 'current' AND NOT a.is_unknown
       JOIN contacts c ON c.id = a.contact_id
       JOIN registrations r ON r.event_id = e.id AND r.contact_id = c.id AND r.status <> 'cancelled'
      WHERE coalesce(e.ends_at, e.starts_at) BETWEEN $1::timestamptz - interval '24 hours' AND $1::timestamptz
        AND e.event_status <> 'cancelled'
      ORDER BY a.contact_id, e.id, a.created_at DESC`,
    [now]
  );
  for (const p of interested) {
    const needs = (p.value.choices ?? []).filter((x) => !/没有|暂不/.test(x));
    if (!needs.length) continue;
    const need = needs.join('、') + (p.value.detail ? `（${p.value.detail}）` : '');
    const r = await upsertFollowup(pool, {
      source: 'post_event_interest',
      dedupeKey: `post_event:${p.event_id}:${p.contact_id}`,
      contactId: p.contact_id,
      name: p.name,
      contactText: [p.phone, p.email].filter(Boolean).join(' / '),
      need: `参加「${p.title}」后希望了解：${need}`,
      draft: `${p.name}您好，我是 SAREC 中美房地产商会的工作人员。感谢您参加「${p.title}」。您在报名时提到希望了解${needs.join('、')}，方便的话我们约个时间简单聊聊，看看商会能帮上什么忙。`,
      eventId: p.event_id,
      nextDate: fmtDate(now)
    });
    if (r.created) postEvent++;
  }
  // 2) 30 天内到期的有效会员（每个到期日只生成一次）
  const { rows: exp } = await pool.query<{ contact_id: string; name: string; end_date: string; tier: string | null; phone: string | null; email: string | null }>(
    `SELECT DISTINCT ON (a.contact_id) a.contact_id, c.name, a.membership_end_date::text AS end_date, t.name_zh AS tier, c.phone_e164 AS phone, c.email
       FROM applications a
       JOIN contacts c ON c.id = a.contact_id
       LEFT JOIN membership_tiers t ON t.slug = a.selected_tier_slug
      WHERE (a.application_status IN ('approved','paid','second_payment_due')
             OR (a.application_status = 'under_review' AND a.payment_status IN ('paid','partially_paid')))
        AND a.membership_end_date BETWEEN $1::date AND $1::date + 30
        -- 已经续费（有更晚的有效会籍）的不提醒
        AND NOT EXISTS (SELECT 1 FROM applications b WHERE b.contact_id = a.contact_id AND b.membership_end_date > $1::date + 30
                         AND b.application_status IN ('approved','paid','second_payment_due'))
      ORDER BY a.contact_id, a.membership_end_date DESC`,
    [fmtDate(now)]
  ).catch(async (e) => {
    await recordException('followup_scan', `followup_scan:expiring:${fmtDate(now)}`, null, e instanceof Error ? e.message : 'query failed');
    return { rows: [] as never[] };
  });
  for (const m of exp) {
    const r = await upsertFollowup(pool, {
      source: 'expiring_member',
      dedupeKey: `expiring:${m.contact_id}:${m.end_date}`,
      contactId: m.contact_id,
      name: m.name,
      contactText: [m.phone, m.email].filter(Boolean).join(' / '),
      need: `${m.tier ?? '会员'}将于 ${m.end_date} 到期`,
      draft: `${m.name}您好，您的 SAREC 会籍将于 ${m.end_date} 到期。感谢您一直以来的支持，续费可在网站“会员”页完成；有任何问题随时联系我们。`,
      nextDate: fmtDate(now)
    });
    if (r.created) expiring++;
  }
  return { postEvent, expiring };
}
