/** 活儿：发布（按工种拆单）、列表、详情、改 / 续期 / 状态、我的活儿、联系发布人（看电话的规则） */
import { randomUUID } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import type { Db } from '@/lib/crm/profile';
import { verifiedPhone, type Viewer } from './access';
import {
  POSTER_ROLES, POST_DAYS, PROPERTY_TYPES, SITE_VISIT_TRADES, STATUS_LABEL, TIMINGS, posterLabel, roleLabel, timingLabel,
  type PostStatus, type PosterRole, type Timing
} from './constants';
import { needPayFor, proByContact, refreshPro } from './pros';
import { getSwitches } from './settings';
import { tradeMap, type Trade } from './trades';
import { cityNames, loadCities, resolveCity } from './cities';
import { checkDescription, openidOf, saveSec, type SecOutcome } from './secCheck';
import { QUOTA_USED_UP_TEXT, alreadyContacted, checkPostQuota, freeLeftFor, freeLeftText, markUsedUp, quotaApplies } from './quota';

export type PostRow = {
  id: string; batch_id: string; contact_id: string; poster_role: PosterRole; trade_key: string; city: string; title: string; description: string;
  city_key: string | null; photos: string[]; voice_url: string | null; timing: Timing; budget_range: string | null; property_type: string | null; call_name: string | null;
  phone: string | null; wechat: string | null; crew_headcount: number | null; crew_duration: string | null; crew_pay: string | null;
  want_site_visit: boolean; turnover: boolean; status: PostStatus; close_reason: string | null; expires_at: Date; renew_token: string;
  renew_reminded_at: Date | null; notify_round: number; notified_at: Date | null; first_contact_at: Date | null; staff_alerted_at: Date | null;
  followup_sent_at: Date | null; staff_note: string | null; removed_by: string | null; created_at: Date; updated_at: Date;
};

// ── 标题：城市 · 工种 · 一句话（从描述里截，不用 AI） ──────────────────
export function oneLine(desc: string, max = 16): string {
  const first = desc.replace(/\s+/g, ' ').trim().split(/[。！？!?\n；;，,.]/)[0]?.trim() ?? '';
  if (!first) return '';
  return first.length > max ? `${first.slice(0, max)}…` : first;
}
export function makeTitle(city: string, tradeName: string, desc: string, role: PosterRole, headcount: number | null): string {
  if (role === 'crew') return `${city} · ${tradeName} · 招工人${headcount ? ` ${headcount} 人` : ''}`;
  const line = oneLine(desc);
  return `${city} · ${tradeName} · ${line || '找人'}`;
}

const summary = (d: string) => {
  const lines = d.split(/\n+/).map((x) => x.trim()).filter(Boolean).slice(0, 2).join('\n');
  return lines.length > 90 ? `${lines.slice(0, 89)}…` : lines;
};
const isOpen = (p: PostRow) => p.status === 'open' && p.expires_at.getTime() > Date.now();

export function postCard(p: PostRow, trades: Map<string, Trade>, cities: Map<string, string> = new Map()) {
  return {
    id: p.id,
    title: p.title,
    summary: summary(p.description),
    city: (p.city_key && cities.get(p.city_key)) || p.city,
    cityKey: p.city_key,
    trade: p.trade_key,
    tradeName: trades.get(p.trade_key)?.name ?? p.trade_key,
    posterRole: p.poster_role,
    posterLabel: posterLabel(p.poster_role),
    timing: p.timing,
    timingLabel: timingLabel(p.timing),
    ...(p.budget_range ? { budget: p.budget_range } : {}),
    ...(p.poster_role === 'crew' ? { crew: { headcount: p.crew_headcount, duration: p.crew_duration, ...(p.crew_pay ? { pay: p.crew_pay } : {}) } } : {}),
    status: p.status,
    statusLabel: STATUS_LABEL[p.status],
    createdAt: p.created_at,
    expiresAt: p.expires_at
  };
}

