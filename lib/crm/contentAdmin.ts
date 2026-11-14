/**
 * 1.5.0 后台「内容管理」（东哥 11/14 定：先发后管；把「举报」「主页审核」「内容审核」合成一个页面，名字先叫「内容管理」，等东哥点头）。
 * 三栏：被举报的 / 机器拦下的 / 已下架的。每条都能 下架 / 恢复 / 禁止此人。
 * 内容种类：组局（meetup）、个人主页文字（profile）、项目 / 案例（project）、相册照片（photo）、电子名片（card）。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import type { Staff } from './auth';

export type Item = {
  kind: 'meetup' | 'profile' | 'project' | 'photo' | 'card';
  id: string;
  ownerId: string | null;
  owner: string | null;
  title: string;
  text: string | null;
  images: string[];
  state: 'live' | 'machine' | 'down';
  note: string | null;
  at: Date;
  reports?: { id: string; reason: string; detail: string | null; reporter: string | null; at: Date }[];
};

const KIND_LABEL: Record<Item['kind'], string> = { meetup: '组局', profile: '个人主页', project: '项目 / 案例', photo: '相册照片', card: '电子名片' };
export { KIND_LABEL };

async function log(actor: string, kind: string, targetId: string, action: string, note?: string | null) {
  await getPool().query(`INSERT INTO ugc_actions (kind, target_id, action, actor, note) VALUES ($1, $2, $3, $4, $5)`, [kind, targetId, action, actor, note ?? null]);
}

/** 取一条内容的样子（举报栏用） */
async function loadItem(kind: string, id: string): Promise<Item | null> {
  const pool = getPool();
  if (kind === 'meetup') {
    const { rows } = await pool.query(
      `SELECT u.id, u.creator_id, NULLIF(c.name, '微信用户') AS owner, u.title, u.note, u.status, u.sec_status, u.created_at, cl.name AS club
         FROM club_meetups u JOIN contacts c ON c.id = u.creator_id JOIN clubs cl ON cl.id = u.club_id WHERE u.id::text = $1`, [id]);
    const r = rows[0];
    return r ? { kind: 'meetup', id: r.id, ownerId: r.creator_id, owner: r.owner, title: `组局「${r.title}」（${r.club}）`, text: r.note, images: [], state: r.status === 'taken_down' ? 'down' : r.sec_status !== 'ok' ? 'machine' : 'live', note: null, at: r.created_at } : null;
  }
  if (kind === 'profile' || kind === 'card') {
    const { rows } = await pool.query(
      `SELECT c.id, NULLIF(c.name, '微信用户') AS owner, m.bio, m.company_intro, m.company, m.title, m.intro, m.profile_status, m.hidden_at, m.updated_at
         FROM contacts c JOIN member_cards m ON m.contact_id = c.id WHERE c.id::text = $1 OR m.token = $1`, [id]);
    const r = rows[0];
    if (!r) return null;
    if (kind === 'card') return { kind: 'card', id: r.id, ownerId: r.id, owner: r.owner, title: `${r.owner ?? 'SAREC 用户'} 的电子名片`, text: [r.company, r.title, r.intro].filter(Boolean).join(' · ') || null, images: [], state: r.hidden_at ? 'down' : 'live', note: null, at: r.updated_at };
    return { kind: 'profile', id: r.id, ownerId: r.id, owner: r.owner, title: `${r.owner ?? 'SAREC 用户'} 的个人主页`, text: [r.bio, r.company_intro].filter(Boolean).join('\n') || null, images: [], state: r.profile_status === 'taken_down' ? 'down' : r.profile_status === 'rejected' ? 'machine' : 'live', note: null, at: r.updated_at };
  }
  if (kind === 'project') {
    const { rows } = await pool.query(`SELECT p.*, NULLIF(c.name, '微信用户') AS owner FROM profile_projects p JOIN contacts c ON c.id = p.contact_id WHERE p.id::text = $1`, [id]);
    const r = rows[0];
    return r ? { kind: 'project', id: r.id, ownerId: r.contact_id, owner: r.owner, title: `项目「${r.title}」`, text: r.body, images: r.images ?? [], state: r.status === 'taken_down' ? 'down' : r.status === 'rejected' ? 'machine' : 'live', note: null, at: r.updated_at } : null;
  }
  if (kind === 'photo') {
    const { rows } = await pool.query(
      `SELECT p.id, p.uploader_contact_id, NULLIF(c.name, '微信用户') AS owner, p.thumb_url, p.url, p.is_hidden, p.review_status, p.created_at, e.title AS ev
         FROM event_photos p JOIN events e ON e.id = p.event_id LEFT JOIN contacts c ON c.id = p.uploader_contact_id WHERE p.id::text = $1`, [id]);
    const r = rows[0];
    return r ? { kind: 'photo', id: r.id, ownerId: r.uploader_contact_id, owner: r.owner ?? '工作人员', title: `「${r.ev}」相册里的照片`, text: null, images: [r.url], state: r.review_status === 'rejected' ? 'machine' : r.is_hidden ? 'down' : 'live', note: null, at: r.created_at } : null;
  }
  return null;
}

