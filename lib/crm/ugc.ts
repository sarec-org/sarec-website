/**
 * 1.5.0 用户内容：举报、个人主页（在电子名片上加）、商会风采（官方）。
 * 个人主页的文字先过微信文本安全检测；图片在没配好微信图片检测（要在小程序后台配消息推送）之前一律先审后发——工作人员在后台「主页审核」里放行。
 * 后台可下架、可禁人（不能再改个人主页），都有记录（ugc_actions）。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import { memberStatus } from './membership';
import { msgSecCheck } from './contentSec';
import type { Staff } from './auth';

async function log(actor: string, kind: string, targetId: string | null, action: string, note?: string | null) {
  await getPool().query(`INSERT INTO ugc_actions (kind, target_id, action, actor, note) VALUES ($1, $2, $3, $4, $5)`, [kind, targetId, action, actor, note ?? null]);
}
async function openidOf(contactId: string): Promise<string | null> {
  const { rows } = await getPool().query<{ o: string | null }>(`SELECT wechat_openid AS o FROM contacts WHERE id = $1`, [contactId]);
  const o = rows[0]?.o ?? null;
  return o && !o.startsWith('dev-openid-') ? o : null;
}

// ── 举报 ─────────────────────────────────────────────────────────────
export const REPORT_REASONS = ['广告推销', '色情低俗', '赌博或金钱输赢', '违法违规', '冒充他人', '骚扰或人身攻击', '其他'];
const KINDS = ['meetup', 'profile', 'card', 'photo', 'club_member'] as const;

export async function report(contactId: string, b: Record<string, unknown>) {
  const kind = String(b.kind ?? '');
  if (!(KINDS as readonly string[]).includes(kind)) throw new CrmError('bad_request', '举报的内容类型不对');
  const target = String(b.targetId ?? '').trim().slice(0, 80);
  if (!target) throw new CrmError('bad_request', '缺少举报对象');
  const reason = REPORT_REASONS.includes(String(b.reason)) ? String(b.reason) : '其他';
  const detail = String(b.detail ?? '').trim().slice(0, 200) || null;
  // 同一个人同一条内容一天内只记一次
  const { rows: dup } = await getPool().query(`SELECT 1 FROM ugc_reports WHERE kind = $1 AND target_id = $2 AND reporter_id = $3 AND created_at > now() - interval '1 day'`, [kind, target, contactId]);
  if (!dup[0]) await getPool().query(`INSERT INTO ugc_reports (kind, target_id, reporter_id, reason, detail) VALUES ($1, $2, $3, $4, $5)`, [kind, target, contactId, reason, detail]);
  return { message: '收到了，工作人员会尽快查看处理。谢谢您。' };
}

export async function staffReports(status: string) {
  const st = ['open', 'done', 'dismissed', 'all'].includes(status) ? status : 'open';
  const { rows } = await getPool().query(
    `SELECT r.*, NULLIF(c.name, '微信用户') AS reporter_name FROM ugc_reports r LEFT JOIN contacts c ON c.id = r.reporter_id
      WHERE ($1 = 'all' OR r.status = $1) ORDER BY r.created_at DESC LIMIT 300`,
    [st]
  );
  const { rows: cnt } = await getPool().query<{ n: number }>(`SELECT count(*)::int AS n FROM ugc_reports WHERE status = 'open'`);
  // 每条举报带上被举报内容的摘要，后台一眼看清
  const out = [];
  for (const r of rows as { kind: string; target_id: string }[]) out.push({ ...r, summary: await targetSummary(r.kind, r.target_id) });
  return { reports: out, open: cnt[0].n };
}

async function targetSummary(kind: string, id: string): Promise<{ text: string; link: string | null }> {
  const pool = getPool();
  try {
    if (kind === 'meetup') {
      const { rows } = await pool.query<{ title: string; note: string | null; club: string; status: string }>(`SELECT u.title, u.note, c.name AS club, u.status FROM club_meetups u JOIN clubs c ON c.id = u.club_id WHERE u.id = $1`, [id]);
      return rows[0] ? { text: `组局「${rows[0].title}」（${rows[0].club}）${rows[0].note ? '：' + rows[0].note : ''}${rows[0].status === 'taken_down' ? ' · 已下架' : ''}`, link: '/zh/staff/clubs' } : { text: '（组局已删除）', link: null };
    }
    if (kind === 'profile' || kind === 'card') {
      const { rows } = await pool.query<{ name: string | null; bio: string | null; company: string | null }>(`SELECT NULLIF(c.name, '微信用户') AS name, m.bio, m.company FROM contacts c LEFT JOIN member_cards m ON m.contact_id = c.id WHERE c.id::text = $1 OR m.token = $1`, [id]);
      return rows[0] ? { text: `${rows[0].name ?? 'SAREC 用户'} 的${kind === 'card' ? '名片' : '个人主页'}${rows[0].company ? '（' + rows[0].company + '）' : ''}${rows[0].bio ? '：' + rows[0].bio.slice(0, 60) : ''}`, link: kind === 'card' ? '/zh/staff/cards' : '/zh/staff/profiles' } : { text: '（已删除）', link: null };
    }
    if (kind === 'photo') {
      const { rows } = await pool.query<{ thumb_url: string; title: string }>(`SELECT p.thumb_url, e.title FROM event_photos p JOIN events e ON e.id = p.event_id WHERE p.id::text = $1`, [id]);
      return rows[0] ? { text: `「${rows[0].title}」相册里的一张照片：${rows[0].thumb_url}`, link: '/zh/staff/album' } : { text: '（照片已删除）', link: null };
    }
  } catch { /* 表还没建 */ }
  return { text: id, link: null };
}

