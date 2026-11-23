/**
 * 1.5.0 专委会与俱乐部（东哥 11/13 点头的规则）
 * - 点「加入」立刻生效，随时退出；不再有“表达意向”。以前表达过意向的人不自动算加入，页面提示“点一下加入”。
 * - 加入后看到：成员名单（公开名片）、群二维码（负责人或后台上传，快过期提醒）、组局板。
 * - 组局：标题、时间、地点、人数上限、一句话；我参加 / 不去了；满员自动截止；发起人可取消；过了时间自动收起。
 * - 每个俱乐部一位负责人（后台指定），可下架组局、移出成员。后台可禁人（不能发起、不能参加，可解除）、下架组局、关掉俱乐部；都有记录。
 * - 默认注册用户都能加入，可按俱乐部设“仅会员”。
 * - 组局文字先过微信文本安全检测再显示；检测不通（没配置 / 出错 / 需复核）时先不显示，告诉发起人“稍后显示”，后台可放行。
 * - 组局只写玩什么、什么时间；拦词（MONEY_GAMBLE）命中就提示改，提示里不复述被拦的词（测试窗口 Q14）。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from './events';
import { getSetting } from './orders';
import { memberStatus } from './membership';
import { msgSecCheck } from './contentSec';
import { gateSlot, pendingSlots } from './imageGate';
import type { Staff } from './auth';

export type Club = {
  id: string; key: string; name: string; intro: string | null; members_only: boolean; leader_contact_id: string | null;
  group_qr_url: string | null; group_qr_expires: string | null; sort_order: number; closed_at: Date | null;
};

/** 赌博 / 金钱类字样：组局标题和一句话里出现就请发起人改掉 */
const MONEY_GAMBLE = /输赢|赢钱|输钱|赌|下注|押注|筹码|彩头|奖金|奖品|奖励|红包|抽水|带钱|输了.{0,4}钱|赢了.{0,4}钱|\$|美元|美金|人民币|\d+\s*(元(?![旦宵])|块|刀)/;

export function gambleWords(text: string): string | null {
  const m = MONEY_GAMBLE.exec(text);
  return m ? m[0] : null;
}

async function log(actor: string, kind: string, targetId: string | null, action: string, note?: string | null) {
  await getPool().query(`INSERT INTO ugc_actions (kind, target_id, action, actor, note) VALUES ($1, $2, $3, $4, $5)`, [kind, targetId, action, actor, note ?? null]);
}