/** 被举报的：按内容合并，同一条被多人举报只出现一次 */
async function reported(): Promise<Item[]> {
  const { rows } = await getPool().query<{ id: string; kind: string; target_id: string; reason: string; detail: string | null; reporter: string | null; created_at: Date }>(
    `SELECT r.id, r.kind, r.target_id, r.reason, r.detail, NULLIF(c.name, '微信用户') AS reporter, r.created_at
       FROM ugc_reports r LEFT JOIN contacts c ON c.id = r.reporter_id WHERE r.status = 'open' ORDER BY r.created_at DESC LIMIT 300`
  );
  const map = new Map<string, Item>();
  for (const r of rows) {
    const kind = r.kind === 'club_member' ? 'profile' : r.kind;
    const tid = r.kind === 'club_member' ? r.target_id.split(':')[1] ?? r.target_id : r.target_id;
    const key = kind + ':' + tid;
    let it = map.get(key);
    if (!it) {
      const loaded = await loadItem(kind, tid);
      if (!loaded) continue;
      it = { ...loaded, reports: [] };
      map.set(key, it);
    }
    it.reports!.push({ id: r.id, reason: r.reason, detail: r.detail, reporter: r.reporter, at: r.created_at });
  }
  return Array.from(map.values());
}

/** 机器拦下的：组局检测没通过 / 检测不通（还没显示）、图片检测不通过自动撤下的项目和照片、文本检测建议看一眼的个人主页 */
async function machine(): Promise<Item[]> {
  const pool = getPool();
  const out: Item[] = [];
  const { rows: mu } = await pool.query<{ id: string }>(`SELECT id FROM club_meetups WHERE sec_status <> 'ok' AND status = 'open' ORDER BY created_at DESC LIMIT 100`);
  for (const r of mu) { const it = await loadItem('meetup', r.id); if (it) out.push({ ...it, note: '内容检测没通过或没检测上，还没对成员显示' }); }
  const { rows: pj } = await pool.query<{ id: string }>(`SELECT id FROM profile_projects WHERE status = 'rejected' ORDER BY updated_at DESC LIMIT 100`);
  for (const r of pj) { const it = await loadItem('project', r.id); if (it) out.push({ ...it, note: '微信图片检测不通过，已自动撤下' }); }
  const { rows: ph } = await pool.query<{ id: string }>(`SELECT id FROM event_photos WHERE review_status = 'rejected' AND is_hidden ORDER BY created_at DESC LIMIT 100`);
  for (const r of ph) { const it = await loadItem('photo', r.id); if (it) out.push({ ...it, note: '微信图片检测不通过，已自动撤下' }); }
  const { rows: rv } = await pool.query<{ kind: string; target_id: string; note: string | null }>(
    `SELECT DISTINCT ON (kind, target_id) kind, target_id, note FROM ugc_actions WHERE action = 'machine_review' AND created_at > now() - interval '30 days' ORDER BY kind, target_id, created_at DESC LIMIT 100`
  );
  for (const r of rv) {
    const it = await loadItem(r.kind === 'profile_project' ? 'project' : 'profile', r.target_id);
    if (it && it.state === 'live') out.push({ ...it, note: r.note ?? '文本检测建议人工看一眼（照常显示）' });
  }
  return out;
}