async function postById(db: Db, id: string): Promise<PostRow | null> {
  const { rows } = await db.query<PostRow>(`SELECT * FROM jobs_posts WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

// ── 列表 / 最新 ─────────────────────────────────────────────────────────
export async function listPosts(q: { trade?: string | null; city?: string | null; cursor?: string | null; limit?: number }) {
  const pool = getPool();
  const trades = await tradeMap(pool);
  const offset = Math.max(0, Number(q.cursor) || 0);
  const limit = q.limit ?? 20;
  const cityKey = q.city ? (await resolveCity(pool, q.city, { allowDisabled: true }))?.key ?? '__none__' : null;
  const { rows } = await pool.query<PostRow>(
    `SELECT * FROM jobs_posts WHERE status = 'open' AND expires_at > now()
        AND ($1::text IS NULL OR trade_key = $1) AND ($2::text IS NULL OR city_key = $2)
      ORDER BY created_at DESC, id LIMIT ${limit + 1} OFFSET $3`,
    [q.trade || null, cityKey, offset]
  );
  const { rows: cs } = await pool.query<{ k: string }>(`SELECT DISTINCT city_key AS k FROM jobs_posts WHERE status = 'open' AND expires_at > now() AND city_key IS NOT NULL`);
  const have = new Set(cs.map((r) => r.k));
  const all = await loadCities(pool, { all: true });
  const names = new Map(all.map((c) => [c.key, c.name]));
  return {
    items: rows.slice(0, limit).map((p) => postCard(p, trades, names)),
    cities: all.filter((c) => have.has(c.key)).map((c) => ({ key: c.key, name: c.name })),
    nextCursor: rows.length > limit ? String(offset + limit) : null
  };
}
export async function latestPosts(n = 3) {
  return (await listPosts({ limit: n })).items;
}

// ── 谁能看发布人电话（原始指令第四部分） ────────────────────────────────
export type Eligibility = { ok: true; quota?: { proId: string; left: number } } | { ok: false; code: string; message: string; needPay?: boolean };

export async function eligibility(db: Db, post: PostRow, viewerId: string | null, staff: boolean): Promise<Eligibility> {
  if (viewerId && viewerId === post.contact_id) return { ok: true };
  if (!viewerId) return { ok: false, code: 'unauthorized', message: '请先登录，再登记接活儿' };
  if (!isOpen(post)) return { ok: false, code: 'not_eligible', message: '这个活儿已经找到人或已经关闭了' };
  const trades = await tradeMap(db);
  const t = trades.get(post.trade_key);
  const p0 = await proByContact(db, viewerId);
  if (!p0) return { ok: false, code: 'not_eligible', message: '先登记接活儿，核验通过后就能联系发布人' };
  const p = (await refreshPro(db, p0.id)) ?? p0;
  if (post.poster_role === 'crew') {
    if (p.role !== 'worker') return { ok: false, code: 'not_eligible', message: '这是施工队招工人的活儿，只有登记为“工人”的人可以联系' };
    if (p.status !== 'verified') return { ok: false, code: 'not_eligible', message: '你的接活儿资料还没生效，请先完成登记' };
    return { ok: true };
  }
  // 房主、房东、物业、开发商发的活
  if (p.role === 'worker') {
    return { ok: false, code: 'not_eligible', message: '房主发的活儿要由核验过执照的施工队、师傅或专业服务来接；工人可以看施工队招工人的活儿' };
  }
  if (p.status === 'removed') return { ok: false, code: 'not_eligible', message: '你的接活儿资料已被下架，请联系商会工作人员' };
  if (p.status === 'returned') return { ok: false, code: 'not_eligible', message: '你的资料被退回了，按退回原因改好再提交，核验通过后就能联系' };
  if (p.status !== 'verified') return { ok: false, code: 'not_eligible', message: '你的资料还在核验，核验通过后就能联系发布人' };
  if (!p.verified_trades.includes(post.trade_key)) {
    const need = t?.licType === 'C' ? '营业登记' : '对应的执照';
    return { ok: false, code: 'not_eligible', message: `这个活儿是「${t?.name ?? post.trade_key}」，需要${need}，你核验通过的工种里没有这一项` };
  }
  const sw = await getSwitches(db);
  if (needPayFor(p, sw.requirePaid)) {
    return { ok: false, code: 'not_eligible', needPay: true, message: '核验已通过，成为缴费会员后就能联系发布人' };
  }
  void staff;
  // D28 免费额度：非会员每看一条新活儿的电话扣一次；看过的这条再看不扣
  if (quotaApplies(p, sw)) {
    const left = (await freeLeftFor(db, p, sw)) ?? 0;
    if (left <= 0 && !(await alreadyContacted(db, post.id, viewerId))) {
      await markUsedUp(db, p.id);
      return { ok: false, code: 'quota_used_up', needPay: true, message: QUOTA_USED_UP_TEXT };
    }
    return { ok: true, quota: { proId: p.id, left } };
  }
  return { ok: true };
}

export async function contactPost(id: string, v: Viewer, viewerId: string) {
  const pool = getPool();
  const post = await postById(pool, id);
  if (!post || (post.status === 'removed' && post.contact_id !== viewerId)) throw new CrmError('not_found', '找不到这个活儿，可能已经下架');
  const e = await eligibility(pool, post, viewerId, v.staff);
  if (!e.ok) throw new CrmError(e.code, e.message);
  let freeLeft: number | null = null;
  if (viewerId !== post.contact_id) {
    // 新看的一条（插入成功）且在免费额度里 → free_used = true（扣一次）；重复看只加次数，不扣
    const charge = e.ok && !!e.quota;
    const { rows: ins } = await pool.query<{ inserted: boolean }>(
      `INSERT INTO jobs_contacts (direction, post_id, viewer_contact_id, free_used) VALUES ('post', $1, $2, $3)
       ON CONFLICT (post_id, viewer_contact_id) WHERE direction = 'post' DO UPDATE SET times = jobs_contacts.times + 1, last_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [id, viewerId, charge]
    );
    await pool.query(`UPDATE jobs_posts SET first_contact_at = COALESCE(first_contact_at, now()) WHERE id = $1`, [id]);
    if (e.ok && e.quota) {
      freeLeft = ins[0]?.inserted ? Math.max(0, e.quota.left - 1) : e.quota.left;
      if (freeLeft === 0) await markUsedUp(pool, e.quota.proId);
    }
  }
  return { phone: post.phone, wechat: post.wechat, callName: post.call_name, freeLeft, ...(freeLeft != null ? { freeLeftText: freeLeftText(freeLeft) } : {}) };
}

