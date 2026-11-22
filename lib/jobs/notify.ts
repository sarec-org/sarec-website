/**
 * 找工人 · 接活儿：通知与定时任务（D4）
 * ------------------------------------------------------------------
 * 发消息的保险（任何环境都不给真人乱发）：
 *   - 正式环境（VERCEL_ENV=production）：两个开关（找工人、接活）都开着才真发；任何一个关着，一条都不发（记 blocked）。
 *   - 其它环境（测试站、本地）：只发给测试身份（姓名以「验收」开头，或在 JOBS_TEST_CONTACT_IDS / PREVIEW_SMS_ALLOW 里）；
 *     其他人一律 blocked。短信再经过 smsSend 自己的测试号码白名单。
 * 渠道：微信订阅消息（用户允许一次发一条，jobs_pros.wx_quota）优先，没有就短信兜底（现有 Twilio）。
 * 每一次（包括没发出的）都记在 jobs_notifications，后台能看到。
 * 给工作人员的提醒一律进后台「待跟进」（ops_exceptions），不发消息。
 */
import { getPool } from '@/lib/db/client';
import type { Db } from '@/lib/crm/profile';
import { smsSend } from '@/lib/crm/payLinks';
import { recordException } from '@/lib/crm/followups';
import { withWxToken, wxConfigured } from '@/lib/crm/wechat';
import { anyPhone } from './access';
import { BATCH_SIZE, FOLLOWUP_DAY, REMIND_BEFORE_DAYS, SECOND_BATCH_HOURS, timingLabel, webBase } from './constants';
import { getSwitches } from './settings';
import { tradeMap } from './trades';

type Tmpl = { id: string; fields: { title?: string; time?: string; place?: string; note?: string } };
/** 环境变量 WX_SUBSCRIBE_TEMPLATES.jobs（原来的读法，保留） */
export function jobsTemplate(): Tmpl | null {
  try {
    const raw = JSON.parse(process.env.WX_SUBSCRIBE_TEMPLATES || '{}') as Record<string, Tmpl>;
    const t = raw.jobs;
    return t?.id && t.fields ? t : null;
  } catch {
    return null;
  }
}

/**
 * 1.5.0 体验1（第三部分 9）：「新活儿」微信订阅消息模板——只留接口，东哥在微信后台申请到模板 ID 后接上：
 *   先读设置 crm_settings.jobs_wx_template = { id, fields: { title, time, place, note } }（不用新增 Vercel 变量，管理员在库里写一行即可），
 *   没有再读环境变量 WX_SUBSCRIBE_TEMPLATES.jobs；都没有 → 只发短信（现在的样子）。
 *   fields 的值是模板里对应字段的 key（例 thing1、time2、thing3、thing4）。
 */
export async function loadJobsTemplate(db?: Db): Promise<Tmpl | null> {
  try {
    const { getSetting } = await import('@/lib/crm/orders');
    const v = await getSetting<unknown>(db ?? getPool(), 'jobs_wx_template', null);
    const t = (typeof v === 'string' ? JSON.parse(v) : v) as Tmpl | null;
    if (t && typeof t.id === 'string' && t.id.trim() && t.fields && typeof t.fields === 'object') return { id: t.id.trim(), fields: t.fields };
  } catch {
    /* 读不到设置就看环境变量 */
  }
  return jobsTemplate();
}

// ── 保险：能不能真发 ─────────────────────────────────────────────────
export const isProduction = () => process.env.VERCEL_ENV === 'production';