/** 已下架的（工作人员下架的；机器撤下的在“机器拦下的”里） */
async function down(): Promise<Item[]> {
  const pool = getPool();
  const out: Item[] = [];
  const add = async (kind: Item['kind'], ids: { id: string; why?: string | null }[]) => {
    for (const r of ids) { const it = await loadItem(kind, r.id); if (it) out.push({ ...it, note: r.why ?? null }); }
  };
  await add('meetup', (await pool.query(`SELECT id, coalesce(taken_down_reason, '') AS why FROM club_meetups WHERE status = 'taken_down' ORDER BY updated_at DESC LIMIT 100`)).rows);
  await add('profile', (await pool.query(`SELECT contact_id AS id FROM member_cards WHERE profile_status = 'taken_down' ORDER BY updated_at DESC LIMIT 100`)).rows);
  await add('project', (await pool.query(`SELECT id FROM profile_projects WHERE status = 'taken_down' ORDER BY updated_at DESC LIMIT 100`)).rows);
  await add('photo', (await pool.query(`SELECT id FROM event_photos WHERE is_hidden AND review_status <> 'rejected' AND uploader_contact_id IS NOT NULL ORDER BY created_at DESC LIMIT 100`)).rows);
  await add('card', (await pool.query(`SELECT contact_id AS id, hidden_reason AS why FROM member_cards WHERE hidden_at IS NOT NULL ORDER BY hidden_at DESC LIMIT 100`)).rows);
  return out;
}

export async function contentBoard(tab: string) {
  const t = tab === 'machine' || tab === 'down' ? tab : 'reported';
  const items = t === 'reported' ? await reported() : t === 'machine' ? await machine() : await down();
  const { rows: cnt } = await getPool().query<{ n: number }>(`SELECT count(DISTINCT (kind, target_id))::int AS n FROM ugc_reports WHERE status = 'open'`);
  const bans = (await getPool().query(
    `SELECT 'club' AS what, b.contact_id, NULLIF(c.name, '微信用户') AS name, b.reason, b.banned_by, b.banned_at FROM club_bans b JOIN contacts c ON c.id = b.contact_id
     UNION ALL SELECT 'profile', b.contact_id, NULLIF(c.name, '微信用户'), b.reason, b.banned_by, b.banned_at FROM profile_bans b JOIN contacts c ON c.id = b.contact_id
     ORDER BY banned_at DESC`
  )).rows;
  return { tab: t, items: items.map((i) => ({ ...i, kindLabel: KIND_LABEL[i.kind] })), reportedOpen: cnt[0].n, bans };
}