/** 第一次用：把后台原来“专委会与俱乐部”设置里的列表变成俱乐部（只做一次；名字、顺序照旧） */
export async function ensureClubsSeeded() {
  const pool = getPool();
  const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM clubs`);
  if (rows[0].n > 0) return;
  const list = await getSetting<{ key: string; name: string; status: string }[]>(pool, 'committees', []);
  let i = 0;
  for (const c of list) {
    await pool.query(`INSERT INTO clubs (key, name, sort_order) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`, [c.key, c.name, i++]);
  }
}

/** 专委会 / 俱乐部状态（crm_settings.committees 里的 已成立 / 筹备中），按 key；设置里没有的算筹备中（指令 27：首页只放已成立的） */
async function committeeStatusMap(): Promise<Map<string, string>> {
  const list = await getSetting<{ key: string; status: string }[]>(getPool(), 'committees', []).catch(() => [] as { key: string; status: string }[]);
  return new Map((Array.isArray(list) ? list : []).map((c) => [c.key, c.status === 'active' ? 'active' : 'preparing']));
}

/** 首页方块：每个俱乐部的排序、图标、封面（按 key），给专委会接口用 */
export async function clubTileMap(): Promise<Map<string, { sortOrder: number; icon: string | null; coverUrl: string | null; open: boolean }>> {
  const { rows } = await getPool()
    .query<{ key: string; sort_order: number; icon: string | null; cover_url: string | null; closed_at: Date | null }>(`SELECT key, sort_order, icon, cover_url, closed_at FROM clubs`)
    .catch(() => ({ rows: [] as { key: string; sort_order: number; icon: string | null; cover_url: string | null; closed_at: Date | null }[] }));
  return new Map(rows.map((r) => [r.key, { sortOrder: r.sort_order, icon: r.icon, coverUrl: r.cover_url, open: !r.closed_at }]));
}

async function clubByKey(key: string): Promise<Club> {
  const { rows } = await getPool().query<Club>(`SELECT *, to_char(group_qr_expires, 'YYYY-MM-DD') AS group_qr_expires FROM clubs WHERE key = $1`, [key]);
  if (!rows[0] || rows[0].closed_at) throw new CrmError('not_found', '这个俱乐部不存在或已经关闭了');
  return rows[0];
}

async function isBanned(contactId: string): Promise<boolean> {
  const { rows } = await getPool().query(`SELECT 1 FROM club_bans WHERE contact_id = $1`, [contactId]);
  return !!rows[0];
}

async function isMemberOf(clubId: string, contactId: string): Promise<boolean> {
  const { rows } = await getPool().query(`SELECT 1 FROM club_members WHERE club_id = $1 AND contact_id = $2 AND left_at IS NULL`, [clubId, contactId]);
  return !!rows[0];
}

async function openidOf(contactId: string): Promise<string | null> {
  const { rows } = await getPool().query<{ o: string | null }>(`SELECT wechat_openid AS o FROM contacts WHERE id = $1`, [contactId]);
  const o = rows[0]?.o ?? null;
  return o && !o.startsWith('dev-openid-') ? o : null;
}

/** 列表：每个俱乐部的人数、我加没加入、我以前有没有表达过意向 */
export async function listClubs(contactId: string | null) {
  await ensureClubsSeeded();
  const pool = getPool();
  const { rows } = await pool.query<Club & { members: number; mine: boolean; interested: boolean }>(
    `SELECT c.*, (SELECT count(*)::int FROM club_members m WHERE m.club_id = c.id AND m.left_at IS NULL) AS members,
            EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.id AND m.contact_id = $1 AND m.left_at IS NULL) AS mine,
            EXISTS (SELECT 1 FROM committee_interests i WHERE i.committee = c.key AND i.contact_id = $1) AS interested
       FROM clubs c WHERE c.closed_at IS NULL ORDER BY c.sort_order, c.created_at`,
    [contactId]
  );
  // 1.5.0 体验1：首页「专委会与俱乐部」方块要的——顺序（后台「俱乐部」页的排序，数字小的在前）、图标、封面、是不是已成立
  const statusOf = await committeeStatusMap();
  return rows.map((c, i) => ({
    key: c.key, name: c.name, intro: c.intro, membersOnly: c.members_only, members: c.members, memberCount: c.members, joined: c.mine,
    sortOrder: c.sort_order, position: i + 1,
    icon: (c as Club & { icon?: string | null }).icon ?? null, coverUrl: (c as Club & { cover_url?: string | null }).cover_url ?? null,
    // active = 已成立（指令 27：小程序首页只放 active 的，筹备中的只在「全部」里标“筹备中”）
    active: statusOf.get(c.key) === 'active', status: statusOf.get(c.key) ?? 'preparing', statusLabel: statusOf.get(c.key) === 'active' ? '已成立' : '筹备中',
    // 以前表达过意向、还没加入：提示“点一下加入”（不自动算加入）
    hint: !c.mine && c.interested ? '您之前表达过意向，点一下「加入」就行' : null
  }));
}

/**
 * 加入俱乐部。1.5.0 体验1（第三部分 5）：和专委会意向一样，必须已有姓名和手机号——
 * 没有的带 fill.name / fill.phone 补上；还缺返回 need_name_phone（小程序先弹补填，再带上重新提交）。
 */
export async function joinClub(contactId: string, key: string, fill: { name?: unknown; phone?: unknown } = {}) {
  const c = await clubByKey(key);
  if (await isBanned(contactId)) throw new CrmError('club_banned', '您暂时不能参加俱乐部活动。有疑问请在「联系商会」里找工作人员。');
  if (c.members_only && !(await memberStatus(getPool(), contactId)).isMember) throw new CrmError('members_only', '这个俱乐部仅限会员加入。可以在「会员权益」里了解入会。');
  const { requireNamePhone } = await import('./staff12');
  await requireNamePhone(contactId, fill, '加入俱乐部');
  await getPool().query(
    `INSERT INTO club_members (club_id, contact_id) VALUES ($1, $2)
     ON CONFLICT (club_id, contact_id) DO UPDATE SET left_at = NULL, removed_by = NULL, joined_at = now()`,
    [c.id, contactId]
  );
  await import('@/lib/org/guest').then((m) => m.linkToChamber(getPool(), contactId, '加入俱乐部'));
  return { joined: true, message: `已加入「${c.name}」` };
}

export async function leaveClub(contactId: string, key: string) {
  const c = await clubByKey(key);
  await getPool().query(`UPDATE club_members SET left_at = now() WHERE club_id = $1 AND contact_id = $2 AND left_at IS NULL`, [c.id, contactId]);
  // 退出俱乐部，同时退出这个俱乐部还没开始的组局（不再占名额）
  await getPool().query(
    `DELETE FROM club_meetup_joins j USING club_meetups u WHERE j.meetup_id = u.id AND u.club_id = $1 AND j.contact_id = $2 AND u.starts_at > now()`,
    [c.id, contactId]
  );
  return { joined: false, message: `已退出「${c.name}」，没开始的组局也一起退了` };
}

/** 俱乐部页：加入后才看得到成员、群二维码；组局板加入后能发起 / 参加 */
export async function clubDetail(contactId: string | null, key: string) {
  const c = await clubByKey(key);
  const pool = getPool();
  const joined = !!contactId && (await isMemberOf(c.id, contactId));
  const leader = !!contactId && c.leader_contact_id === contactId;
  const { rows: cnt } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM club_members WHERE club_id = $1 AND left_at IS NULL`, [c.id]);
  let members: unknown[] = [];
  if (joined || leader) {
    const { rows } = await pool.query<{ contact_id: string; name: string | null; company: string | null; title: string | null; token: string | null; avatar_url: string | null }>(
      `SELECT m.contact_id, NULLIF(ct.name, '微信用户') AS name, mc.company, mc.title, mc.token, ct.avatar_url
         FROM club_members m JOIN contacts ct ON ct.id = m.contact_id LEFT JOIN member_cards mc ON mc.contact_id = ct.id AND mc.hidden_at IS NULL
        WHERE m.club_id = $1 AND m.left_at IS NULL ORDER BY m.joined_at LIMIT 300`,
      [c.id]
    );
    members = [];
    for (const r of rows) {
      (members as unknown[]).push({
        id: r.contact_id, name: r.name ?? 'SAREC 用户', company: r.company, title: r.title, token: r.token, avatarUrl: r.avatar_url,
        isLeader: r.contact_id === c.leader_contact_id, isMember: (await memberStatus(pool, r.contact_id)).isMember
      });
    }
  }
  const qrExpiring = !!c.group_qr_expires && new Date(c.group_qr_expires).getTime() - Date.now() < 3 * 86400e3;
  // 指令 36：负责人自己看到还在检测的新二维码和一句说明；成员看到的还是原来那张（或没有）
  const pendingQr = leader ? (await pendingSlots([`club_qr:${c.key}`]).catch(() => new Map<string, string>())).get(`club_qr:${c.key}`) : undefined;
  if (pendingQr) {
    return {
      club: { key: c.key, name: c.name, intro: c.intro, membersOnly: c.members_only, members: cnt[0].n },
      joined, leader, members,
      groupQr: pendingQr,
      groupQrNote: '新的群二维码在检测中，检测通过后成员才能看到（您自己现在就能看到）',
      meetups: await listMeetups(c, contactId, joined || leader)
    };
  }
  return {
    club: { key: c.key, name: c.name, intro: c.intro, membersOnly: c.members_only, members: cnt[0].n },
    joined, leader,
    members,
    groupQr: joined && c.group_qr_url && !(c.group_qr_expires && new Date(c.group_qr_expires).getTime() < Date.now() - 86400e3) ? c.group_qr_url : null,
    groupQrNote: !joined ? '加入后能看到群二维码' : !c.group_qr_url ? '群二维码还没上传，负责人上传后这里会显示'
      : c.group_qr_expires && new Date(c.group_qr_expires).getTime() < Date.now() - 86400e3 ? '群二维码已过期，等负责人更换'
      : qrExpiring ? '群二维码快过期了，已提醒负责人更换' : null,
    meetups: await listMeetups(c, contactId, joined || leader)
  };
}

