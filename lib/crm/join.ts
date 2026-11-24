/**
 * 1.3.1 C：加入商会（小程序入会申请）。
 * - 小程序里全程不出现金额、价格、付款字样：申请只记“想入会”的意向。
 * - 提交后：工作台 / 后台“待跟进”出一条，邮件通知 info@；客户端显示“已收到申请，工作人员会联系您”。
 * - 助理确认后一键把网站缴费链接用短信或邮件发给申请人（也可复制链接自己发微信）。
 * - 7 天没付：提醒助理跟进一次（生成一条待跟进），不自动给客户发催促。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError, normalizePhone } from '@/lib/crm/events';
import { memberStatus } from '@/lib/crm/membership';
import { benefitsContent } from '@/lib/benefitsContent';
import type { Staff } from '@/lib/crm/auth';
import { actor, audit } from '@/lib/crm/staff';
import { notifyFollowup, recordException, upsertFollowup } from '@/lib/crm/followups';
import { isNotReal, realContact } from '@/lib/crm/accountKind';
import { maskTarget } from '@/lib/crm/notifyGate';
import { gatedSend } from '@/lib/crm/notifySend';
import { notifyStaffSafe } from '@/lib/crm/staffNotify';

export const INDUSTRIES = ['开发商', '经纪', '贷款', '投资人', '律师会计', '建筑装修', '其他'];

/** 会员权益：只列已经有的（以网站会员页现有内容为准）；还没上线的不列，不放“筹备中”占位（东哥 11/9）。 */
export function joinBenefits() {
  return [
    ...benefitsContent.items.map((b) => ({ title: b.title, body: b.body, status: 'live' as const })),
    { title: '电子名片与名片夹', body: '一张高端电子名片，现场扫码互换，按活动分组找人。', status: 'live' as const },
  ];
}

const membershipLink = () => `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '')}/zh/join`;