/** 下架 / 恢复 / 禁止此人 / 举报不用处理 */
export async function contentAction(s: Staff, b: { kind?: string; id?: string; action?: string; reason?: string; what?: string }) {
  const pool = getPool();
  const actor = s.name || s.email;
  const kind = String(b.kind ?? '') as Item['kind'];
  const id = String(b.id ?? '');
  const reason = String(b.reason ?? '').trim().slice(0, 100) || null;
  if (!KIND_LABEL[kind] || !/^[0-9a-f-]{36}$/.test(id)) throw new CrmError('bad_request', '找不到这条内容');
  const act = String(b.action ?? '');
  const closeReports = async (status: 'done' | 'dismissed') => {
    const targets = kind === 'profile' ? [id] : [id];
    await pool.query(
      `UPDATE ugc_reports SET status = $3, handled_by = $2, handled_at = now() WHERE status = 'open' AND ((kind = $1 AND target_id = ANY($4::text[])) OR (kind = 'club_member' AND split_part(target_id, ':', 2) = ANY($4::text[])) OR ($1 = 'profile' AND kind = 'card'))`,
      [kind, actor, status, targets]
    );
  };
  if (act === 'take_down' || act === 'restore') {
    const on = act === 'take_down';
    if (kind === 'meetup') await pool.query(on ? `UPDATE club_meetups SET status = 'taken_down', taken_down_by = $2, taken_down_reason = $3, updated_at = now() WHERE id = $1` : `UPDATE club_meetups SET status = 'open', sec_status = 'ok', taken_down_by = NULL, taken_down_reason = NULL, updated_at = now() WHERE id = $1`, on ? [id, actor, reason] : [id]);
    if (kind === 'profile') await pool.query(`UPDATE member_cards SET profile_status = $2 WHERE contact_id = $1`, [id, on ? 'taken_down' : 'ok']);
    if (kind === 'project') await pool.query(`UPDATE profile_projects SET status = $2, reviewed_by = $3, reviewed_at = now() WHERE id = $1`, [id, on ? 'taken_down' : 'ok', actor]);
    if (kind === 'photo') await pool.query(on ? `UPDATE event_photos SET is_hidden = true WHERE id = $1` : `UPDATE event_photos SET is_hidden = false, review_status = 'ok' WHERE id = $1`, [id]);
    if (kind === 'card') await pool.query(on ? `UPDATE member_cards SET hidden_at = now(), hidden_reason = $2, hidden_by = $3 WHERE contact_id = $1` : `UPDATE member_cards SET hidden_at = NULL, hidden_reason = NULL, hidden_by = NULL WHERE contact_id = $1`, on ? [id, reason ?? '内容不合适', actor] : [id]);
    await closeReports(on ? 'done' : 'dismissed');
    await log(actor, kind, id, act, reason);
    return { message: on ? `已下架，别人看不到这条${KIND_LABEL[kind]}了（在“已下架的”里能恢复）` : '已恢复，大家又能看到了' };
  }
  if (act === 'dismiss') {
    await closeReports('dismissed');
    await log(actor, kind, id, 'dismiss_reports', reason);
    return { message: '已标为不用处理，内容照常显示' };
  }
  if (act === 'ban') {
    const it = await loadItem(kind, id);
    const owner = it?.ownerId;
    if (!owner) throw new CrmError('bad_request', '这条内容是工作人员发的，不能禁止');
    if (kind === 'meetup') await pool.query(`INSERT INTO club_bans (contact_id, reason, banned_by) VALUES ($1, $2, $3) ON CONFLICT (contact_id) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_at = now()`, [owner, reason, actor]);
    else if (kind === 'photo') {
      const { setPhotoBan } = await import('./photos');
      await setPhotoBan(actor, owner, true);
    } else await pool.query(`INSERT INTO profile_bans (contact_id, reason, banned_by) VALUES ($1, $2, $3) ON CONFLICT (contact_id) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_at = now()`, [owner, reason, actor]);
    await log(actor, kind + '_ban', owner, 'ban', reason);
    return { message: kind === 'meetup' ? `已禁止 ${it?.owner ?? '此人'} 发起和参加组局` : kind === 'photo' ? `已禁止 ${it?.owner ?? '此人'} 上传照片` : `已禁止 ${it?.owner ?? '此人'} 修改个人主页和名片` };
  }
  if (act === 'unban') {
    // what = club / profile：只解除那一种；不传就两种都解除
    if (b.what !== 'profile') await pool.query(`DELETE FROM club_bans WHERE contact_id = $1`, [id]);
    if (b.what !== 'club') await pool.query(`DELETE FROM profile_bans WHERE contact_id = $1`, [id]);
    await log(actor, 'ban', id, 'unban', reason);
    return { message: '已解除禁止' };
  }
  throw new CrmError('bad_request', '不支持的操作');
}