type MeetupRow = {
  id: string; title: string; starts_at: Date; location: string | null; address: string | null; capacity: number; note: string | null;
  status: string; sec_status: string; creator_id: string; creator_name: string | null; joined: number; mine: boolean;
};

async function listMeetups(c: Club, contactId: string | null, canSee: boolean) {
  if (!canSee) return [];
  // 过了开始时间 3 小时自动收起；被下架的不显示；还没过检测的只给发起人自己看（写“稍后显示”）
  const { rows } = await getPool().query<MeetupRow>(
    `SELECT u.*, NULLIF(ct.name, '微信用户') AS creator_name,
            (SELECT count(*)::int FROM club_meetup_joins j WHERE j.meetup_id = u.id) AS joined,
            EXISTS (SELECT 1 FROM club_meetup_joins j WHERE j.meetup_id = u.id AND j.contact_id = $2) AS mine
       FROM club_meetups u JOIN contacts ct ON ct.id = u.creator_id
      WHERE u.club_id = $1 AND u.status <> 'taken_down' AND u.starts_at > now() - interval '3 hours'
        AND (u.sec_status = 'ok' OR u.creator_id = $2)
        -- 测试窗口 Q12：已取消的排最后，取消一天后收起
        AND NOT (u.status = 'cancelled' AND u.updated_at < now() - interval '1 day')
      ORDER BY (u.status = 'cancelled'), u.starts_at`,
    [c.id, contactId]
  );
  const { geocode } = await import('./geo');
  const geos = await Promise.all(rows.map((u) => (u.address ? geocode(u.address) : Promise.resolve(null))));
  return rows.map((u, i) => ({
    id: u.id, title: u.title, startsAt: u.starts_at, location: u.location, address: u.address, geo: geos[i], capacity: u.capacity, note: u.note,
    joined: u.joined, full: u.joined >= u.capacity, iJoined: u.mine, mineCreated: u.creator_id === contactId,
    creator: u.creator_name ?? 'SAREC 用户', cancelled: u.status === 'cancelled',
    pending: u.status === 'cancelled' ? null : u.sec_status === 'pending' ? '内容检测中，稍后显示（只有您自己看得到）' : u.sec_status === 'rejected' ? '内容没通过检测，别人看不到，请修改后重新发起' : null
  }));
}