export async function handleReport(s: Staff, id: string, status: 'done' | 'dismissed', note?: string | null) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new CrmError('bad_request', '找不到这条举报');
  await getPool().query(`UPDATE ugc_reports SET status = $2, handled_by = $3, handled_at = now() WHERE id = $1`, [id, status, s.name || s.email]);
  await log(s.name || s.email, 'report', id, status, note ?? null);
  return { message: status === 'done' ? '已标为处理完' : '已标为不用处理' };
}

// ── 个人主页 ─────────────────────────────────────────────────────────
/** 缴费会员可展示更多条（特权）：项目 / 案例 会员 6 条、注册用户 2 条；"能提供 / 在找"会员 8 个、注册用户 4 个 */
export function profileLimits(isMember: boolean) {
  return { projects: isMember ? 6 : 2, tags: isMember ? 8 : 4 };
}
/** "我能提供 / 我在找"先从这些里选（第一版不放开随便写，减少用户自由发文字） */
export const PROFILE_TAGS = ['项目合作', '资金', '投资机会', '土地', '开发建设', '设计', '施工', '法律', '税务', '贷款', '物业管理', '租赁', '买卖经纪', '1031 交换', 'ADU', '商业地产', '跨境身份', '子女教育', '资源对接', '人脉介绍'];

async function isProfileBanned(contactId: string) {
  const { rows } = await getPool().query(`SELECT 1 FROM profile_bans WHERE contact_id = $1`, [contactId]);
  return !!rows[0];
}

export async function myProfile(contactId: string) {
  const pool = getPool();
  const isMember = (await memberStatus(pool, contactId)).isMember;
  const { rows } = await pool.query<{ bio: string | null; company_intro: string | null; offers: string[]; seeks: string[]; profile_status: string }>(
    `SELECT bio, company_intro, offers, seeks, profile_status FROM member_cards WHERE contact_id = $1`, [contactId]
  );
  const { rows: projects } = await pool.query(
    `SELECT id, title, body, images, status FROM profile_projects WHERE contact_id = $1 AND status <> 'taken_down' ORDER BY sort_order, created_at`, [contactId]
  );
  return {
    hasCard: !!rows[0], bio: rows[0]?.bio ?? '', companyIntro: rows[0]?.company_intro ?? '', offers: rows[0]?.offers ?? [], seeks: rows[0]?.seeks ?? [],
    textStatus: rows[0]?.profile_status ?? 'ok', projects, limits: profileLimits(isMember), isMember, tagOptions: PROFILE_TAGS,
    banned: await isProfileBanned(contactId)
  };
}

