/**
 * 1.5.1 指令 46：小程序里直接填「发布活儿」——做成"请商会帮忙找师傅"的预约，不是公开发帖。
 *   - 客户填：工种、城市、一句话要干什么；手机用已验证的（没验证的先去现有的验证手机页）。
 *   - 交上来先进后台（jobs_posts.status = 'pending'，source = 'mp'），只有本人和工作人员看得到；
 *     工作人员看过点「派给师傅」才变成 open，照常通知对口、核验过的接活人；不合适就「不派」（下架）。
 *   - 小程序里不出现任何用户发布的公开列表；网站公开的「全部活儿」也不列小程序交来的（只通知对口的人）。
 *   - 一句话过微信内容安全（msgSecCheck，用本人的小程序 openid）：明确违规的不收；拿不准 / 没检测（测试站没有微信密钥）照收，工作人员反正要看。
 *   - 后台开关 jobs_post_in_app（默认开）关掉 → 小程序照旧弹「加商会微信＋复制网址」。
 */
import { randomUUID } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import type { Db } from '@/lib/crm/profile';
import { verifiedPhone, type Viewer } from './access';
import { POST_DAYS } from './constants';
import { resolveCity } from './cities';
import { checkPostQuota } from './quota';
import { checkDescription, openidOf, saveSec } from './secCheck';
import { getSwitches } from './settings';
import { tradeMap } from './trades';
import { makeTitle } from './posts';

export const RECEIVED_TEXT = '收到了，商会会帮你联系合适的师傅';
export const RECEIVED_SUB = '工作人员看过后，转给对口、核验过的师傅，师傅会打你的电话。';
const MAX_LEN = 200;
const DAY_LIMIT = 5;

/** 0049 跑过没有（jobs_posts.source 这一列在不在）。跑过就记住；没跑过下次再查（上线时先跑迁移、再合并代码） */
let ready = false;
export async function requestsReady(db: Db = getPool()): Promise<boolean> {
  if (ready) return true;
  const { rows } = await db
    .query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs_posts' AND column_name = 'source' LIMIT 1`)
    .catch(() => ({ rows: [] as unknown[] }));
  ready = rows.length > 0;
  return ready;
}

/** 小程序「发布活儿」现在走哪种：in_app = 小程序里直接填；sheet = 老的「加商会微信＋复制网址」 */
export async function postMode(db: Db = getPool()): Promise<'in_app' | 'sheet'> {
  const s = await getSwitches(db);
  return s.postInApp && (await requestsReady(db)) ? 'in_app' : 'sheet';
}

/** 填写页要的：已验证的手机（自动带出）、现在的做法 */
export async function requestForm(v: Viewer) {
  const pool = getPool();
  const phone = v.contactId ? await verifiedPhone(pool, v.contactId) : null;
  return { mode: await postMode(pool), phone, maxLen: MAX_LEN, receivedText: RECEIVED_TEXT, receivedSub: RECEIVED_SUB };
}

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

export async function createRequest(v: Viewer, contactId: string, b: Record<string, unknown>) {
  const pool = getPool();
  if ((await postMode(pool)) !== 'in_app') throw new CrmError('not_open', '请加商会微信，告诉工作人员要干什么');
  const trades = await tradeMap(pool);
  const t = typeof b.trade === 'string' ? trades.get(b.trade) : undefined;
  if (!t || (!t.open && !v.staff)) throw new CrmError('bad_request', '请选要干什么活');
  if (t.noPost) throw new CrmError('bad_request', `「${t.name}」请加商会微信，工作人员帮你联系`);
  const city = await resolveCity(pool, b.cityKey ?? b.city);
  if (!city) throw new CrmError('bad_request', '请选在哪个城市');
  const description = str(b.description, MAX_LEN);
  if (description.length < 2) throw new CrmError('bad_request', '请用一句话说说要干什么');
  const phone = await verifiedPhone(pool, contactId);
  if (!phone) throw new CrmError('need_phone', '先验证手机号：师傅要能打电话给你');
  await checkPostQuota(pool, contactId, await getSwitches(pool), v.staff);
  const { rows: n } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM jobs_posts WHERE contact_id = $1 AND source = 'mp' AND created_at > now() - interval '1 day'`,
    [contactId]
  );
  if ((n[0]?.n ?? 0) >= DAY_LIMIT && !v.staff) throw new CrmError('too_many_attempts', '今天已经交了好几次了，商会正在看；着急的话可以加商会微信');
  // 微信内容安全：明确违规的不收（不存）；其余照收，工作人员看过才派
  const sec = await checkDescription(description, await openidOf(pool, contactId)).catch(() => ({ status: 'unchecked' as const, note: 'error' }));
  if (sec.status === 'risky') throw new CrmError('bad_request', '这句话里有不合适的内容，改一改再交');
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO jobs_posts (batch_id, contact_id, poster_role, trade_key, city_key, city, title, description, timing, phone, status, source, expires_at)
     VALUES ($1, $2, 'owner', $3, $4, $5, $6, $7, 'flexible', $8, 'pending', 'mp', now() + make_interval(days => $9)) RETURNING id`,
    [randomUUID(), contactId, t.key, city.key, city.name, makeTitle(city.name, t.name, description, 'owner', null), description, phone, POST_DAYS]
  );
  await saveSec(pool, [rows[0].id], sec);
  return { id: rows[0].id, message: RECEIVED_TEXT, sub: RECEIVED_SUB };
}

/** 工作人员「派给师傅」：pending → open（从今天起算 14 天），人工看过就算内容审过，然后照常通知对口的接活人 */
export async function approveRequest(db: Db, id: string, actor: string): Promise<{ notified: number }> {
  const { rowCount } = await db.query(
    `UPDATE jobs_posts SET status = 'open', expires_at = now() + make_interval(days => $3), updated_at = now(),
            sec_status = CASE WHEN sec_status = 'risky' THEN sec_status ELSE 'pass' END,
            sec_note = CASE WHEN sec_status = 'pass' THEN sec_note ELSE $2 END, sec_checked_at = now()
      WHERE id = $1 AND status = 'pending'`,
    [id, actor, POST_DAYS]
  );
  if (!rowCount) throw new CrmError('conflict', '这一条已经处理过了（派过或不派了），刷新看看');
  const { dispatchPost } = await import('./notify');
  const r = await dispatchPost(id, 1).catch(() => ({ picked: 0, sent: 0, blocked: 0 }));
  return { notified: r.picked };
}