export async function createMeetup(contactId: string, key: string, b: Record<string, unknown>) {
  const c = await clubByKey(key);
  if (await isBanned(contactId)) throw new CrmError('club_banned', '您暂时不能发起组局。有疑问请在「联系商会」里找工作人员。');
  if (!(await isMemberOf(c.id, contactId))) throw new CrmError('forbidden', '先加入这个俱乐部，才能发起组局');
  const title = String(b.title ?? '').trim().slice(0, 30);
  const note = String(b.note ?? '').trim().slice(0, 80);
  const location = String(b.location ?? '').trim().slice(0, 60) || null;
  const address = String(b.address ?? '').trim().slice(0, 120) || null;
  const capacity = Math.floor(Number(b.capacity));
  const starts = new Date(String(b.startsAt ?? ''));
  if (!title) throw new CrmError('bad_request', '请写一个标题，例如“周六下午掼蛋局”');
  if (!Number.isFinite(starts.getTime()) || starts.getTime() < Date.now() - 60e3) throw new CrmError('bad_request', '请选一个还没到的时间');
  if (!(capacity >= 2 && capacity <= 200)) throw new CrmError('bad_request', '人数上限请填 2 到 200');
  const bad = gambleWords(`${title} ${note}`);
  // 测试窗口 Q14：提示不复述被拦的词，也不自己写出“输赢、金额”这类字
  if (bad) throw new CrmError('bad_words', '这段文字不能发，请只写活动内容和时间，例如“周六下午掼蛋”');
  // 文本安全检测：通过才直接显示；不通 / 需复核 → 先不显示，告诉发起人“稍后显示”
  const sec = await msgSecCheck(`${title}\n${note}\n${location ?? ''}`, await openidOf(contactId), 3);
  if (sec === 'risky') throw new CrmError('bad_words', '这段内容没通过微信内容检测，请修改后再发');
  const secStatus = sec === 'pass' ? 'ok' : 'pending';
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO club_meetups (club_id, creator_id, title, starts_at, location, address, capacity, note, sec_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [c.id, contactId, title, starts, location, address, capacity, note || null, secStatus]
  );
  await getPool().query(`INSERT INTO club_meetup_joins (meetup_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [rows[0].id, contactId]);
  return { id: rows[0].id, message: secStatus === 'ok' ? '组局已发起，俱乐部成员都能看到' : '已提交，内容检测中，稍后显示（现在只有您自己看得到）' };
}

async function meetupById(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new CrmError('not_found', '找不到这个组局');
  const { rows } = await getPool().query<{ id: string; club_id: string; creator_id: string; capacity: number; status: string; sec_status: string; starts_at: Date; title: string; leader: string | null }>(
    `SELECT u.id, u.club_id, u.creator_id, u.capacity, u.status, u.sec_status, u.starts_at, u.title, c.leader_contact_id AS leader
       FROM club_meetups u JOIN clubs c ON c.id = u.club_id WHERE u.id = $1`,
    [id]
  );
  if (!rows[0]) throw new CrmError('not_found', '找不到这个组局');
  return rows[0];
}

export async function joinMeetup(contactId: string, id: string, on: boolean) {
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ club_id: string; capacity: number; status: string; sec_status: string; starts_at: Date }>(
      `SELECT club_id, capacity, status, sec_status, starts_at FROM club_meetups WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const u = rows[0];
    if (u && u.status === 'open' && u.sec_status === 'pending') throw new CrmError('pending', '这个组局还在内容检测中，过了才能参加');
    if (!u || u.status !== 'open' || u.sec_status !== 'ok') throw new CrmError('not_found', '这个组局已经取消或下架了');
    if (!on) {
      await db.query(`DELETE FROM club_meetup_joins WHERE meetup_id = $1 AND contact_id = $2`, [id, contactId]);
      return { message: '已退出这个组局' };
    }
    if (await isBanned(contactId)) throw new CrmError('club_banned', '您暂时不能参加组局。有疑问请在「联系商会」里找工作人员。');
    const { rows: m } = await db.query(`SELECT 1 FROM club_members WHERE club_id = $1 AND contact_id = $2 AND left_at IS NULL`, [u.club_id, contactId]);
    if (!m[0]) throw new CrmError('forbidden', '先加入这个俱乐部，才能参加组局');
    if (new Date(u.starts_at).getTime() < Date.now()) throw new CrmError('closed', '这个组局已经开始了');
    const { rows: n } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM club_meetup_joins WHERE meetup_id = $1`, [id]);
    if (n[0].n >= u.capacity) throw new CrmError('full', '人满了，下次早点');
    await db.query(`INSERT INTO club_meetup_joins (meetup_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, contactId]);
    return { message: '已参加' };
  });
}