export async function saveProfile(contactId: string, b: Record<string, unknown>) {
  if (await isProfileBanned(contactId)) throw new CrmError('profile_banned', '您的个人主页暂时不能修改。有疑问请在「联系商会」里找工作人员。');
  const pool = getPool();
  const isMember = (await memberStatus(pool, contactId)).isMember;
  const lim = profileLimits(isMember);
  const bio = String(b.bio ?? '').trim().slice(0, 300);
  const companyIntro = String(b.companyIntro ?? '').trim().slice(0, 300);
  const pick = (v: unknown) => (Array.isArray(v) ? v.map(String).filter((x) => PROFILE_TAGS.includes(x)) : []).slice(0, lim.tags);
  const offers = pick(b.offers);
  const seeks = pick(b.seeks);
  const { rows } = await pool.query(`SELECT 1 FROM member_cards WHERE contact_id = $1`, [contactId]);
  if (!rows[0]) throw new CrmError('no_card', '先做一张电子名片，再加个人主页');
  const sec = await msgSecCheck(`${bio}\n${companyIntro}`, await openidOf(contactId), 1);
  if (sec === 'risky') throw new CrmError('bad_words', '这段内容没通过微信内容检测，请修改后再保存');
  const status = sec === 'pass' || (!bio && !companyIntro) ? 'ok' : 'pending';
  await pool.query(
    `UPDATE member_cards SET bio = $2, company_intro = $3, offers = $4, seeks = $5, profile_status = $6, updated_at = now() WHERE contact_id = $1`,
    [contactId, bio || null, companyIntro || null, offers, seeks, status]
  );
  return { message: status === 'ok' ? '个人主页已保存' : '已保存。简介在内容检测中，稍后对别人显示（您自己现在就能看到）', status };
}