export async function isTestIdentity(db: Db, contactId: string): Promise<boolean> {
  const ids = (process.env.JOBS_TEST_CONTACT_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (ids.includes(contactId)) return true;
  const { rows } = await db.query<{ name: string | null; phone: string | null }>(`SELECT name, phone_e164 AS phone FROM contacts WHERE id = $1`, [contactId]);
  const r = rows[0];
  if (!r) return false;
  if ((r.name ?? '').startsWith('验收')) return true;
  const allow = (process.env.PREVIEW_SMS_ALLOW || '').split(',').map((x) => x.trim()).filter(Boolean);
  return !!r.phone && allow.includes(r.phone);
}

export async function sendPolicy(db: Db, contactId: string): Promise<{ real: boolean; why: string }> {
  if (isProduction()) {
    const s = await getSwitches(db);
    return s.find && s.work ? { real: true, why: 'production' } : { real: false, why: 'switch_off' };
  }
  return (await isTestIdentity(db, contactId)) ? { real: true, why: 'test_identity' } : { real: false, why: 'not_test_identity' };
}

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type Msg = {
  kind: 'dispatch' | 'renew' | 'followup' | 'license' | 'verify' | 'invite';
  contactId: string; postId?: string | null; proId?: string | null; round?: number;
  sms: string; wx?: { title: string; place: string; note: string; page: string };
};

/** 发一条：按保险决定发不发，选渠道，记录结果。返回记录的状态。 */
export async function deliver(db: Db, m: Msg, existingLogId?: string): Promise<string> {
  const policy = await sendPolicy(db, m.contactId);
  let channel = 'none';
  let status = 'blocked';
  let detail = policy.why;
  if (policy.real) {
    status = 'no_channel';
    detail = '';
    const t = await loadJobsTemplate(db);
    if (m.wx && t && wxConfigured()) {
      const { rows } = await db.query<{ openid: string | null; pro_id: string | null }>(
        `SELECT c.wechat_openid AS openid,
                (SELECT p.id FROM jobs_pros p WHERE p.contact_id = c.id AND p.wx_quota > 0) AS pro_id
           FROM contacts c WHERE c.id = $1`,
        [m.contactId]
      );
      const r = rows[0];
      if (r?.openid && r.pro_id) {
        const { rowCount } = await db.query(`UPDATE jobs_pros SET wx_quota = wx_quota - 1 WHERE id = $1 AND wx_quota > 0`, [r.pro_id]);
        if (rowCount) {
          channel = 'wx';
          try {
            await pushWx(t, r.openid, m.wx);
            status = 'sent';
          } catch (e) {
            status = 'failed';
            detail = (e instanceof Error ? e.message : 'error').slice(0, 200);
          }
        }
      }
    }
    if (status !== 'sent') {
      const phone = await anyPhone(db, m.contactId);
      if (phone) {
        channel = 'sms';
        status = (await smsSend(phone, m.sms)) ? 'sent' : 'failed';
        detail = status === 'failed' ? `${detail ? `${detail}; ` : ''}sms_not_sent` : detail;
      }
    }
  }
  if (existingLogId) {
    await db.query(`UPDATE jobs_notifications SET channel = $2, status = $3, detail = $4 WHERE id = $1`, [existingLogId, channel, status, detail || null]);
  } else {
    await db.query(
      `INSERT INTO jobs_notifications (kind, post_id, pro_id, contact_id, round, channel, status, detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [m.kind, m.postId ?? null, m.proId ?? null, m.contactId, m.round ?? 1, channel, status, detail || null]
    );
  }
  return status;
}

async function pushWx(t: Tmpl, openid: string, v: NonNullable<Msg['wx']>): Promise<void> {
  const now = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date()).replace(',', '');
  const values: Record<string, string> = { title: cut(v.title, 20), time: now, place: cut(v.place, 20), note: cut(v.note, 20) };
  const data: Record<string, { value: string }> = {};
  for (const [k, key] of Object.entries(t.fields)) if (key) data[key] = { value: values[k] };
  const j = await withWxToken(async (token) => {
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ touser: openid, template_id: t.id, page: v.page, data, miniprogram_state: 'formal', lang: 'zh_CN' })
    });
    return (await res.json()) as { errcode?: number };
  }, (r) => r.errcode);
  if (j.errcode) throw new Error(`errcode ${j.errcode}`);
}

// ── 派活 ────────────────────────────────────────────────────────────────
type PostLite = { id: string; contact_id: string; poster_role: string; trade_key: string; city: string; city_key: string | null; title: string; timing: string; status: string; expires_at: Date };

export async function dispatchPost(postId: string, round: number): Promise<{ picked: number; sent: number; blocked: number }> {
  const pool = getPool();
  const { rows } = await pool.query<PostLite>(
    `SELECT id, contact_id, poster_role, trade_key, city, city_key, title, timing, status, expires_at FROM jobs_posts WHERE id = $1`,
    [postId]
  );
  const post = rows[0];
  if (!post || post.status !== 'open' || post.expires_at.getTime() < Date.now()) return { picked: 0, sent: 0, blocked: 0 };
  const trade = (await tradeMap(pool)).get(post.trade_key);
  await pool.query(`UPDATE jobs_posts SET notify_round = GREATEST(notify_round, $2), notified_at = now() WHERE id = $1`, [postId, round]);
  if (!trade || trade.noNotify) return { picked: 0, sent: 0, blocked: 0 };
  const crew = post.poster_role === 'crew';
  const { rows: cands } = await pool.query<{ id: string; contact_id: string }>(
    `SELECT p.id, p.contact_id FROM jobs_pros p
      WHERE ${crew ? `p.role = 'worker' AND p.status = 'verified'` : `p.listed AND p.role <> 'worker'`}
        AND $1 = ANY(p.verified_trades) AND $2 = ANY(p.cities) AND p.contact_id <> $3
        AND NOT EXISTS (SELECT 1 FROM jobs_notifications n WHERE n.kind = 'dispatch' AND n.post_id = $4 AND n.pro_id = p.id)
      ORDER BY p.available_now DESC, random() LIMIT ${BATCH_SIZE}`,
    [post.trade_key, post.city_key ?? '', post.contact_id, postId]
  );
  if (!cands.length && round === 1) {
    await recordException('jobs_no_pros', `jobs_no_pros:${postId}`, postId, `活儿「${post.title}」发布了，但没有对口工种、在${post.city}服务的接活人可以通知`, { postId });
  }
  let sent = 0;
  let blocked = 0;
  const link = `${webBase()}/zh/jobs/posts/${postId}`;
  for (const c of cands) {
    const { rows: ins } = await pool.query<{ id: string }>(
      `INSERT INTO jobs_notifications (kind, post_id, pro_id, contact_id, round, status) VALUES ('dispatch', $1, $2, $3, $4, 'pending')
       ON CONFLICT (post_id, pro_id) WHERE kind = 'dispatch' DO NOTHING RETURNING id`,
      [postId, c.id, c.contact_id, round]
    );
    if (!ins[0]) continue;
    const st = await deliver(pool, {
      kind: 'dispatch', contactId: c.contact_id, postId, proId: c.id, round,
      sms: `SAREC 接活儿提醒：${post.title}（${timingLabel(post.timing)}）。在商会网站查看：${link}`,
      wx: { title: `${trade.name} · ${post.city}`, place: post.city, note: `有新活儿，${timingLabel(post.timing)}`, page: process.env.JOBS_WX_PAGE || 'pages/index/index' }
    }, ins[0].id);
    if (st === 'sent') sent++;
    if (st === 'blocked') blocked++;
  }
  return { picked: cands.length, sent, blocked };
}

/** 发布后漏发的补第一批；24 小时没人联系的发第二批，并提醒工作人员 */
export async function runDispatch(now = new Date()) {
  const pool = getPool();
  const out = { first: 0, second: 0, alerted: 0 };
  const { rows: missed } = await pool.query<{ id: string }>(
    `SELECT id FROM jobs_posts WHERE status = 'open' AND expires_at > $1 AND notify_round = 0 ORDER BY created_at LIMIT 50`,
    [now]
  );
  for (const r of missed) { await dispatchPost(r.id, 1); out.first++; }
  const { rows: quiet } = await pool.query<{ id: string; title: string }>(
    `SELECT id, title FROM jobs_posts WHERE status = 'open' AND expires_at > $1 AND notify_round = 1 AND first_contact_at IS NULL
        AND notified_at < $1::timestamptz - make_interval(hours => $2) ORDER BY created_at LIMIT 50`,
    [now, SECOND_BATCH_HOURS]
  );
  for (const r of quiet) {
    await dispatchPost(r.id, 2);
    out.second++;
    const { rowCount } = await pool.query(`UPDATE jobs_posts SET staff_alerted_at = now() WHERE id = $1 AND staff_alerted_at IS NULL`, [r.id]);
    if (rowCount) {
      await recordException('jobs_no_contact', `jobs_no_contact:${r.id}`, r.id, `活儿「${r.title}」发布 24 小时没人联系，已通知第二批接活人`, { postId: r.id });
      out.alerted++;
    }
  }
  return out;
}

// ── 每天：到期下架、第 12 天提醒续期、第 7 天回访 ─────────────────────
export async function runExpiry(now = new Date()) {
  const pool = getPool();
  const { rowCount: expired } = await pool.query(
    `UPDATE jobs_posts SET status = 'closed', close_reason = 'expired', updated_at = now() WHERE status = 'open' AND expires_at <= $1`,
    [now]
  );
  const { rows: soon } = await pool.query<{ id: string; contact_id: string; title: string; renew_token: string }>(
    `UPDATE jobs_posts SET renew_reminded_at = now()
      WHERE status = 'open' AND renew_reminded_at IS NULL AND expires_at > $1 AND expires_at <= $1::timestamptz + make_interval(days => $2)
      RETURNING id, contact_id, title, renew_token`,
    [now, REMIND_BEFORE_DAYS]
  );
  for (const p of soon) {
    await deliver(pool, {
      kind: 'renew', contactId: p.contact_id, postId: p.id,
      sms: `SAREC：你发的活儿「${p.title}」2 天后自动下架。还要找人就点这里续期 14 天：${webBase()}/zh/jobs/renew/${p.id}?t=${p.renew_token}`
    });
  }
  return { expired: expired ?? 0, reminded: soon.length };
}

export async function runFollowups(now = new Date()) {
  const pool = getPool();
  const { rows: due } = await pool.query<{ id: string; contact_id: string; title: string }>(
    `UPDATE jobs_posts SET followup_sent_at = now()
      WHERE followup_sent_at IS NULL AND status <> 'removed'
        AND created_at <= $1::timestamptz - make_interval(days => $2) AND created_at > $1::timestamptz - make_interval(days => $2 + 7)
      RETURNING id, contact_id, title`,
    [now, FOLLOWUP_DAY]
  );
  let sent = 0;
  for (const p of due) {
    const { rows: viewers } = await pool.query<{ viewer_contact_id: string }>(
      `SELECT viewer_contact_id FROM jobs_contacts WHERE direction = 'post' AND post_id = $1`,
      [p.id]
    );
    const people: { id: string; side: 'poster' | 'pro' }[] = [{ id: p.contact_id, side: 'poster' }, ...viewers.map((v) => ({ id: v.viewer_contact_id, side: 'pro' as const }))];
    for (const who of people) {
      const { rows } = await pool.query<{ token: string }>(
        `INSERT INTO jobs_followups (post_id, contact_id, side, sent_at) VALUES ($1, $2, $3, now()) ON CONFLICT (post_id, contact_id) DO NOTHING RETURNING token`,
        [p.id, who.id, who.side]
      );
      if (!rows[0]) continue;
      await deliver(pool, {
        kind: 'followup', contactId: who.id, postId: p.id,
        sms: `SAREC 回访：「${p.title}」联系上了吗？成了吗？点一下就能回答（只给商会工作人员看）：${webBase()}/zh/jobs/followup/${rows[0].token}`
      });
      sent++;
    }
  }
  return { posts: due.length, sent };
}

// ── 回访：一键回答（结果只进后台） ─────────────────────────────────────
export async function followupGet(token: string) {
  const { rows } = await getPool().query<{ side: string; title: string; answered_at: Date | null; reached: boolean | null; deal: boolean | null; satisfied: boolean | null }>(
    `SELECT f.side, p.title, f.answered_at, f.reached, f.deal, f.satisfied FROM jobs_followups f JOIN jobs_posts p ON p.id = f.post_id WHERE f.token = $1`,
    [token]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    title: r.title,
    side: r.side,
    answered: !!r.answered_at,
    questions: [
      { key: 'reached', text: r.side === 'poster' ? '有人联系上你了吗？' : '联系上发布人了吗？' },
      { key: 'deal', text: '成了吗？' },
      { key: 'satisfied', text: '满意吗？' }
    ],
    answers: r.answered_at ? { reached: r.reached, deal: r.deal, satisfied: r.satisfied } : null
  };
}
export async function followupAnswer(token: string, b: Record<string, unknown>) {
  const bool = (v: unknown) => (typeof v === 'boolean' ? v : null);
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 500) || null : null;
  const { rows } = await getPool().query<{ id: string }>(
    `UPDATE jobs_followups SET reached = COALESCE($2, reached), deal = COALESCE($3, deal), satisfied = COALESCE($4, satisfied),
            note = COALESCE($5, note), answered_at = now() WHERE token = $1 RETURNING id`,
    [token, bool(b.reached), bool(b.deal), bool(b.satisfied), note]
  );
  return !!rows[0];
}

/** 核验结果、执照下架：告诉本人（同样走保险） */
export async function notifyPro(contactId: string, proId: string, kind: 'verify' | 'license', text: string) {
  await deliver(getPool(), { kind, contactId, proId, sms: `SAREC 接活儿：${text}` });
}