/** 发起人取消；负责人下架（有记录） */
export async function cancelMeetup(contactId: string, id: string, reason?: string | null) {
  const u = await meetupById(id);
  if (u.creator_id === contactId) {
    await getPool().query(`UPDATE club_meetups SET status = 'cancelled', updated_at = now() WHERE id = $1`, [id]);
    return { message: '组局已取消' };
  }
  if (u.leader === contactId) {
    await getPool().query(`UPDATE club_meetups SET status = 'taken_down', taken_down_by = 'leader', taken_down_reason = $2, updated_at = now() WHERE id = $1`, [id, reason ?? null]);
    await log('leader:' + contactId, 'meetup', id, 'take_down', reason);
    return { message: '已下架这个组局' };
  }
  throw new CrmError('forbidden', '只有发起人能取消、负责人能下架');
}

/** 负责人移出成员（有记录） */
export async function leaderRemoveMember(contactId: string, key: string, memberId: string) {
  const c = await clubByKey(key);
  if (c.leader_contact_id !== contactId) throw new CrmError('forbidden', '只有负责人能移出成员');
  if (memberId === contactId) throw new CrmError('bad_request', '负责人不能移出自己');
  await getPool().query(`UPDATE club_members SET left_at = now(), removed_by = 'leader' WHERE club_id = $1 AND contact_id = $2 AND left_at IS NULL`, [c.id, memberId]);
  await log('leader:' + contactId, 'club_member', `${c.key}:${memberId}`, 'remove');
  return { message: '已移出' };
}