/** 小程序“加入商会”页：权益 + 已有资料自动带入 + 当前申请状态。 */
export async function joinPage(contactId: string | null) {
  const pool = getPool();
  const out = { benefits: joinBenefits(), industries: INDUSTRIES, isMember: false, prefill: { name: '', company: '', industry: '', phone: '' }, request: null as null | { status: string; createdAt: Date } };
  if (!contactId) return out;
  const ms = await memberStatus(pool, contactId);
  out.isMember = ms.isMember;
  const { rows } = await pool.query<{ name: string | null; phone: string | null; company: string | null; industry: string | null }>(
    `SELECT NULLIF(c.name, '微信用户') AS name,
            COALESCE(c.phone_e164, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.is_current)) AS phone,
            (SELECT co.name FROM contact_companies cc JOIN companies co ON co.id = cc.company_id WHERE cc.contact_id = c.id ORDER BY cc.is_primary DESC LIMIT 1) AS company,
            (SELECT a.value->>'choice' FROM profile_answers a WHERE a.contact_id = c.id AND a.item_code = 'CK:profession' AND a.status = 'current' LIMIT 1) AS industry
       FROM contacts c WHERE c.id = $1`,
    [contactId]
  ).catch(async () => pool.query<{ name: string | null; phone: string | null; company: string | null; industry: string | null }>(
    `SELECT NULLIF(name, '微信用户') AS name, phone_e164 AS phone, NULL AS company, NULL AS industry FROM contacts WHERE id = $1`,
    [contactId]
  ));
  const r = rows[0];
  if (r) out.prefill = { name: r.name ?? '', company: r.company ?? '', industry: r.industry && INDUSTRIES.includes(r.industry) ? r.industry : '', phone: r.phone ?? '' };
  const { rows: jr } = await pool.query<{ status: string; created_at: Date }>(
    `SELECT status, created_at FROM join_requests WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [contactId]
  );
  if (jr[0]) out.request = { status: jr[0].status, createdAt: jr[0].created_at };
  return out;
}

export async function submitJoin(contactId: string, b: { name?: string; company?: string; industry?: string; phone?: string; source?: string; slug?: string }, base?: string) {
  const name = String(b.name ?? '').trim().slice(0, 60);
  const company = String(b.company ?? '').trim().slice(0, 100);
  const industry = INDUSTRIES.includes(String(b.industry)) ? String(b.industry) : '';
  const phone = b.phone ? normalizePhone(String(b.phone)) : null;
  const miss = [name ? '' : '姓名', b.phone ? '' : '手机'].filter(Boolean);
  if (miss.length) throw new CrmError('incomplete', `还差：${miss.join('、')}`);
  if (!phone) throw new CrmError('bad_phone', '手机号格式不对：美国号码 10 位，中国号码请加 +86');
  const pool = getPool();
  const ms = await memberStatus(pool, contactId);
  if (ms.isMember) throw new CrmError('already_member', '您已经是会员了，可以在“我的会员卡”里查看');
  const { id, created } = await withTransaction(async (db) => {
    const { rows: open } = await db.query<{ id: string }>(`SELECT id FROM join_requests WHERE contact_id = $1 AND status IN ('new','link_sent')`, [contactId]);
    if (open[0]) {
      await db.query(`UPDATE join_requests SET name = $2, company = $3, industry = $4, phone = $5, updated_at = now() WHERE id = $1`, [open[0].id, name, company || null, industry || null, phone]);
      return { id: open[0].id, created: false };
    }
    const { rows: ev } = b.slug ? await db.query<{ id: string }>(`SELECT id FROM events WHERE slug = $1`, [b.slug]) : { rows: [] as { id: string }[] };
    const { rows: email } = await db.query<{ e: string | null }>(
      `SELECT COALESCE(email, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'email' AND m.is_current)) AS e FROM contacts c WHERE id = $1`,
      [contactId]
    );
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO join_requests (contact_id, name, company, industry, phone, email, source, event_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [contactId, name, company || null, industry || null, phone, email[0]?.e ?? null, String(b.source ?? 'home').slice(0, 20), ev[0]?.id ?? null]
    );
    await import('@/lib/org/guest').then((m) => m.linkToChamber(db, contactId, '申请入会'));
    return { id: rows[0].id, created: true };
  });
  let linkSent = false;
  // 1.5.0 体验1（第三部分 7）：真发到了哪里——短信发到了说"手机"，只有邮件发到了说"邮箱"；都没发出去不提链接（不出现金额）
  let linkChannel: 'sms' | 'email' | null = null;
  if (created) {
    const internal = await isNotReal(pool, contactId);
    // 后台综合优化 一.1：申请一提交，系统立刻把网站缴费链接发给申请人（短信，有邮箱同时发邮件）；走通知总闸
    const auto = await autoSendJoinLink(id).catch(() => ({ sent: false, skipped: 'error' as string | null, log: [] as LinkLogEntry[] }));
    linkSent = auto.sent;
    linkChannel = auto.log.some((l) => l.channel === 'sms' && l.status === 'sent') ? 'sms' : auto.sent ? 'email' : null;
    if (!internal) {
      const f = await upsertFollowup(pool, {
        source: 'manual',
        dedupeKey: `join:${id}`,
        contactId,
        name,
        contactText: phone,
        need: `入会申请（小程序）${company ? ' · ' + company : ''}${industry ? ' · ' + industry : ''}。${auto.sent ? '系统已自动把网站缴费链接发给申请人。' : '系统自动发缴费链接没有送到（见入会申请页记录），请在后台“入会申请”里再发一次。'}`
      });
      await notifyFollowup(f.id, base).catch(() => false);
      await notifyStaffSafe({ category: 'join_request', key: `join:${id}`, title: '有一条新入会申请', href: `/zh/staff/join-requests?id=${id}` });
    }
  }
  return {
    id,
    message: linkSent ? (linkChannel === 'sms' ? '已收到申请，缴费链接已发到您的手机' : '已收到申请，缴费链接已发到您的邮箱') : '已收到申请，工作人员会联系您',
    linkSent,
    linkChannel
  };
}

export async function listJoinRequests(status?: string | null, id?: string | null) {
  const { rows } = await getPool().query(
    `SELECT j.*, c.member_no::int, e.title AS event_title, c.account_kind,
            (j.status IN ('new','link_sent') AND j.created_at < now() - interval '7 days') AS overdue,
            (j.status IN ('new','link_sent') AND j.created_at < now() - interval '3 days' AND j.nudged_at IS NULL) AS unpaid3
       FROM join_requests j JOIN contacts c ON c.id = j.contact_id LEFT JOIN events e ON e.id = j.event_id
      WHERE ($1::text IS NULL OR j.status = $1) AND ($2::uuid IS NULL OR j.id = $2)
      ORDER BY (j.status IN ('new','link_sent')) DESC, j.created_at DESC LIMIT 200`,
    [status || null, id && /^[0-9a-f-]{36}$/i.test(id) ? id : null]
  );
  return rows;
}

export function joinLinkText(name: string) {
  return `${name || ''}您好，感谢申请加入中美房地产商会 SAREC。请在商会网站完成入会：${membershipLink()} 有问题直接回复或加商会微信。`;
}

/** 助理一键发网站缴费链接（短信 / 邮件 / 只标记“已复制链接”）。 */
export async function sendJoinLink(s: Staff, id: string, channel: 'sms' | 'email' | 'copy') {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; name: string; phone: string | null; email: string | null; status: string }>(`SELECT id, name, phone, email, status FROM join_requests WHERE id = $1`, [id]);
  const j = rows[0];
  if (!j) throw new CrmError('not_found', '找不到这份申请');
  const text = joinLinkText(j.name);
  let ok = true;
  if (channel === 'sms') {
    if (!j.phone) throw new CrmError('bad_request', '申请人没有留手机号，请改用邮件或复制链接');
    const { smsSend } = await import('@/lib/crm/payLinks');
    ok = await smsSend(j.phone, text);
    if (!ok) throw new CrmError('sms_failed', '短信没发出去（短信服务未配置或号码有误），请改用邮件或复制链接发微信');
  } else if (channel === 'email') {
    if (!j.email) throw new CrmError('bad_request', '申请人没有留邮箱，请改用短信或复制链接');
    const { getResend, getFromAddress, isEmailConfigured } = await import('@/lib/email/resend-client');
    if (!isEmailConfigured()) throw new CrmError('email_unavailable', '邮件服务未配置，请改用短信或复制链接');
    const res = await getResend().emails.send({ from: getFromAddress(), to: j.email, subject: '【SAREC】入会申请：请在网站完成入会', text });
    if (res.error) throw new CrmError('email_failed', '邮件没发出去，请改用短信或复制链接');
  }
  await pool.query(
    `UPDATE join_requests SET status = CASE WHEN status = 'new' THEN 'link_sent' ELSE status END, link_sent_at = now(), link_sent_by = $2, link_channel = $3, updated_at = now(),
            link_log = link_log || $4::jsonb WHERE id = $1`,
    [id, actor(s), channel, JSON.stringify([{ at: new Date().toISOString(), by: s.name, channel, to: channel === 'sms' && j.phone ? maskTarget('sms', j.phone) : channel === 'email' && j.email ? maskTarget('email', j.email) : '复制后自己发', status: channel === 'copy' ? 'copied' : 'sent', text }])]
  );
  await audit(pool as never, s, 'join_link_sent', 'join_request', id, { after: { channel } });
  return { ok, text: channel === 'copy' ? text : undefined };
}

export async function setJoinStatus(s: Staff, id: string, status: 'paid' | 'closed' | 'new', note?: string) {
  const { rowCount } = await getPool().query(`UPDATE join_requests SET status = $2, note = coalesce($3, note), updated_at = now() WHERE id = $1`, [id, status, note ?? null]);
  if (!rowCount) throw new CrmError('not_found', '找不到这份申请');
  await audit(getPool() as never, s, 'join_status', 'join_request', id, { after: { status } });
  return { ok: true };
}

/** 3 天没缴费的那条，工作人员跟过一次（今天页“我跟进了”） */
export async function markJoinNudged(s: Staff, id: string) {
  const { rowCount } = await getPool().query(`UPDATE join_requests SET nudged_at = now(), nudged_by = $2, updated_at = now() WHERE id = $1`, [id, s.name]);
  if (!rowCount) throw new CrmError('not_found', '找不到这份申请');
  await audit(getPool() as never, s, 'join_nudged', 'join_request', id, {});
  return { ok: true };
}

export type LinkLogEntry = { at: string; by: string; channel: 'sms' | 'email' | 'copy'; to: string; status: string; text: string };

/**
 * 后台综合优化 一.1：系统自动发网站缴费链接（短信；有邮箱同时发邮件）。全部过通知总闸：
 * 总闸关着只记录“本该发什么、发给谁（打码）”，记在这条申请的 link_log 上。
 * 内部 / 审核演示 / 测试账号不发。已经自动发过（auto_link_at）不再发，除非 force（补发脚本在总闸打开后用）。
 */
export async function autoSendJoinLink(id: string, opts: { force?: boolean } = {}): Promise<{ sent: boolean; skipped: string | null; log: LinkLogEntry[] }> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; name: string; phone: string | null; email: string | null; status: string; auto_link_at: Date | null; link_sent_at: Date | null; account_kind: string | null }>(
    `SELECT j.id, j.name, j.phone, COALESCE(j.email, c.email) AS email, j.status, j.auto_link_at, j.link_sent_at, c.account_kind
       FROM join_requests j JOIN contacts c ON c.id = j.contact_id WHERE j.id = $1`,
    [id]
  );
  const j = rows[0];
  if (!j) throw new CrmError('not_found', '找不到这份申请');
  if (j.account_kind) return { sent: false, skipped: '内部 / 测试账号，不发', log: [] };
  if (!['new', 'link_sent'].includes(j.status)) return { sent: false, skipped: '申请已处理', log: [] };
  if (!opts.force && (j.auto_link_at || j.link_sent_at)) return { sent: false, skipped: '已经发过', log: [] };
  const text = joinLinkText(j.name);
  const log: LinkLogEntry[] = [];
  const targets: { channel: 'sms' | 'email'; to: string }[] = [];
  if (j.phone) targets.push({ channel: 'sms', to: j.phone });
  if (j.email) targets.push({ channel: 'email', to: j.email });
  for (const t of targets) {
    const r = await gatedSend({ kind: '入会缴费链接', channel: t.channel, to: t.to, subject: '【SAREC】入会申请：请在网站完成入会', text, ref: id, dedupeKey: `join_link:${id}:${t.channel}${opts.force ? `:${Date.now()}` : ''}` });
    log.push({ at: new Date().toISOString(), by: '系统自动', channel: t.channel, to: maskTarget(t.channel, t.to), status: r.status, text });
  }
  const sent = log.some((l) => l.status === 'sent');
  const firstSent = log.find((l) => l.status === 'sent');
  await pool.query(
    `UPDATE join_requests SET link_log = link_log || $2::jsonb, auto_link_at = now(), updated_at = now(),
            status = CASE WHEN $3::boolean AND status = 'new' THEN 'link_sent' ELSE status END,
            link_sent_at = CASE WHEN $3::boolean THEN now() ELSE link_sent_at END,
            link_sent_by = CASE WHEN $3::boolean THEN '系统自动' ELSE link_sent_by END,
            link_channel = CASE WHEN $3::boolean THEN $4 ELSE link_channel END
      WHERE id = $1`,
    [id, JSON.stringify(log), sent, firstSent?.channel ?? null]
  );
  if (log.some((l) => l.status === 'failed') && !sent) {
    await recordException('join_link', `join_link:${id}`, id, !targets.length ? '申请人没留手机和邮箱，缴费链接发不出去' : '缴费链接短信 / 邮件都没发出去，请在入会申请页手动再发一次').catch(() => undefined);
  }
  if (!targets.length) {
    await recordException('join_link', `join_link:${id}`, id, '申请人没留手机和邮箱，缴费链接发不出去，请复制链接发微信').catch(() => undefined);
  }
  return { sent, skipped: null, log };
}

/** 积压的未处理申请（没发过链接的）：补发脚本用。内部 / 测试账号除外。 */
export async function backlogJoinRequests() {
  const { rows } = await getPool().query<{ id: string; name: string; phone: string | null; email: string | null; created_at: Date; auto_link_at: Date | null }>(
    `SELECT j.id, j.name, j.phone, COALESCE(j.email, c.email) AS email, j.created_at, j.auto_link_at
       FROM join_requests j JOIN contacts c ON c.id = j.contact_id
      WHERE j.status = 'new' AND j.link_sent_at IS NULL AND ${realContact('c')}
      ORDER BY j.created_at`
  );
  return rows;
}

/** 每天跑：申请满 7 天还没付 → 提醒助理跟进一次（不给客户发）。会员已生效的自动标“已付”。 */
export async function scanJoinFollowups(): Promise<{ paid: number; reminded: number }> {
  const pool = getPool();
  const { rows: open } = await pool.query<{ id: string; contact_id: string; name: string; phone: string | null; created_at: Date; followup_at: Date | null; account_kind: string | null }>(
    `SELECT j.id, j.contact_id, j.name, j.phone, j.created_at, j.followup_at, c.account_kind FROM join_requests j JOIN contacts c ON c.id = j.contact_id
      WHERE j.status IN ('new','link_sent')`
  );
  let paid = 0;
  let reminded = 0;
  for (const j of open) {
    if ((await memberStatus(pool, j.contact_id)).isMember) {
      await pool.query(`UPDATE join_requests SET status = 'paid', updated_at = now() WHERE id = $1`, [j.id]);
      paid++;
      continue;
    }
    if (!j.account_kind && !j.followup_at && Date.now() - new Date(j.created_at).getTime() > 7 * 86400_000) {
      await upsertFollowup(pool, {
        source: 'manual',
        dedupeKey: `join7:${j.id}`,
        contactId: j.contact_id,
        name: j.name,
        contactText: j.phone,
        need: '入会申请 7 天还没完成缴费，请跟进一次（系统不会自动催客户）'
      });
      await pool.query(`UPDATE join_requests SET followup_at = now() WHERE id = $1`, [j.id]);
      reminded++;
    }
  }
  return { paid, reminded };
}