export async function saveProject(contactId: string, b: Record<string, unknown>) {
  if (await isProfileBanned(contactId)) throw new CrmError('profile_banned', '您的个人主页暂时不能修改。有疑问请在「联系商会」里找工作人员。');
  const pool = getPool();
  const lim = profileLimits((await memberStatus(pool, contactId)).isMember);
  const title = String(b.title ?? '').trim().slice(0, 30);
  const body = String(b.body ?? '').trim().slice(0, 500);
  const images = (Array.isArray(b.images) ? b.images.map(String) : []).filter((u) => /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(u)).slice(0, 6);
  if (!title) throw new CrmError('bad_request', '请写一个项目名称');
  const id = typeof b.id === 'string' && /^[0-9a-f-]{36}$/.test(b.id) ? b.id : null;
  if (!id) {
    const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM profile_projects WHERE contact_id = $1 AND status <> 'taken_down'`, [contactId]);
    if (rows[0].n >= lim.projects) throw new CrmError('limit', lim.projects >= 6 ? `最多展示 ${lim.projects} 个项目` : `注册用户最多展示 ${lim.projects} 个项目，会员可以展示 6 个`);
  }
  const sec = await msgSecCheck(`${title}\n${body}`, await openidOf(contactId), 1);
  if (sec === 'risky') throw new CrmError('bad_words', '这段内容没通过微信内容检测，请修改后再保存');
  // 有图片的一律先审后发（微信图片检测要在后台配消息推送，配好前由工作人员看）；纯文字检测通过直接显示
  const status = sec === 'pass' && images.length === 0 ? 'ok' : 'pending';
  if (id) {
    const { rowCount } = await pool.query(
      `UPDATE profile_projects SET title = $3, body = $4, images = $5, status = $6, updated_at = now() WHERE id = $1 AND contact_id = $2 AND status <> 'taken_down'`,
      [id, contactId, title, body || null, images, status]
    );
    if (!rowCount) throw new CrmError('not_found', '找不到这个项目');
  } else {
    await pool.query(`INSERT INTO profile_projects (contact_id, title, body, images, status) VALUES ($1, $2, $3, $4, $5)`, [contactId, title, body || null, images, status]);
  }
  return { message: status === 'ok' ? '项目已保存' : '已保存，工作人员看过后对别人显示（一般一个工作日内）', status };
}

export async function deleteProject(contactId: string, id: string) {
  await getPool().query(`DELETE FROM profile_projects WHERE id = $1 AND contact_id = $2`, [id, contactId]);
  return { message: '已删除' };
}

/** 别人看到的个人主页（名片页往下）：只给已通过的内容 */
export async function publicProfile(token: string) {
  const pool = getPool();
  const { rows } = await pool.query<{ contact_id: string; bio: string | null; company_intro: string | null; offers: string[]; seeks: string[]; profile_status: string; hidden_at: Date | null }>(
    `SELECT contact_id, bio, company_intro, offers, seeks, profile_status, hidden_at FROM member_cards WHERE token = $1`, [token]
  );
  const r = rows[0];
  if (!r || r.hidden_at) return null;
  const { rows: projects } = await pool.query(
    `SELECT id, title, body, images FROM profile_projects WHERE contact_id = $1 AND status = 'ok' ORDER BY sort_order, created_at`, [r.contact_id]
  );
  const textOk = r.profile_status === 'ok';
  return {
    bio: textOk ? r.bio : null, companyIntro: textOk ? r.company_intro : null, offers: r.offers, seeks: r.seeks, projects,
    isMember: (await memberStatus(pool, r.contact_id)).isMember
  };
}

// 后台「主页审核」
export async function staffProfiles(filter: string) {
  const f = ['pending', 'all', 'taken_down'].includes(filter) ? filter : 'pending';
  const { rows: texts } = await getPool().query(
    `SELECT m.contact_id, NULLIF(c.name, '微信用户') AS name, c.member_no::int AS member_no, m.bio, m.company_intro, m.offers, m.seeks, m.profile_status, m.updated_at
       FROM member_cards m JOIN contacts c ON c.id = m.contact_id
      WHERE ($1 = 'all' AND (m.bio IS NOT NULL OR m.company_intro IS NOT NULL)) OR ($1 = 'pending' AND m.profile_status = 'pending') OR ($1 = 'taken_down' AND m.profile_status = 'taken_down')
      ORDER BY m.updated_at DESC LIMIT 200`,
    [f]
  );
  const { rows: projects } = await getPool().query(
    `SELECT p.*, NULLIF(c.name, '微信用户') AS name, c.member_no::int AS member_no FROM profile_projects p JOIN contacts c ON c.id = p.contact_id
      WHERE ($1 = 'all') OR ($1 = 'pending' AND p.status = 'pending') OR ($1 = 'taken_down' AND p.status = 'taken_down')
      ORDER BY p.updated_at DESC LIMIT 200`,
    [f]
  );
  const { rows: bans } = await getPool().query(
    `SELECT b.contact_id, NULLIF(c.name, '微信用户') AS name, b.reason, b.banned_by, b.banned_at FROM profile_bans b JOIN contacts c ON c.id = b.contact_id ORDER BY b.banned_at DESC`
  );
  const { rows: cnt } = await getPool().query<{ n: number }>(
    `SELECT ((SELECT count(*) FROM member_cards WHERE profile_status = 'pending') + (SELECT count(*) FROM profile_projects WHERE status = 'pending'))::int AS n`
  );
  return { texts, projects, bans, pending: cnt[0].n };
}

export async function staffProfileAction(s: Staff, b: Record<string, unknown>) {
  const pool = getPool();
  const actor = s.name || s.email;
  const act = String(b.action ?? '');
  const id = String(b.id ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new CrmError('bad_request', '找不到这条内容');
  if (act === 'approve_text' || act === 'take_down_text') {
    await pool.query(`UPDATE member_cards SET profile_status = $2 WHERE contact_id = $1`, [id, act === 'approve_text' ? 'ok' : 'taken_down']);
    await log(actor, 'profile', id, act);
    return { message: act === 'approve_text' ? '已放行' : '已下架（别人看不到简介和公司介绍了）' };
  }
  if (act === 'approve_project' || act === 'take_down_project' || act === 'reject_project') {
    const st = { approve_project: 'ok', take_down_project: 'taken_down', reject_project: 'rejected' }[act];
    await pool.query(`UPDATE profile_projects SET status = $2, reviewed_by = $3, reviewed_at = now() WHERE id = $1`, [id, st, actor]);
    await log(actor, 'profile_project', id, act, String(b.reason ?? '') || null);
    return { message: { approve_project: '已放行，别人能看到了', take_down_project: '已下架', reject_project: '已退回（只有本人看得到，可以改了再提交）' }[act] };
  }
  if (act === 'ban' || act === 'unban') {
    if (act === 'ban') await pool.query(`INSERT INTO profile_bans (contact_id, reason, banned_by) VALUES ($1, $2, $3) ON CONFLICT (contact_id) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_at = now()`, [id, String(b.reason ?? '') || null, actor]);
    else await pool.query(`DELETE FROM profile_bans WHERE contact_id = $1`, [id]);
    await log(actor, 'profile_ban', id, act, String(b.reason ?? '') || null);
    return { message: act === 'ban' ? '已禁止此人修改个人主页' : '已解除' };
  }
  throw new CrmError('bad_request', '不支持的操作');
}

// ── 商会风采（官方） ────────────────────────────────────────────────
export const SHOWCASE_KIND_LABEL: Record<string, string> = { vice_president: '副会长单位', partner: '战略合作方' };

export async function listShowcase(includeHidden = false) {
  const { rows } = await getPool().query(
    `SELECT o.*, NULLIF(c.name, '微信用户') AS contact_name, m.token AS contact_token, m.title AS contact_title
       FROM showcase_orgs o LEFT JOIN contacts c ON c.id = o.contact_contact_id LEFT JOIN member_cards m ON m.contact_id = o.contact_contact_id AND m.hidden_at IS NULL
      WHERE $1 OR NOT o.hidden ORDER BY o.kind = 'partner', o.sort_order, o.created_at`,
    [includeHidden]
  );
  return rows.map((o: Record<string, unknown>) => ({
    id: o.id, kind: o.kind, kindLabel: SHOWCASE_KIND_LABEL[o.kind as string], name: o.name, logoUrl: o.logo_url, intro: o.intro, projects: o.projects,
    contact: o.contact_name ? { name: o.contact_name, token: o.contact_token, title: o.contact_title } : null, sortOrder: o.sort_order, hidden: o.hidden
  }));
}

export async function saveShowcase(s: Staff, b: Record<string, unknown>) {
  const pool = getPool();
  const kind = b.kind === 'partner' ? 'partner' : 'vice_president';
  const name = String(b.name ?? '').trim().slice(0, 40);
  if (!name) throw new CrmError('bad_request', '请填单位名称');
  const projects = (Array.isArray(b.projects) ? b.projects : []).slice(0, 8).map((p) => ({
    title: String((p as Record<string, unknown>).title ?? '').trim().slice(0, 40),
    text: String((p as Record<string, unknown>).text ?? '').trim().slice(0, 500),
    images: (Array.isArray((p as Record<string, unknown>).images) ? ((p as Record<string, unknown>).images as unknown[]).map(String) : []).slice(0, 6)
  })).filter((p) => p.title);
  let contactId: string | null = null;
  if (b.contactMemberNo) {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE member_no = $1`, [Number(b.contactMemberNo)]);
    if (!rows[0]) throw new CrmError('bad_request', '没找到这个联系人会员号');
    contactId = rows[0].id;
  }
  const id = typeof b.id === 'string' && /^[0-9a-f-]{36}$/.test(b.id) ? b.id : null;
  const vals = [kind, name, String(b.logoUrl ?? '') || null, String(b.intro ?? '').trim().slice(0, 600) || null, JSON.stringify(projects), contactId, Math.floor(Number(b.sortOrder) || 0), b.hidden === true];
  if (id) await pool.query(`UPDATE showcase_orgs SET kind = $2, name = $3, logo_url = $4, intro = $5, projects = $6::jsonb, contact_contact_id = $7, sort_order = $8, hidden = $9, updated_at = now() WHERE id = $1`, [id, ...vals]);
  else await pool.query(`INSERT INTO showcase_orgs (kind, name, logo_url, intro, projects, contact_contact_id, sort_order, hidden) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`, vals);
  await log(s.name || s.email, 'showcase', id ?? name, id ? 'update' : 'create');
  return { message: `已保存「${name}」` };
}