/** 负责人上传群二维码（后台也能传） */
/** 改一个俱乐部 / 专委会的状态（已成立 / 筹备中）。设置里没有这一项就补上 */
export async function setClubStatus(s: Staff, key: string, name: string, status: 'active' | 'preparing') {
  const { setSetting } = await import('./orders');
  const { audit } = await import('./staff');
  await withTransaction(async (db) => {
    const before = await getSetting<{ key: string; name: string; status: string }[]>(db, 'committees', []);
    const list = Array.isArray(before) ? before : [];
    const i = list.findIndex((c) => c.key === key);
    if (i >= 0 && list[i].status === status) return;
    const after = i >= 0 ? list.map((c, j) => (j === i ? { ...c, status } : c)) : [...list, { key, name, status }];
    await setSetting(db, 'committees', after, s.name);
    await audit(db, s, 'update_setting', 'setting', 'committees', { before: list, after });
  });
}

/** 后台上传首页方块 / 详情页封面 */
export async function setClubCover(actor: string, key: string, url: string) {
  const { rowCount } = await getPool().query(`UPDATE clubs SET cover_url = $2, updated_at = now() WHERE key = $1`, [key, url]);
  if (!rowCount) throw new CrmError('not_found', '找不到这个俱乐部');
  await log(actor, 'club', key, 'set_cover', null);
  return { message: '封面已换好', url };
}

export async function setGroupQr(actor: string, key: string, url: string, expires: string | null, contactId?: string) {
  const c = await clubByKey(key);
  if (contactId && c.leader_contact_id !== contactId) throw new CrmError('forbidden', '只有负责人能换群二维码');
  if (!/^https:\/\//.test(url)) throw new CrmError('bad_request', '请上传群二维码图片');
  const exp = expires && /^\d{4}-\d{2}-\d{2}$/.test(expires) ? expires : new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10);
  // 指令 36：负责人传的群二维码检测完才给成员看（原来那张先不换）；工作人员在后台换的不用等
  if (contactId) {
    const g = await gateSlot('club_qr', c.key, url, contactId, { expires: exp });
    if (g.risky) throw new CrmError('bad_image', '这张图片没通过微信内容检测，请换一张');
    if (g.checking) {
      await log(actor, 'club', c.key, 'set_qr_checking', exp);
      return { message: '群二维码已收到，图片检测通过后成员就能看到' };
    }
  }
  await getPool().query(`UPDATE clubs SET group_qr_url = $2, group_qr_expires = $3, updated_at = now() WHERE id = $1`, [c.id, url, exp]);
  await log(actor, 'club', c.key, 'set_qr', exp);
  return { message: `群二维码已更新，${exp} 前提醒更换` };
}