// ── 详情 ────────────────────────────────────────────────────────────────
export async function getPost(id: string, v: Viewer) {
  const pool = getPool();
  const post = await postById(pool, id);
  const mine = !!post && post.contact_id === v.contactId;
  if (!post || (post.status === 'removed' && !mine && !v.staff)) throw new CrmError('not_found', '找不到这个活儿，可能已经下架');
  const trades = await tradeMap(pool);
  const e = await eligibility(pool, post, v.contactId, v.staff);
  return {
    post: {
      ...postCard(post, trades, await cityNames(pool)),
      description: post.description,
      photos: post.photos,
      voiceUrl: post.voice_url,
      propertyType: post.property_type,
      propertyTypeLabel: PROPERTY_TYPES.find((x) => x.key === post.property_type)?.label ?? null,
      callName: post.call_name,
      wantSiteVisit: post.want_site_visit,
      turnover: post.turnover,
      mine
    },
    canContact: e.ok,
    reason: e.ok ? null : e.message,
    reasonCode: e.ok ? null : e.code,
    needPay: !e.ok && !!e.needPay,
    /** D28：免费额度时非会员还能免费联系几位（null = 不限 / 不适用） */
    freeLeft: e.ok && e.quota ? e.quota.left : null
  };
}

// ── 发布 ────────────────────────────────────────────────────────────────
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const urls = (v: unknown, max: number) => (Array.isArray(v) ? v : []).filter((u): u is string => typeof u === 'string' && /^https:\/\//.test(u)).slice(0, max);
const intOr = (v: unknown, lo: number, hi: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : null;
};

export async function createPosts(v: Viewer, contactId: string, b: Record<string, unknown>) {
  const pool = getPool();
  const role = POSTER_ROLES.find((r) => r.key === b.posterRole)?.key;
  if (!role) throw new CrmError('bad_request', '请选“我是”：房主、房东、物业、开发商或施工队（招工人）');
  const trades = await tradeMap(pool);
  const keys = Array.from(new Set((Array.isArray(b.trades) ? b.trades : typeof b.trade === 'string' ? [b.trade] : []).filter((x): x is string => typeof x === 'string'))).slice(0, 10);
  if (!keys.length) throw new CrmError('bad_request', '请选要干什么活（可以多选）');
  for (const k of keys) {
    const t = trades.get(k);
    if (!t) throw new CrmError('bad_request', '选的工种里有一项已经不存在了，请重新选');
    if (t.noPost) throw new CrmError('bad_request', `「${t.name}」只展示、可联系，不接受发布活儿`);
    if (!t.open && !v.staff) throw new CrmError('bad_request', `「${t.name}」暂时还没开放`);
  }
  const cityRow = await resolveCity(pool, b.cityKey ?? b.city);
  if (!cityRow) throw new CrmError('bad_request', b.city || b.cityKey ? '这个城市不在城市列表里，请从列表里选' : '请选在哪个城市');
  const city = cityRow.name;
  const description = str(b.description, 2000);
  const photos = urls(b.photos, 9);
  const voiceUrl = urls([b.voiceUrl], 1)[0] ?? null;
  if (!description && !photos.length && !voiceUrl) throw new CrmError('bad_request', '请说说情况：打几个字、说一段语音或拍张照片都行');
  const timing = TIMINGS.find((x) => x.key === b.timing)?.key;
  if (!timing) throw new CrmError('bad_request', '请选什么时候要：尽快、本周、本月或可商量');
  const phone = await verifiedPhone(pool, contactId);
  if (!phone) throw new CrmError('need_phone', '请先验证手机号：接活儿的人要能打电话给你');
  // D28：非会员免费发活儿条数（默认不限）
  await checkPostQuota(pool, contactId, await getSwitches(pool), v.staff);
  const propertyType = PROPERTY_TYPES.find((x) => x.key === b.propertyType)?.key ?? null;
  const headcount = role === 'crew' ? intOr(b.crewHeadcount, 1, 500) : null;
  if (role === 'crew' && !headcount) throw new CrmError('bad_request', '请填要几个人');
  const duration = role === 'crew' ? str(b.crewDuration, 40) || null : null;
  if (role === 'crew' && !duration) throw new CrmError('bad_request', '请填大概干多久');
  const want = b.wantSiteVisit === true;
  const turnover = b.turnover === true;
  const batch = randomUUID();
  const ids = await withTransaction(async (db) => {
    const out: string[] = [];
    for (const k of keys) {
      const t = trades.get(k)!;
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO jobs_posts (batch_id, contact_id, poster_role, trade_key, city_key, city, title, description, photos, voice_url, timing, budget_range, property_type,
            call_name, phone, wechat, crew_headcount, crew_duration, crew_pay, want_site_visit, turnover, expires_at)
         VALUES ($1,$2,$3,$4,$22,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, now() + make_interval(days => $21)) RETURNING id`,
        [
          batch, contactId, role, k, city, makeTitle(city, t.name, description, role, headcount), description, photos, voiceUrl, timing,
          str(b.budget, 60) || null, propertyType, str(b.callName, 30) || null, phone, str(b.wechat, 60) || null, headcount, duration,
          role === 'crew' ? str(b.crewPay, 60) || null : null, want && SITE_VISIT_TRADES.includes(k), turnover, POST_DAYS, cityRow.key
        ]
      );
      out.push(rows[0].id);
    }
    return out;
  });
  // D10：情况说明过微信内容安全（结果只决定进不进小程序「通知给我的活儿」，不拦网站发布）
  const sec = await checkDescription(description, await openidOf(pool, contactId)).catch(() => ({ status: 'unchecked' as const, note: 'error' }));
  await saveSec(pool, ids, sec);
  // 发布即通知第一批（失败不影响发布；定时任务会补）
  const { dispatchPost } = await import('./notify');
  for (const id of ids) await dispatchPost(id, 1).catch(() => undefined);
  return {
    ids,
    batchId: batch,
    next: `已发布${ids.length > 1 ? `，按工种拆成了 ${ids.length} 条` : ''}。接下来：系统会通知对口工种、在${city}服务的接活人；有资格的人会直接打你的电话。24 小时没人联系，会再通知一批。活儿 ${POST_DAYS} 天后自动下架，到期前会提醒你续期。`
  };
}

// ── 改 / 续期 / 状态 ────────────────────────────────────────────────────
export async function patchPost(id: string, v: Viewer, b: Record<string, unknown>) {
  const pool = getPool();
  const post = await postById(pool, id);
  if (!post) throw new CrmError('not_found', '找不到这个活儿');
  const byToken = typeof b.token === 'string' && b.token.length >= 16 && b.token === post.renew_token;
  const mine = !!v.contactId && v.contactId === post.contact_id;
  if (!mine && !byToken) throw new CrmError(v.contactId ? 'forbidden' : 'unauthorized', v.contactId ? '只有发布人能改这个活儿' : '请先登录');
  if (post.status === 'removed') throw new CrmError('conflict', '这个活儿已被工作人员下架，不能再改');
  const sets: string[] = [];
  const vals: unknown[] = [id];
  const add = (col: string, val: unknown) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };
  if (b.renew === true || b.action === 'renew') {
    add('expires_at', new Date(Date.now() + POST_DAYS * 864e5));
    add('renew_reminded_at', null);
    if (post.status === 'closed') { add('status', 'open'); add('close_reason', null); }
  }
  if (mine) {
    if (typeof b.status === 'string') {
      if (!['open', 'found', 'closed'].includes(b.status)) throw new CrmError('bad_request', '状态只能是找人中、已找到或已关闭');
      add('status', b.status);
      add('close_reason', b.status === 'closed' ? 'self' : null);
      if (b.status === 'open' && post.expires_at.getTime() < Date.now()) add('expires_at', new Date(Date.now() + POST_DAYS * 864e5));
    }
    const trades = await tradeMap(pool);
    let desc = post.description;
    let city = post.city;
    if (typeof b.description === 'string') { desc = str(b.description, 2000); add('description', desc); }
    if ((typeof b.city === 'string' && b.city.trim()) || typeof b.cityKey === 'string') {
      const c = await resolveCity(pool, b.cityKey ?? b.city);
      if (!c) throw new CrmError('bad_request', '这个城市不在城市列表里，请从列表里选');
      city = c.name;
      add('city', c.name);
      add('city_key', c.key);
    }
    if (typeof b.description === 'string' || typeof b.city === 'string' || typeof b.cityKey === 'string' || b.crewHeadcount !== undefined) {
      const hc = b.crewHeadcount !== undefined ? intOr(b.crewHeadcount, 1, 500) : post.crew_headcount;
      if (b.crewHeadcount !== undefined && post.poster_role === 'crew') add('crew_headcount', hc);
      add('title', makeTitle(city, trades.get(post.trade_key)?.name ?? post.trade_key, desc, post.poster_role, hc));
    }
    if (Array.isArray(b.photos)) add('photos', urls(b.photos, 9));
    if (b.voiceUrl !== undefined) add('voice_url', urls([b.voiceUrl], 1)[0] ?? null);
    if (typeof b.timing === 'string') {
      if (!TIMINGS.some((x) => x.key === b.timing)) throw new CrmError('bad_request', '时间要求不对');
      add('timing', b.timing);
    }
    if (b.budget !== undefined) add('budget_range', str(b.budget, 60) || null);
    if (b.propertyType !== undefined) add('property_type', PROPERTY_TYPES.find((x) => x.key === b.propertyType)?.key ?? null);
    if (b.callName !== undefined) add('call_name', str(b.callName, 30) || null);
    if (b.wechat !== undefined) add('wechat', str(b.wechat, 60) || null);
    if (b.crewDuration !== undefined && post.poster_role === 'crew') add('crew_duration', str(b.crewDuration, 40) || null);
    if (b.crewPay !== undefined && post.poster_role === 'crew') add('crew_pay', str(b.crewPay, 60) || null);
    if (typeof b.wantSiteVisit === 'boolean') add('want_site_visit', b.wantSiteVisit && SITE_VISIT_TRADES.includes(post.trade_key));
  }
  if (!sets.length) throw new CrmError('bad_request', '没有要改的内容');
  await pool.query(`UPDATE jobs_posts SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, vals);
  if (mine && typeof b.description === 'string' && b.description.trim() !== post.description) {
    // 改了情况说明：重新过内容安全
    const sec = await checkDescription(str(b.description, 2000), await openidOf(pool, post.contact_id)).catch(() => ({ status: 'unchecked' as const, note: 'error' }));
    await saveSec(pool, [id], sec);
  }
  const fresh = (await postById(pool, id))!;
  return { post: postCard(fresh, await tradeMap(pool), await cityNames(pool)) };
}

// ── 我的活儿（含谁联系过） ──────────────────────────────────────────────
export async function myPosts(contactId: string) {
  const pool = getPool();
  const trades = await tradeMap(pool);
  const { rows } = await pool.query<PostRow>(`SELECT * FROM jobs_posts WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 100`, [contactId]);
  const ids = rows.map((r) => r.id);
  const { rows: cs } = await pool.query<{ post_id: string; pro_id: string | null; name: string; role: string | null; last_at: Date; times: number }>(
    `SELECT jc.post_id, p.id AS pro_id, COALESCE(p.name, c.name) AS name, p.role, jc.last_at, jc.times
       FROM jobs_contacts jc JOIN contacts c ON c.id = jc.viewer_contact_id LEFT JOIN jobs_pros p ON p.contact_id = jc.viewer_contact_id
      WHERE jc.direction = 'post' AND jc.post_id = ANY($1::uuid[]) ORDER BY jc.last_at DESC`,
    [ids]
  );
  const { rows: ns } = await pool.query<{ post_id: string; n: number }>(
    `SELECT post_id, count(*)::int AS n FROM jobs_notifications WHERE kind = 'dispatch' AND post_id = ANY($1::uuid[]) GROUP BY post_id`,
    [ids]
  );
  const notified = new Map(ns.map((r) => [r.post_id, r.n]));
  const names = await cityNames(pool);
  return {
    items: rows.map((p) => ({
      ...postCard(p, trades, names),
      description: p.description,
      photos: p.photos,
      batchId: p.batch_id,
      closeReason: p.close_reason,
      expired: p.status === 'closed' && p.close_reason === 'expired',
      notifiedCount: notified.get(p.id) ?? 0,
      contacts: cs.filter((c) => c.post_id === p.id).map((c) => ({ proId: c.pro_id, name: c.name, roleLabel: c.role ? roleLabel(c.role) : null, at: c.last_at, times: c.times }))
    }))
  };
}

// ── 投诉 / 反馈 ─────────────────────────────────────────────────────────
export async function report(contactId: string | null, b: Record<string, unknown>) {
  const pool = getPool();
  const type = b.targetType === 'pro' || b.targetType === 'post' ? b.targetType : null;
  const targetId = typeof b.targetId === 'string' ? b.targetId : '';
  const reason = str(b.reason, 1000);
  if (!type || !/^[0-9a-f-]{36}$/i.test(targetId)) throw new CrmError('bad_request', '请说明要反馈哪个活儿或哪个人');
  if (!reason) throw new CrmError('bad_request', '请写一下要反馈的情况');
  const { rows: t } = await pool.query<{ label: string }>(
    type === 'pro' ? `SELECT name AS label FROM jobs_pros WHERE id = $1` : `SELECT title AS label FROM jobs_posts WHERE id = $1`,
    [targetId]
  );
  if (!t[0]) throw new CrmError('not_found', '找不到要反馈的内容');
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO jobs_reports (target_type, target_id, reporter_contact_id, reason) VALUES ($1, $2, $3, $4) RETURNING id`,
    [type, targetId, contactId, reason]
  );
  const { recordException } = await import('@/lib/crm/followups');
  await recordException('jobs_report', `jobs_report:${rows[0].id}`, targetId, `找工人·接活 反馈：${type === 'pro' ? '接活人' : '活儿'}「${t[0].label}」——${reason.slice(0, 200)}`, {
    reportId: rows[0].id, targetType: type, targetId
  });
  return { id: rows[0].id, message: '已收到，工作人员会尽快处理' };
}

// ── 我的接活：通知给我的活儿（小程序只给条数和网址） ────────────────────
export async function notifiedPosts(contactId: string, mp: boolean) {
  const pool = getPool();
  const { rows } = await pool.query<PostRow & { notified_at_n: Date }>(
    `SELECT p.*, n.created_at AS notified_at_n FROM jobs_notifications n JOIN jobs_posts p ON p.id = n.post_id
      WHERE n.kind = 'dispatch' AND n.contact_id = $1 ORDER BY n.created_at DESC LIMIT 100`,
    [contactId]
  );
  const { webBase, WEB_JOBS_PATH } = await import('./constants');
  const webUrl = `${webBase()}${WEB_JOBS_PATH}/mine`;
  if (mp) return { count: rows.length, webUrl };
  const trades = await tradeMap(pool);
  const names = await cityNames(pool);
  return { count: rows.length, webUrl, items: rows.map((p) => ({ ...postCard(p, trades, names), notifiedAt: p.notified_at_n })) };
}

// ── D10：小程序「我的接活 · 通知给我的活儿」──────────────────────────────
// 只给核验通过（且满足缴费开关）的接活人；只给和他已核验工种、服务城市对口的业主类活儿（房主/房东/物业/开发商），
// 招工那一类不给；情况说明过了内容安全（sec_status='pass'）的才给。字段只有：id、城市、工种、情况说明、什么时候要、发布时间、已联系过没有。
// 不给预算、任何金额、照片、语音、标题。
export const OWNER_ROLES: PosterRole[] = ['owner', 'landlord', 'property', 'developer'];
const MATCH_WHERE = `p.status = 'open' AND p.expires_at > now() AND p.poster_role = ANY($1::text[])
   AND p.trade_key = ANY($2::text[]) AND p.city_key = ANY($3::text[]) AND p.sec_status = 'pass' AND p.contact_id <> $4`;

type MatchGate = { ok: true; proId: string; trades: string[]; cities: string[]; freeLeft: number | null } | { ok: false; reason: string; needPay: boolean };

async function matchGate(db: Db, contactId: string): Promise<MatchGate> {
  const p0 = await proByContact(db, contactId);
  if (!p0) return { ok: false, needPay: false, reason: '先登记接活儿，核验通过后，和你工种、城市对口的活儿会出现在这里' };
  const p = (await refreshPro(db, p0.id)) ?? p0;
  if (p.role === 'worker') return { ok: false, needPay: false, reason: '房主发的活儿要由核验过执照的施工队、师傅或专业服务来接' };
  if (p.status === 'removed') return { ok: false, needPay: false, reason: '你的接活儿资料已被下架，请联系商会工作人员' };
  if (p.status === 'returned') return { ok: false, needPay: false, reason: '你的资料被退回了，按退回原因改好再提交，核验通过后这里会有对口的活儿' };
  if (p.status !== 'verified') return { ok: false, needPay: false, reason: '你的资料还在核验，核验通过后，和你工种、城市对口的活儿会出现在这里' };
  const sw = await getSwitches(db);
  if (needPayFor(p, sw.requirePaid)) return { ok: false, needPay: true, reason: '核验已通过，成为缴费会员后，对口的活儿会出现在这里' };
  return { ok: true, proId: p.id, trades: p.verified_trades, cities: p.cities, freeLeft: await freeLeftFor(db, p, sw) };
}

/**
 * D19：内容安全用查看者身份补检。网站发的活儿发布人没有小程序 openid（sec_note='no_openid'），
 * 对口的接活人在小程序里打开「通知给我的活儿」时，用这个接活人的 openid（他正在用小程序，openid 有效）补检，
 * 结果记回 jobs_posts（sec_note='viewer:<pro id>'），检一次就记住；补检还是没结果（没配微信密钥 / 接口出错）就不记，下次再试。
 */
export async function recheckForViewer(
  db: Db,
  contactId: string,
  g: { proId: string; trades: string[]; cities: string[] },
  check: (text: string, openid: string | null) => Promise<SecOutcome> = checkDescription
): Promise<number> {
  const openid = await openidOf(db, contactId);
  if (!openid) return 0;
  const { rows } = await db.query<{ id: string; description: string }>(
    `SELECT p.id, p.description FROM jobs_posts p
      WHERE ${MATCH_WHERE.replace("p.sec_status = 'pass'", "p.sec_status = 'unchecked' AND p.sec_note = 'no_openid'")}
      ORDER BY p.created_at DESC LIMIT 10`,
    [OWNER_ROLES, g.trades, g.cities, contactId]
  );
  let n = 0;
  for (const r of rows) {
    const o = await check(r.description ?? '', openid).catch(() => ({ status: 'unchecked' as const, note: 'error' }));
    if (o.status === 'unchecked') continue;
    const { rowCount } = await db.query(
      `UPDATE jobs_posts SET sec_status = $2, sec_note = $3, sec_checked_at = now() WHERE id = $1 AND sec_status = 'unchecked' AND sec_note = 'no_openid'`,
      [r.id, o.status, `viewer:${g.proId}`]
    );
    n += rowCount ?? 0;
  }
  return n;
}

export async function matchedPosts(contactId: string, cursor: string | null, opts: { mp?: boolean } = {}) {
  const pool = getPool();
  const g = await matchGate(pool, contactId);
  if (!g.ok) return { eligible: false, reason: g.reason, needPay: g.needPay, freeLeft: null, freeLeftText: null, items: [], nextCursor: null };
  if (opts.mp && !cursor) await recheckForViewer(pool, contactId, g).catch((e) => console.error('[jobs] viewer sec recheck', e instanceof Error ? e.message : e));
  const offset = Math.max(0, Number(cursor) || 0);
  const limit = 20;
  const { rows } = await pool.query<PostRow & { contacted: boolean }>(
    `SELECT p.*, EXISTS (SELECT 1 FROM jobs_contacts jc WHERE jc.direction = 'post' AND jc.post_id = p.id AND jc.viewer_contact_id = $4) AS contacted
       FROM jobs_posts p WHERE ${MATCH_WHERE}
      ORDER BY p.created_at DESC, p.id LIMIT ${limit + 1} OFFSET $5`,
    [OWNER_ROLES, g.trades, g.cities, contactId, offset]
  );
  const trades = await tradeMap(pool);
  const names = await cityNames(pool);
  return {
    eligible: true,
    reason: null,
    needPay: false,
    // D28：免费额度时非会员还能免费联系几位（null = 不限）；小程序据此显示“还可以免费联系 X 位”
    freeLeft: g.freeLeft,
    freeLeftText: g.freeLeft != null ? freeLeftText(g.freeLeft) : null,
    items: rows.slice(0, limit).map((p) => ({
      id: p.id,
      city: (p.city_key && names.get(p.city_key)) || p.city,
      trade: p.trade_key,
      tradeName: trades.get(p.trade_key)?.name ?? p.trade_key,
      description: p.description,
      timing: p.timing,
      timingLabel: timingLabel(p.timing),
      createdAt: p.created_at,
      contacted: p.contacted
    })),
    nextCursor: rows.length > limit ? String(offset + limit) : null
  };
}

/** 小程序联系发布人：只限 matched 里的活儿（其余照旧 404） */
export async function isMatchedFor(contactId: string, postId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return false;
  const pool = getPool();
  const g = await matchGate(pool, contactId);
  if (!g.ok) return false;
  const { rows } = await pool.query(`SELECT 1 FROM jobs_posts p WHERE ${MATCH_WHERE} AND p.id = $5`, [OWNER_ROLES, g.trades, g.cities, contactId, postId]);
  return rows.length > 0;
}