// ── 找合作 / 找人筛选 ────────────────────────────────────────────────
/**
 * 1.5.0 在 1.4.1 的找人上加筛选：行业、城市、"我在找 / 我能提供"。只搜打开了“让大家能搜到我”的人；不给手机邮箱。
 */
export async function findPeople(me: string, f: { q?: string; industry?: string; city?: string; offer?: string; seek?: string }) {
  const pool = getPool();
  const q = String(f.q ?? '').trim().slice(0, 40);
  const { rows } = await pool.query<{ contact_id: string; name: string | null; company: string | null; title: string | null; industry: string | null; region: string | null; token: string; avatar_url: string | null; offers: string[]; seeks: string[] }>(
    `SELECT m.contact_id, NULLIF(c.name, '微信用户') AS name, m.company, m.title, m.industry, c.region_self AS region, m.token, c.avatar_url, m.offers, m.seeks
       FROM member_cards m JOIN contacts c ON c.id = m.contact_id
      WHERE m.searchable IS TRUE AND m.hidden_at IS NULL AND c.id <> $1 AND c.merged_into IS NULL AND NULLIF(c.name, '微信用户') IS NOT NULL
        AND ($2 = '' OR c.name ILIKE '%' || $2 || '%' OR m.company ILIKE '%' || $2 || '%' OR m.title ILIKE '%' || $2 || '%' OR m.industry ILIKE '%' || $2 || '%')
        AND ($3 = '' OR m.industry ILIKE '%' || $3 || '%')
        AND ($4 = '' OR c.region_self = $4 OR (m.show_address AND m.address ILIKE '%' || $4 || '%'))
        AND ($5 = '' OR $5 = ANY(m.offers))
        AND ($6 = '' OR $6 = ANY(m.seeks))
      ORDER BY c.name LIMIT 50`,
    [me, q, String(f.industry ?? '').trim(), String(f.city ?? '').trim(), String(f.offer ?? '').trim(), String(f.seek ?? '').trim()]
  );
  const people = [];
  for (const r of rows) people.push({ name: r.name, company: r.company, title: r.title, industry: r.industry, region: r.region, token: r.token, avatarUrl: r.avatar_url, offers: r.offers, seeks: r.seeks, isMember: (await memberStatus(pool, r.contact_id)).isMember });
  const { rows: inds } = await pool.query<{ industry: string }>(`SELECT DISTINCT industry FROM member_cards WHERE searchable IS TRUE AND NULLIF(industry, '') IS NOT NULL ORDER BY industry LIMIT 40`);
  const { rows: cities } = await pool.query<{ region: string }>(`SELECT DISTINCT c.region_self AS region FROM member_cards m JOIN contacts c ON c.id = m.contact_id WHERE m.searchable IS TRUE AND c.region_self IS NOT NULL ORDER BY 1 LIMIT 40`);
  return { people, filters: { industries: inds.map((x) => x.industry), cities: cities.map((x) => x.region), tags: PROFILE_TAGS } };
}