// ── 后台 ─────────────────────────────────────────────────────────────

export async function staffClubs() {
  await ensureClubsSeeded();
  const { rows } = await getPool().query(
    `SELECT c.*, to_char(c.group_qr_expires, 'YYYY-MM-DD') AS group_qr_expires, NULLIF(l.name, '微信用户') AS leader_name, l.member_no::int AS leader_member_no,
            (SELECT count(*)::int FROM club_members m WHERE m.club_id = c.id AND m.left_at IS NULL) AS members,
            (SELECT count(*)::int FROM club_meetups u WHERE u.club_id = c.id AND u.status = 'open' AND u.starts_at > now()) AS open_meetups
       FROM clubs c LEFT JOIN contacts l ON l.id = c.leader_contact_id ORDER BY c.closed_at NULLS FIRST, c.sort_order, c.created_at`
  );
  const { rows: meetups } = await getPool().query(
    `SELECT u.id, u.title, u.starts_at, u.location, u.capacity, u.note, u.status, u.sec_status, u.taken_down_by, u.taken_down_reason, c.name AS club, c.key AS club_key,
            NULLIF(ct.name, '微信用户') AS creator, u.creator_id,
            (SELECT count(*)::int FROM club_meetup_joins j WHERE j.meetup_id = u.id) AS joined
       FROM club_meetups u JOIN clubs c ON c.id = u.club_id JOIN contacts ct ON ct.id = u.creator_id
      ORDER BY (u.sec_status = 'pending') DESC, u.starts_at DESC LIMIT 200`
  );
  const { rows: bans } = await getPool().query(
    `SELECT b.contact_id, NULLIF(c.name, '微信用户') AS name, b.reason, b.banned_by, b.banned_at FROM club_bans b JOIN contacts c ON c.id = b.contact_id ORDER BY b.banned_at DESC`
  );
  const { rows: actions } = await getPool().query(
    `SELECT kind, target_id, action, actor, note, created_at FROM ugc_actions WHERE kind IN ('club', 'meetup', 'club_member', 'club_ban') ORDER BY created_at DESC LIMIT 100`
  );
  const st = await committeeStatusMap();
  return { clubs: rows.map((r) => ({ ...r, status: st.get(r.key) ?? 'preparing' })), meetups, bans, actions };
}

export async function staffClubAction(s: Staff, b: Record<string, unknown>) {
  const pool = getPool();
  const actor = s.name || s.email;
  const act = String(b.action ?? '');
  if (act === 'save_club') {
    const key = String(b.key ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 30);
    const name = String(b.name ?? '').trim().slice(0, 20);
    if (!key || !name) throw new CrmError('bad_request', '请填英文短名和名字');
    const leader = typeof b.leaderMemberNo === 'string' || typeof b.leaderMemberNo === 'number'
      ? (await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE member_no = $1`, [Number(b.leaderMemberNo)])).rows[0]?.id ?? null
      : undefined;
    if (b.leaderMemberNo && !leader) throw new CrmError('bad_request', '没找到这个会员号');
    const { rows: was } = await pool.query<{ sort_order: number }>(`SELECT sort_order FROM clubs WHERE key = $1`, [key]);
    await pool.query(
      `INSERT INTO clubs (key, name, intro, members_only, sort_order, leader_contact_id) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, intro = EXCLUDED.intro, members_only = EXCLUDED.members_only, sort_order = EXCLUDED.sort_order,
         leader_contact_id = CASE WHEN $7 THEN EXCLUDED.leader_contact_id ELSE clubs.leader_contact_id END, updated_at = now()`,
      [key, name, String(b.intro ?? '').trim().slice(0, 200) || null, b.membersOnly === true, Math.floor(Number(b.sortOrder) || 0), leader ?? null, leader !== undefined]
    );
    // 1.5.0 体验1：首页方块的图标（一个表情或 1–2 个字）；不传 = 不改，传空 = 清掉
    if (typeof b.icon === 'string') {
      const icon = Array.from(b.icon.trim()).slice(0, 2).join('') || null;
      await pool.query(`UPDATE clubs SET icon = $2 WHERE key = $1`, [key, icon]);
    }
    if (b.clearCover === true) await pool.query(`UPDATE clubs SET cover_url = NULL WHERE key = $1`, [key]);
    // 指令 27：已成立 / 筹备中——和「设置 › 专委会与俱乐部状态」写同一份 crm_settings.committees，记同样的操作记录（迁移 0045 据此认“人工改过”）
    if (b.status === 'active' || b.status === 'preparing') await setClubStatus(s, key, name, b.status);
    await log(actor, 'club', key, 'save', name);
    // 人工调过顺序单独记一条（迁移 0044 看到有人调过就不再动默认顺序）
    const newSort = Math.floor(Number(b.sortOrder) || 0);
    if (!was[0] || was[0].sort_order !== newSort) await log(actor, 'club', key, 'reorder', `排序 ${was[0]?.sort_order ?? '新建'} → ${newSort}`);
    return { message: `已保存「${name}」` };
  }
  if (act === 'close_club' || act === 'reopen_club') {
    await pool.query(`UPDATE clubs SET closed_at = ${act === 'close_club' ? 'now()' : 'NULL'}, updated_at = now() WHERE key = $1`, [String(b.key ?? '')]);
    await log(actor, 'club', String(b.key ?? ''), act, String(b.reason ?? '') || null);
    return { message: act === 'close_club' ? '俱乐部已关闭（小程序里不再显示）' : '俱乐部已重新打开' };
  }
  if (act === 'set_qr') return setGroupQr(actor, String(b.key ?? ''), String(b.url ?? ''), (b.expires as string) ?? null);
  if (act === 'take_down' || act === 'restore' || act === 'approve') {
    const id = String(b.id ?? '');
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new CrmError('bad_request', '找不到这个组局');
    if (act === 'take_down') await pool.query(`UPDATE club_meetups SET status = 'taken_down', taken_down_by = $2, taken_down_reason = $3, updated_at = now() WHERE id = $1`, [id, actor, String(b.reason ?? '') || null]);
    if (act === 'restore') await pool.query(`UPDATE club_meetups SET status = 'open', taken_down_by = NULL, taken_down_reason = NULL, updated_at = now() WHERE id = $1`, [id]);
    if (act === 'approve') await pool.query(`UPDATE club_meetups SET sec_status = 'ok', updated_at = now() WHERE id = $1`, [id]);
    await log(actor, 'meetup', id, act, String(b.reason ?? '') || null);
    return { message: { take_down: '已下架', restore: '已恢复', approve: '已放行，成员能看到了' }[act] };
  }
  if (act === 'ban' || act === 'unban') {
    const cid = String(b.contactId ?? '');
    if (!/^[0-9a-f-]{36}$/.test(cid)) throw new CrmError('bad_request', '找不到这个人');
    if (act === 'ban') await pool.query(`INSERT INTO club_bans (contact_id, reason, banned_by) VALUES ($1, $2, $3) ON CONFLICT (contact_id) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_at = now()`, [cid, String(b.reason ?? '') || null, actor]);
    else await pool.query(`DELETE FROM club_bans WHERE contact_id = $1`, [cid]);
    await log(actor, 'club_ban', cid, act, String(b.reason ?? '') || null);
    return { message: act === 'ban' ? '已禁止（不能发起、不能参加组局）' : '已解除' };
  }
  throw new CrmError('bad_request', '不支持的操作');
}
