/**
 * 1.6.0 活动工具开放给别的主办方（指令 48 / 49；方案见 ~/WeChatProjects/活动工具开放_方案.md「11/23 修正」）。
 *
 * 数据隔离（第 5 条）：
 * - 主办方的活动、报名只在 org_events / org_regs，商会的活动、待跟进、今天、群发、积分、活动后总结都不读这两张表。
 * - 每个接口都先查"这个人是不是这场活动所属主办方的负责人 / 帮手"，不是就当"找不到"（换链接、换编号也拿不到别家名单）。
 * - 帮手只看现场所需（姓名、手机尾号、人数、到场、已交费），不能导出；导出只限负责人，要登录、下载地址 10 分钟有效只能下一次、每次有记录。
 * - 报名的人如果是刚因为这场活动来的、和商会没关系，标成"主办方的客人"（lib/org/guest.ts）。
 *
 * 报名和接龙是同一套（mode = signup / chain）：同一份名单、签到、统计；一共几位就占几个名额；接龙名单可选公开称呼，手机号永不公开。
 * 收费：小程序里不收钱，只显示"本活动收费，现场交／联系主办方"，不显示金额数字、不写账号；"已交费"是主办方手动标记。
 */
import { createHash, randomBytes } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError, checkinWindow, normalizePhone } from '@/lib/crm/events';
import { getSetting } from '@/lib/crm/orders';
import { msgSecCheck } from '@/lib/crm/contentSec';
import { checkinKeyOk } from '@/lib/crm/wechat';
import type { Db } from '@/lib/crm/profile';
import { markGuestIfNew } from './guest';
import { checkTemplateForEvent } from './posterTemplates';
import { checkOwnForEvent, getOwnPoster, ownPublicUrl } from './posterOwn';
import { CHAIN_TEMPLATE, FEE_LABEL, FORM_FIELDS, PROMISE_SECTIONS, PROMISE_TITLE, PROMISE_VERSION, TEMPLATES, bannedWord, disclosure } from './texts';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randCode = (n: number) => Array.from(randomBytes(n)).map((b) => ALPHA[b % ALPHA.length]).join('');
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
export const MAX_HELPERS = 2; // 待东哥定（暂定 2 个）
export const EXPORT_TTL_MIN = 10;
export const SUSPEND_EXPORT_DAYS = 30;

// ── 开关 ─────────────────────────────────────────────────────────────
/** 总开关（没有记录 = 开）：关掉后「我办的活动」入口消失、主办方活动页显示"暂停使用"，不用重新传小程序 */
export const toolOn = (db: Db = getPool()) => getSetting<boolean>(db, 'org_tool_on', true).then((v) => v !== false);
/** 接龙模式开关（没有记录 = 关）：第一版代码里有，开关关着；第二版单独提审再打开 */
export const chainOn = (db: Db = getPool()) => getSetting<boolean>(db, 'org_chain_on', false).then((v) => v === true);

async function requireToolOn() {
  if (!(await toolOn())) throw new CrmError('org_off', '活动工具暂停使用，请稍后再来');
}

// ── 身份 ─────────────────────────────────────────────────────────────
type Org = { id: string; name: string; logo_url: string | null; public_contact: string | null; status: string; review_left: number; suspended_at: Date | null };
type Member = Org & { role: 'owner' | 'helper' };

export async function myOrgs(contactId: string, db: Db = getPool()): Promise<Member[]> {
  const { rows } = await db.query<Member>(
    `SELECT o.id, o.name, o.logo_url, o.public_contact, o.status, o.review_left, o.suspended_at, m.role
       FROM organizer_members m JOIN organizers o ON o.id = m.organizer_id
      WHERE m.contact_id = $1 AND m.removed_at IS NULL AND o.status IN ('active', 'suspended')
      ORDER BY m.role = 'owner' DESC, o.created_at`,
    [contactId]
  ).catch(() => ({ rows: [] as Member[] })); // 迁移没跑：没有主办方
  return rows;
}

/** 「我的」页用：这个人是不是主办方（总开关关着时不给入口） */
export async function meEntry(contactId: string | null) {
  if (!contactId) return null;
  const orgs = await myOrgs(contactId);
  if (!orgs.length || !(await toolOn())) return null;
  return { name: orgs[0].name, role: orgs[0].role, count: orgs.length, suspended: orgs[0].status === 'suspended' };
}

async function memberOf(db: Db, contactId: string, orgId: string): Promise<Member | null> {
  const { rows } = await db.query<Member>(
    `SELECT o.id, o.name, o.logo_url, o.public_contact, o.status, o.review_left, o.suspended_at, m.role
       FROM organizer_members m JOIN organizers o ON o.id = m.organizer_id
      WHERE m.contact_id = $1 AND m.organizer_id = $2 AND m.removed_at IS NULL AND o.status IN ('active', 'suspended')`,
    [contactId, orgId]
  );
  return rows[0] ?? null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = () => new CrmError('not_found', '找不到这场活动，或者您不是这场活动的主办方');

export type OrgEvent = {
  id: string; organizer_id: string; code: string; mode: 'signup' | 'chain'; template: string | null; title: string; starts_at: Date; ends_at: Date | null;
  timezone: string; location_name: string | null; address: string | null; capacity: number | null; deadline_at: Date | null; description: string | null;
  has_fee: boolean; fee_way: string | null; form_fields: string[]; question: string | null; list_public: 'nickname' | 'hidden'; status: string;
  sec_status: string | null; review_note: string | null; taken_down_reason: string | null; checkin_secret: string; info_version: number; poster_version: number;
  created_at: Date; published_at: Date | null;
  updated_at: Date; poster_tpl: string | null; poster_own: string | null; // 1.7.0（迁移 0053）：选的海报模板 / 自己传的海报
};

/**
 * 主办方这边的接口都走这里：这场活动属于的主办方里，这个人是负责人 / 帮手才放行；
 * 不是（别家的活动、乱填的编号）一律"找不到"，不透露这场活动存在。
 */
export async function eventAccess(db: Db, contactId: string, eventId: string, need: 'helper' | 'owner'): Promise<{ ev: OrgEvent; m: Member }> {
  if (!UUID.test(eventId)) throw NOT_FOUND();
  const { rows } = await db.query<OrgEvent>(`SELECT * FROM org_events WHERE id = $1`, [eventId]);
  const ev = rows[0];
  if (!ev) throw NOT_FOUND();
  const m = await memberOf(db, contactId, ev.organizer_id);
  if (!m) throw NOT_FOUND();
  if (need === 'owner' && m.role !== 'owner') throw new CrmError('forbidden', '这项只有负责人能做（帮手不能）');
  return { ev, m };
}

async function pickOrg(contactId: string, orgId?: string | null): Promise<Member> {
  const orgs = await myOrgs(contactId);
  const m = orgId ? orgs.find((o) => o.id === orgId) : orgs[0];
  if (!m) throw new CrmError('forbidden', '您还不是开通的主办方。想办活动可以在活动页底部点「我也要办活动」申请。');
  return m;
}

// ── 时间显示 ─────────────────────────────────────────────────────────
const fmt = (d: Date | null, tz: string, o: Intl.DateTimeFormatOptions) => (d ? new Intl.DateTimeFormat('zh-CN', { timeZone: tz, ...o }).format(new Date(d)) : '');
export function whenText(ev: { starts_at: Date; ends_at: Date | null; timezone: string }) {
  const day = fmt(ev.starts_at, ev.timezone, { month: 'numeric', day: 'numeric', weekday: 'short' });
  const t = (d: Date) => fmt(d, ev.timezone, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${t(ev.starts_at)}${ev.ends_at ? '–' + t(ev.ends_at) : ''}`;
}
const endOf = (ev: { starts_at: Date; ends_at: Date | null }) => new Date(ev.ends_at ?? new Date(new Date(ev.starts_at).getTime() + 3 * 3600_000));
const ended = (ev: { starts_at: Date; ends_at: Date | null }) => endOf(ev).getTime() < Date.now();
const feeLabel = (ev: Pick<OrgEvent, 'has_fee' | 'fee_way'>) => (!ev.has_fee ? FEE_LABEL.free : ev.fee_way === 'onsite' ? FEE_LABEL.onsite : FEE_LABEL.contact);
const maskPhone = (p: string | null) => (p ? '尾号 ' + p.replace(/\D/g, '').slice(-4) : '');

// ── 开通码 / 帮手码 ───────────────────────────────────────────────────
export function promise() {
  return { title: PROMISE_TITLE, version: PROMISE_VERSION, sections: PROMISE_SECTIONS };
}
export const ORG_QR_PREFIX = 'sarec-org:';
export function normalizeOrgCode(raw: string): string {
  let c = String(raw || '').trim();
  try { c = decodeURIComponent(c); } catch { /* 原样 */ }
  const m = /(?:ob=|sarec-org:)\s*([A-Za-z0-9]{10})/i.exec(c);
  return (m ? m[1] : c.replace(/\s+/g, '')).toUpperCase();
}
export async function createCode(db: Db, orgId: string, kind: 'owner' | 'helper', by: string): Promise<{ code: string; expiresAt: Date }> {
  const code = randCode(10);
  const expiresAt = new Date(Date.now() + (kind === 'owner' ? 7 : 3) * 86400_000);
  await db.query(`INSERT INTO organizer_codes (code, organizer_id, kind, created_by, expires_at) VALUES ($1, $2, $3, $4, $5)`, [code, orgId, kind, by, expiresAt]);
  return { code, expiresAt };
}

export const DEMO_ORG_NAME = 'SAREC 审核测试';
async function codeRow(db: Db, raw: string, lock = false) {
  const code = normalizeOrgCode(raw);
  if (!/^[A-Z0-9]{10}$/.test(code)) throw new CrmError('bad_request', '开通码不对，请找商会重新生成');
  // 审核码（kind = 'review'，迁移 0051）可多人反复用；0051 新加的列用 to_jsonb 取，迁移没跑时也不报错
  const { rows } = await db.query<{ code: string; organizer_id: string; kind: 'owner' | 'helper' | 'review'; expires_at: Date; used_at: Date | null; org_name: string; org_status: string;
    revoked_at: string | null }>(
    `SELECT k.code, k.organizer_id, k.kind, k.expires_at, k.used_at, o.name AS org_name, o.status AS org_status, to_jsonb(k)->>'revoked_at' AS revoked_at
       FROM organizer_codes k JOIN organizers o ON o.id = k.organizer_id WHERE k.code = $1 ${lock ? 'FOR UPDATE OF k' : ''}`,
    [code]
  );
  const r = rows[0];
  if (r && r.revoked_at) throw new CrmError('bad_request', '这个码已作废，请找商会重新生成');
  if (!r || (r.used_at && r.kind !== 'review')) throw new CrmError('bad_request', '这个码已经用过或不存在，请找商会（或负责人）重新生成');
  if (r.expires_at.getTime() < Date.now()) throw new CrmError('bad_request', '这个码已过期，请找商会（或负责人）重新生成');
  if (r.org_status === 'suspended') throw new CrmError('forbidden', '这个主办方已停用，请联系商会');
  return r;
}

/** 扫码后先看：是哪个主办方、开通负责人还是加帮手；同时给数据承诺 */
export async function codeInfo(raw: string) {
  await requireToolOn();
  const r = await codeRow(getPool(), raw);
  // 审核码开出来的是负责人（小程序按 owner 显示）
  return { organizer: r.org_name, kind: r.kind === 'review' ? 'owner' : r.kind, demo: r.kind === 'review', promise: promise() };
}

/** 看完数据承诺点「我看完了，开通」 */
export async function claimCode(contactId: string, raw: string, agree: boolean) {
  await requireToolOn();
  if (!agree) throw new CrmError('bad_request', '请先看完《主办方数据承诺》，点「我看完了，开通」');
  return withTransaction(async (db) => {
    const r = await codeRow(db, raw, true);
    if (r.kind === 'review') return claimReview(db, contactId, r);
    if (r.kind === 'helper') {
      const { rows: n } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM organizer_members WHERE organizer_id = $1 AND role = 'helper' AND removed_at IS NULL AND contact_id <> $2`, [r.organizer_id, contactId]);
      if (n[0].n >= MAX_HELPERS) throw new CrmError('bad_request', `这个主办方已经有 ${MAX_HELPERS} 个帮手了，请负责人先去掉一个`);
    }
    const { rows: ex } = await db.query<{ role: string; removed_at: Date | null }>(`SELECT role, removed_at FROM organizer_members WHERE organizer_id = $1 AND contact_id = $2`, [r.organizer_id, contactId]);
    if (ex[0] && !ex[0].removed_at && ex[0].role === 'owner' && r.kind === 'helper') throw new CrmError('bad_request', '您已经是这个主办方的负责人了');
    await db.query(
      `INSERT INTO organizer_members (organizer_id, contact_id, role, added_by) VALUES ($1, $2, $3, $4)
       ON CONFLICT (organizer_id, contact_id) DO UPDATE SET role = EXCLUDED.role, removed_at = NULL, added_at = now(), added_by = EXCLUDED.added_by`,
      [r.organizer_id, contactId, r.kind, `code:${r.code}`]
    );
    if (r.kind === 'owner') {
      await db.query(
        `UPDATE organizers SET status = 'active', agreed_at = now(), agreed_version = $2, agreed_by = $3, updated_at = now() WHERE id = $1`,
        [r.organizer_id, PROMISE_VERSION, contactId]
      );
    }
    await db.query(`UPDATE organizer_codes SET used_at = now(), used_by = $2 WHERE code = $1`, [r.code, contactId]);
    // 负责人 / 帮手本身是商会认可的合作方：不算"主办方的客人"
    await db.query(`UPDATE contacts SET org_guest_since = NULL WHERE id = $1`, [contactId]);
    return { organizer: r.org_name, role: r.kind, message: r.kind === 'owner' ? `已开通「${r.org_name}」，可以在「我的 → 我办的活动」发活动了` : `已加为「${r.org_name}」的帮手` };
  });
}

/**
 * 审核用开通码（指令 57 第 4 条，迁移 0051）：可多人反复用，每个用它的微信号都成为同一个演示主办方「SAREC 审核测试」
 * （is_demo，先审后发 0 场，机器检测照旧）的负责人。同一个人再输一次只是回到那里。演示主办方不进试用看板。
 * 审核员本人不因此"变成商会的人"：新来的号照普通客人标"主办方的客人"，不进客户列表。
 */
async function claimReview(db: Db, contactId: string, r: { code: string; organizer_id: string; org_name: string }) {
  const { rows: ex } = await db.query(`SELECT 1 FROM organizer_members WHERE organizer_id = $1 AND contact_id = $2 AND removed_at IS NULL`, [r.organizer_id, contactId]);
  if (!ex[0]) {
    await markGuestIfNew(db, contactId);
    await db.query(
      `INSERT INTO organizer_members (organizer_id, contact_id, role, added_by) VALUES ($1, $2, 'owner', $3)
       ON CONFLICT (organizer_id, contact_id) DO UPDATE SET role = 'owner', removed_at = NULL, added_at = now(), added_by = EXCLUDED.added_by`,
      [r.organizer_id, contactId, `code:${r.code}`]);
    await db.query(`UPDATE organizer_codes SET uses = uses + 1, used_by = $2 WHERE code = $1`, [r.code, contactId]);
    await db.query(`UPDATE organizers SET agreed_at = coalesce(agreed_at, now()), agreed_version = coalesce(agreed_version, $2), agreed_by = coalesce(agreed_by, $3), updated_at = now() WHERE id = $1`,
      [r.organizer_id, PROMISE_VERSION, contactId]);
  }
  return { organizer: r.org_name, role: 'owner', demo: true, message: `已开通「${r.org_name}」（审核演示用），可以在「我的 → 我办的活动」发活动了` };
}

export async function helperCode(contactId: string, orgId?: string | null) {
  await requireToolOn();
  const m = await pickOrg(contactId, orgId);
  if (m.role !== 'owner') throw new CrmError('forbidden', '只有负责人能加帮手');
  if (m.status !== 'active') throw new CrmError('forbidden', '主办方已停用，不能加帮手');
  const { rows: n } = await getPool().query<{ n: number }>(`SELECT count(*)::int AS n FROM organizer_members WHERE organizer_id = $1 AND role = 'helper' AND removed_at IS NULL`, [m.id]);
  if (n[0].n >= MAX_HELPERS) throw new CrmError('bad_request', `最多 ${MAX_HELPERS} 个帮手，请先去掉一个`);
  return createCode(getPool(), m.id, 'helper', `contact:${contactId}`);
}

export async function removeHelper(contactId: string, helperId: string, orgId?: string | null) {
  const m = await pickOrg(contactId, orgId);
  if (m.role !== 'owner') throw new CrmError('forbidden', '只有负责人能去掉帮手');
  if (!UUID.test(helperId)) throw new CrmError('not_found', '找不到这个帮手');
  const { rowCount } = await getPool().query(`UPDATE organizer_members SET removed_at = now() WHERE organizer_id = $1 AND contact_id = $2 AND role = 'helper' AND removed_at IS NULL`, [m.id, helperId]);
  if (!rowCount) throw new CrmError('not_found', '找不到这个帮手');
  return { message: '已去掉这个帮手' };
}

// ── 我办的活动 ───────────────────────────────────────────────────────
export async function orgHome(contactId: string, orgId?: string | null) {
  await requireToolOn();
  const orgs = await myOrgs(contactId);
  const m = await pickOrg(contactId, orgId);
  const pool = getPool();
  const { rows: evs } = await pool.query<OrgEvent & { people: number; arrived: number; regs: number }>(
    `SELECT e.*, coalesce(sum(r.party_size) FILTER (WHERE r.status = 'registered'), 0)::int AS people,
            coalesce(sum(r.party_size) FILTER (WHERE r.checked_in_at IS NOT NULL), 0)::int AS arrived,
            count(r.id) FILTER (WHERE r.status <> 'cancelled')::int AS regs
       FROM org_events e LEFT JOIN org_regs r ON r.event_id = e.id
      WHERE e.organizer_id = $1 GROUP BY e.id ORDER BY e.starts_at DESC LIMIT 100`,
    [m.id]
  );
  // 回头客 = 来过（签到过）这个主办方 2 场及以上的人，只按这个主办方自己的活动算
  const { rows: st } = await pool.query<{ returning: number; guests: number }>(
    `SELECT count(*) FILTER (WHERE n >= 2)::int AS returning, count(*)::int AS guests FROM (
       SELECT r.contact_id, count(*) AS n FROM org_regs r JOIN org_events e ON e.id = r.event_id
        WHERE e.organizer_id = $1 AND r.checked_in_at IS NOT NULL GROUP BY r.contact_id) x`,
    [m.id]
  );
  const helpers = m.role === 'owner'
    ? (await pool.query<{ id: string; name: string }>(
        `SELECT c.id, coalesce(NULLIF(c.name, '微信用户'), '（还没填名字）') AS name FROM organizer_members om JOIN contacts c ON c.id = om.contact_id
          WHERE om.organizer_id = $1 AND om.role = 'helper' AND om.removed_at IS NULL ORDER BY om.added_at`, [m.id])).rows
    : [];
  const past = evs.filter((e) => ended(e) || ['cancelled', 'taken_down', 'rejected'].includes(e.status));
  const people = past.filter((e) => e.status === 'published').reduce((a, e) => a + e.people, 0);
  const arrived = past.filter((e) => e.status === 'published').reduce((a, e) => a + e.arrived, 0);
  const row = (e: (typeof evs)[number]) => ({
    id: e.id, code: e.code, title: e.title, mode: e.mode, when: whenText(e), status: e.status, statusLabel: statusLabel(e),
    people: e.people, arrived: e.arrived, rate: e.people ? Math.round((e.arrived / e.people) * 100) : null, ended: ended(e)
  });
  const suspended = m.status === 'suspended';
  const exportUntil = suspended && m.suspended_at ? new Date(new Date(m.suspended_at).getTime() + SUSPEND_EXPORT_DAYS * 86400_000) : null;
  return {
    organizer: { id: m.id, name: m.name, logoUrl: m.logo_url, role: m.role, suspended, exportUntil, reviewLeft: m.review_left },
    orgs: orgs.map((o) => ({ id: o.id, name: o.name, role: o.role })),
    stats: { events: past.filter((e) => e.status === 'published').length, people, rate: people ? Math.round((arrived / people) * 100) : null, returning: st[0]?.returning ?? 0 },
    upcoming: evs.filter((e) => !past.includes(e)).reverse().map(row),
    past: past.map(row),
    helpers,
    maxHelpers: MAX_HELPERS,
    chainOn: await chainOn()
  };
}

function statusLabel(e: Pick<OrgEvent, 'status' | 'starts_at' | 'ends_at'>): string {
  if (e.status === 'review') return '等商会放行';
  if (e.status === 'rejected') return '没通过';
  if (e.status === 'taken_down') return '已下架';
  if (e.status === 'cancelled') return '已取消';
  if (ended(e)) return '已结束';
  if (new Date(e.starts_at).getTime() <= Date.now()) return '进行中';
  return '报名中';
}

export async function templates(contactId: string) {
  await pickOrg(contactId);
  const list = [...TEMPLATES, ...((await chainOn()) ? [CHAIN_TEMPLATE] : [])];
  return { templates: list, fields: FORM_FIELDS };
}

// ── 发活动 / 改活动 ───────────────────────────────────────────────────
type Input = Record<string, unknown>;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
function parseDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function cleanInput(b: Input, isNew: boolean, prev?: OrgEvent) {
  const title = str(b.title, 30);
  if (title.length < 2) throw new CrmError('bad_request', '活动名称至少写 2 个字');
  const startsAt = parseDate(b.startsAt);
  if (!startsAt) throw new CrmError('bad_request', '请选开始时间');
  if (isNew && startsAt.getTime() < Date.now() - 3600_000) throw new CrmError('bad_request', '开始时间已经过了，请改一下日期');
  const endsAt = parseDate(b.endsAt);
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) throw new CrmError('bad_request', '结束时间要晚于开始时间');
  const locationName = str(b.locationName, 40);
  if (!locationName) throw new CrmError('bad_request', '请写地点');
  const capRaw = b.capacity == null || b.capacity === '' ? null : Number(b.capacity);
  if (capRaw != null && (!Number.isInteger(capRaw) || capRaw < 1 || capRaw > 2000)) throw new CrmError('bad_request', '人数上限写 1–2000，或选"不限"');
  const deadlineAt = parseDate(b.deadlineAt);
  if (deadlineAt && deadlineAt.getTime() > startsAt.getTime()) throw new CrmError('bad_request', '报名截止要早于开始时间');
  const mode = b.mode === 'chain' ? 'chain' : 'signup';
  if (mode === 'chain' && !(await chainOn()) && prev?.mode !== 'chain') throw new CrmError('bad_request', '接龙暂时还没开放');
  const fields = Array.isArray(b.formFields) ? (b.formFields as unknown[]).map(String).filter((f) => f in FORM_FIELDS) : [];
  const question = fields.includes('question') ? str(b.question, 20) : '';
  if (fields.includes('question') && !question) throw new CrmError('bad_request', '勾了"自定义问题"，请写上问题（20 字以内）');
  const hasFee = b.hasFee === true;
  const out = {
    title, startsAt, endsAt, locationName, address: str(b.address, 120) || null, capacity: capRaw, deadlineAt,
    description: str(b.description, 500) || null, hasFee, feeWay: hasFee ? (b.feeWay === 'onsite' ? 'onsite' : 'contact') : null,
    formFields: Array.from(new Set(fields)), question: question || null, mode,
    listPublic: b.listPublic === 'nickname' ? 'nickname' : 'hidden', template: str(b.template, 20) || null,
    timezone: str(b.timezone, 40) || 'America/Los_Angeles'
  };
  const bad = bannedWord([out.title, out.description, out.locationName, out.address, out.question].filter(Boolean).join(' '));
  if (bad) throw new CrmError('bad_request', `内容里有不能用的字「${bad}」。小程序里不收钱、不放收款码，也不能出现赌博相关字样，请改一下`);
  return out;
}

async function secCheck(contactId: string, text: string): Promise<string> {
  const { rows } = await getPool().query<{ o: string | null }>(`SELECT wechat_openid AS o FROM contacts WHERE id = $1`, [contactId]);
  const o = rows[0]?.o ?? null;
  const r = await msgSecCheck(text, o && !o.startsWith('dev-openid-') ? o : null, 1);
  if (r === 'risky') throw new CrmError('bad_request', '内容没通过微信的内容检测，请改一下文字再发');
  return r;
}
/** 机器检测算不算过：pass 算；测试站没配微信密钥时 skipped 也算（正式站 skipped / error 一律交给人工放行） */
const machineOk = (r: string) => r === 'pass' || (r === 'skipped' && process.env.VERCEL_ENV !== 'production');

export async function createEvent(contactId: string, b: Input, orgId?: string | null) {
  await requireToolOn();
  const m = await pickOrg(contactId, orgId);
  if (m.status !== 'active') throw new CrmError('forbidden', '主办方已停用，不能发新活动。有疑问请联系商会');
  const x = await cleanInput(b, true);
  const sec = await secCheck(contactId, [x.title, x.description, x.locationName, x.address, x.question].filter(Boolean).join('\n'));
  // 先审后发：新主办方前 N 场（待东哥定，暂定 3）先等工作人员放行；之后机器检测通过就直接公开
  const status = m.review_left > 0 || !machineOk(sec) ? 'review' : 'published';
  const copiedFrom = typeof b.copyFrom === 'string' && UUID.test(b.copyFrom) ? b.copyFrom : null;
  if (copiedFrom) await eventAccess(getPool(), contactId, copiedFrom, 'helper'); // 只能从自己办过的活动"再办一场"
  const secs = Number(b.composeSecs);
  // 1.7.0：可选海报模板（不传 / 空 = 不用模板，和以前一样）
  const posterTpl = await checkTemplateForEvent(b.posterTpl);
  // 1.7.0「传自己的海报」：可选 posterOwn（上传返回的 ownId / url；开关关着时带了就 403 暂未开放）。和模板都带时用自己的
  const posterOwn = await checkOwnForEvent(b.posterOwn, contactId, m.id);
  const tplForInsert = posterOwn ? null : posterTpl;
  const { rows } = await getPool().query<{ id: string; code: string }>(
    `INSERT INTO org_events (organizer_id, code, mode, template, title, starts_at, ends_at, timezone, location_name, address, capacity, deadline_at, description,
        has_fee, fee_way, form_fields, question, list_public, status, sec_status, checkin_secret, copied_from, compose_secs, created_by, poster_tpl, poster_own, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26, CASE WHEN $19 = 'published' THEN now() END)
     RETURNING id, code`,
    [m.id, randCode(10), x.mode, x.template, x.title, x.startsAt, x.endsAt, x.timezone, x.locationName, x.address, x.capacity, x.deadlineAt, x.description,
      x.hasFee, x.feeWay, x.formFields, x.question, x.listPublic, status, sec, randomBytes(16).toString('hex'), copiedFrom,
      Number.isFinite(secs) && secs > 0 ? Math.min(86400, Math.round(secs)) : null, contactId, tplForInsert, posterOwn]
  );
  if (tplForInsert) await getPool().query(`UPDATE poster_templates SET uses = uses + 1 WHERE id = $1`, [tplForInsert]);
  return {
    id: rows[0].id, code: rows[0].code, status,
    message: status === 'published' ? '已发布。下一步：发到群、存海报' : '已提交。新主办方的前几场要商会看一眼再公开，通常当天放行；放行前报名页只有您和帮手看得到'
  };
}

export async function updateEvent(contactId: string, eventId: string, b: Input) {
  await requireToolOn();
  return withTransaction(async (db) => {
    const { ev, m } = await eventAccess(db, contactId, eventId, 'helper');
    if (m.status !== 'active') throw new CrmError('forbidden', '主办方已停用，不能改活动');
    if (['taken_down', 'rejected', 'cancelled'].includes(ev.status)) throw new CrmError('bad_request', '这场活动已下架或取消，不能再改。可以「再办一场」');
    const x = await cleanInput(b, false, ev);
    // 1.7.0：带了 posterTpl 才改模板（空 = 不用模板）；没带这个字段（老版本小程序）= 不动
    const posterTpl: string | null = 'posterTpl' in b ? (b.posterTpl === ev.poster_tpl ? ev.poster_tpl : await checkTemplateForEvent(b.posterTpl, db)) : ev.poster_tpl;
    let posterOwn = 'posterOwn' in b ? (b.posterOwn === ev.poster_own ? ev.poster_own : await checkOwnForEvent(b.posterOwn, contactId, ev.organizer_id, db)) : ev.poster_own;
    // 模板和自己的海报二选一：这次传了哪一个（非空），就清掉另一个
    let tplNext = posterTpl;
    if ('posterTpl' in b && posterTpl && !(('posterOwn' in b) && posterOwn)) posterOwn = null;
    if ('posterOwn' in b && posterOwn) tplNext = null;
    const textChanged = [x.title !== ev.title, (x.description ?? null) !== (ev.description ?? null), x.locationName !== ev.location_name, (x.address ?? null) !== (ev.address ?? null), (x.question ?? null) !== (ev.question ?? null)].some(Boolean);
    let status = ev.status;
    let sec = ev.sec_status;
    if (textChanged) {
      sec = await secCheck(contactId, [x.title, x.description, x.locationName, x.address, x.question].filter(Boolean).join('\n'));
      if (!machineOk(sec)) status = 'review';
    }
    // 第 8 条：改了时间 / 地点 → 活动页自动用新的；提示主办方旧海报要重新生成
    const infoChanged = new Date(ev.starts_at).getTime() !== x.startsAt.getTime() || (ev.ends_at ? new Date(ev.ends_at).getTime() : null) !== (x.endsAt ? x.endsAt.getTime() : null)
      || x.locationName !== ev.location_name || (x.address ?? null) !== (ev.address ?? null) || x.title !== ev.title;
    await db.query(
      `UPDATE org_events SET title=$2, starts_at=$3, ends_at=$4, location_name=$5, address=$6, capacity=$7, deadline_at=$8, description=$9,
              has_fee=$10, fee_way=$11, form_fields=$12, question=$13, list_public=$14, status=$15, sec_status=$16,
              info_version = info_version + $17, poster_tpl = $18, poster_own = $19, updated_at = now() WHERE id = $1`,
      [ev.id, x.title, x.startsAt, x.endsAt, x.locationName, x.address, x.capacity, x.deadlineAt, x.description, x.hasFee, x.feeWay, x.formFields, x.question,
        x.listPublic, status, sec, infoChanged ? 1 : 0, tplNext, posterOwn]
    );
    // 名额改大了：候补的人按顺序补上
    await fillWaitlist(db, ev.id);
    const posterStale = infoChanged && ev.poster_version > 0;
    return {
      ok: true, status, posterStale,
      message: (status === 'review' && ev.status !== 'review' ? '已保存。改过的文字要等商会看一眼再公开。' : '已保存，报名页已经是新的了。')
        + (posterStale ? '时间或地点改了，旧海报上还是原来的，请重新生成海报再发。' : '')
    };
  });
}

export async function cancelEvent(contactId: string, eventId: string) {
  const { ev } = await eventAccess(getPool(), contactId, eventId, 'owner');
  if (ev.status === 'cancelled') return { message: '这场活动已经取消了' };
  await getPool().query(`UPDATE org_events SET status = 'cancelled', updated_at = now() WHERE id = $1`, [ev.id]);
  return { message: '已取消这场活动。报名页会显示"活动已取消"，请您在群里也说一声。' };
}

/** 再办一场 / 改活动：取这场的全部字段（日期由小程序清空让主办方重选） */
export async function eventForEdit(contactId: string, eventId: string, base = '') {
  const { ev, m } = await eventAccess(getPool(), contactId, eventId, 'helper');
  const own = ev.poster_own ? await getOwnPoster(ev.poster_own) : null;
  return {
    event: {
      id: ev.id, mode: ev.mode, template: ev.template, title: ev.title, startsAt: ev.starts_at, endsAt: ev.ends_at, timezone: ev.timezone,
      locationName: ev.location_name, address: ev.address, capacity: ev.capacity, deadlineAt: ev.deadline_at, description: ev.description,
      hasFee: ev.has_fee, feeWay: ev.fee_way, formFields: ev.form_fields, question: ev.question, listPublic: ev.list_public, status: ev.status,
      // 1.7.0：选的模板 / 自己传的海报（posterOwnUrl 走本站 /files/，不用登录头就能显示）
      posterTpl: ev.poster_tpl ?? null, posterOwn: own?.id ?? null, posterOwnUrl: own ? ownPublicUrl(base, own.url) : null, posterOwnAi: own ? own.ai_generated : null
    },
    role: m.role
  };
}

/** 最近用过的地点（一点就选） */
export async function recentPlaces(contactId: string) {
  const m = await pickOrg(contactId);
  const { rows } = await getPool().query<{ location_name: string; address: string | null }>(
    `SELECT DISTINCT ON (location_name) location_name, address FROM org_events WHERE organizer_id = $1 AND location_name IS NOT NULL ORDER BY location_name, created_at DESC LIMIT 6`,
    [m.id]
  );
  return rows.map((r) => ({ name: r.location_name, address: r.address }));
}

// ── 名额 ─────────────────────────────────────────────────────────────
async function seatsTaken(db: Db, eventId: string, exceptReg?: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    `SELECT coalesce(sum(party_size), 0)::int AS n FROM org_regs WHERE event_id = $1 AND status = 'registered' AND ($2::uuid IS NULL OR id <> $2)`,
    [eventId, exceptReg ?? null]
  );
  return rows[0].n;
}
/** 空出来的名额按候补顺序补（一共几位放不下的先跳过，后面能放下的补上） */
async function fillWaitlist(db: Db, eventId: string) {
  const { rows: e } = await db.query<{ capacity: number | null }>(`SELECT capacity FROM org_events WHERE id = $1`, [eventId]);
  const cap = e[0]?.capacity;
  const { rows: wl } = await db.query<{ id: string; party_size: number }>(`SELECT id, party_size FROM org_regs WHERE event_id = $1 AND status = 'waitlisted' ORDER BY created_at`, [eventId]);
  let taken = await seatsTaken(db, eventId);
  for (const w of wl) {
    if (cap != null && taken + w.party_size > cap) continue;
    await db.query(`UPDATE org_regs SET status = 'registered', updated_at = now() WHERE id = $1`, [w.id]);
    taken += w.party_size;
  }
}

// ── 报名页（任何人） ──────────────────────────────────────────────────
type Pub = OrgEvent & { org_name: string; logo_url: string | null; public_contact: string | null; org_status: string };
async function eventByCode(db: Db, code: string, lock = false): Promise<Pub> {
  const c = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(c)) throw new CrmError('not_found', '链接有误，找不到这场活动');
  const { rows } = await db.query<Pub>(
    `SELECT e.*, o.name AS org_name, o.logo_url, o.public_contact, o.status AS org_status
       FROM org_events e JOIN organizers o ON o.id = e.organizer_id WHERE e.code = $1 ${lock ? 'FOR UPDATE OF e' : ''}`,
    [c]
  );
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  return rows[0];
}

/** 这场活动现在能不能给普通人看：不能的话说清为什么 */
async function visibility(ev: Pub, isMember: boolean): Promise<{ open: boolean; reason: string | null }> {
  if (!(await toolOn())) return { open: false, reason: '活动工具暂停使用，请稍后再来，或直接联系主办方' };
  if (ev.org_status !== 'active' || ev.status === 'taken_down' || ev.status === 'rejected') return { open: false, reason: '这场活动已下架' };
  if (ev.mode === 'chain' && !(await chainOn()) && !isMember) return { open: false, reason: '接龙暂时还没开放' };
  if (ev.status === 'review') return isMember ? { open: true, reason: null } : { open: false, reason: '这场活动正在等商会放行，放行后就能报名' };
  return { open: true, reason: null };
}

export async function publicEvent(code: string, contactId: string | null) {
  const pool = getPool();
  const ev = await eventByCode(pool, code);
  const isMember = !!(contactId && (await memberOf(pool, contactId, ev.organizer_id)));
  const vis = await visibility(ev, isMember);
  if (!vis.open) return { closed: true, reason: vis.reason, organizer: { name: ev.org_name } };
  const taken = await seatsTaken(pool, ev.id);
  const left = ev.capacity == null ? null : Math.max(0, ev.capacity - taken);
  const isEnded = ended(ev);
  const deadlinePassed = !!ev.deadline_at && new Date(ev.deadline_at).getTime() < Date.now();
  let mine = null;
  let prefill: { name: string; phone: string; phoneMasked: string } = { name: '', phone: '', phoneMasked: '' };
  if (contactId) {
    const { rows } = await pool.query(`SELECT id, name, phone, party_size, answers, nickname, note, status, checked_in_at FROM org_regs WHERE event_id = $1 AND contact_id = $2`, [ev.id, contactId]);
    const r = rows[0] as { id: string; name: string; phone: string | null; party_size: number; answers: Record<string, string>; nickname: string | null; note: string | null; status: string; checked_in_at: Date | null } | undefined;
    if (r && r.status !== 'cancelled') mine = { status: r.status, name: r.name, phoneMasked: maskPhone(r.phone), partySize: r.party_size, answers: r.answers, nickname: r.nickname, note: r.note, checkedIn: !!r.checked_in_at };
    // 第 4 条：老用户必要资料自动带出（先用他在这个主办方上次填的，没有用他自己的档案）
    const { rows: last } = await pool.query<{ name: string; phone: string | null }>(
      `SELECT r.name, r.phone FROM org_regs r JOIN org_events e ON e.id = r.event_id WHERE r.contact_id = $1 AND e.organizer_id = $2 ORDER BY r.created_at DESC LIMIT 1`,
      [contactId, ev.organizer_id]
    );
    const { rows: c } = await pool.query<{ name: string | null; phone: string | null }>(
      `SELECT NULLIF(NULLIF(trim(name), ''), '微信用户') AS name, coalesce(phone_e164, (SELECT value FROM contact_methods m WHERE m.contact_id = contacts.id AND m.kind = 'phone' AND m.is_current LIMIT 1)) AS phone FROM contacts WHERE id = $1`,
      [contactId]
    );
    const name = last[0]?.name || c[0]?.name || '';
    const phone = last[0]?.phone || c[0]?.phone || '';
    prefill = { name, phone, phoneMasked: maskPhone(phone) };
  }
  // 接龙名单：主办方选了"公开称呼"才给，只有称呼和几位，没有手机号
  let chain: { nickname: string; partySize: number; mine: boolean }[] | null = null;
  if (ev.mode === 'chain' && ev.list_public === 'nickname') {
    const { rows } = await pool.query<{ nickname: string | null; party_size: number; contact_id: string }>(
      `SELECT nickname, party_size, contact_id FROM org_regs WHERE event_id = $1 AND status = 'registered' ORDER BY created_at`, [ev.id]);
    chain = rows.map((r) => ({ nickname: r.nickname || '（没写称呼）', partySize: r.party_size, mine: r.contact_id === contactId }));
  }
  const { rows: cnt } = await pool.query<{ people: number }>(`SELECT coalesce(sum(party_size), 0)::int AS people FROM org_regs WHERE event_id = $1 AND status = 'registered'`, [ev.id]);
  return {
    closed: false,
    event: {
      code: ev.code, mode: ev.mode, title: ev.title, when: whenText(ev), startsAt: ev.starts_at, endsAt: ev.ends_at, timezone: ev.timezone,
      locationName: ev.location_name, address: ev.address, description: ev.description, fee: feeLabel(ev), hasFee: ev.has_fee,
      seat: left == null ? null : left > 0 ? `还剩 ${left} 个名额` : '名额已满，可以排候补',
      full: left === 0, formFields: ev.form_fields, fieldLabels: FORM_FIELDS, question: ev.question, listPublic: ev.list_public,
      status: ev.status, cancelled: ev.status === 'cancelled', ended: isEnded, deadlinePassed, reviewing: ev.status === 'review',
      people: ev.mode === 'chain' ? cnt[0].people : null
    },
    organizer: { name: ev.org_name, logoUrl: ev.logo_url, contact: ev.public_contact },
    disclosure: disclosure(ev.org_name),
    mine, prefill, chain, isOrganizer: isMember,
    eventId: isMember ? ev.id : null
  };
}

function cleanReg(ev: OrgEvent, b: Input) {
  const name = str(b.name, 20);
  if (!name) throw new CrmError('bad_request', '请写您的称呼');
  const rawPhone = str(b.phone, 30);
  const phone = rawPhone ? normalizePhone(rawPhone) ?? normalizePhone(rawPhone, '+86') : null;
  if (rawPhone && !phone) throw new CrmError('bad_request', '手机号格式不对，美国号写 10 位，中国号写 11 位');
  if (ev.mode === 'signup' && !phone) throw new CrmError('bad_request', '请写手机号，方便主办方联系您');
  const party = ev.form_fields.includes('party') || ev.mode === 'chain' ? Number(b.partySize ?? 1) : 1;
  if (!Number.isInteger(party) || party < 1 || party > 10) throw new CrmError('bad_request', '一共几位写 1–10');
  const a = (b.answers && typeof b.answers === 'object' ? b.answers : {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const f of ev.form_fields) if (f !== 'party') { const v = str(a[f], 60); if (v) answers[f] = v; }
  const nickname = ev.mode === 'chain' ? str(b.nickname, 12) || name.slice(0, 12) : null;
  const note = ev.mode === 'chain' ? str(b.note, 20) || null : null;
  const bad = bannedWord([name, nickname, note, ...Object.values(answers)].filter(Boolean).join(' '));
  if (bad) throw new CrmError('bad_request', `内容里有不能用的字「${bad}」，请改一下`);
  return { name, phone, party, answers, nickname, note };
}

export async function register(code: string, contactId: string, b: Input, source: 'online' | 'onsite' = 'online') {
  return withTransaction(async (db) => {
    const ev = await eventByCode(db, code, true);
    const isMember = !!(await memberOf(db, contactId, ev.organizer_id));
    const vis = await visibility(ev, isMember);
    if (!vis.open) throw new CrmError('event_closed', vis.reason ?? '这场活动现在不能报名');
    if (ev.status === 'review') throw new CrmError('event_closed', '这场活动还在等商会放行，放行后才能报名');
    if (ev.status === 'cancelled') throw new CrmError('event_closed', '这场活动已取消');
    if (ended(ev)) throw new CrmError('event_closed', '这场活动已经结束了');
    if (source === 'online' && ev.deadline_at && new Date(ev.deadline_at).getTime() < Date.now()) throw new CrmError('event_closed', '报名已截止，可以直接联系主办方');
    const x = cleanReg(ev, b);
    const { rows: ex } = await db.query<{ id: string; status: string; checked_in_at: Date | null }>(`SELECT id, status, checked_in_at FROM org_regs WHERE event_id = $1 AND contact_id = $2 FOR UPDATE`, [ev.id, contactId]);
    const cur = ex[0] && ex[0].status !== 'cancelled' ? ex[0] : null;
    const taken = await seatsTaken(db, ev.id, cur?.id);
    const fits = ev.capacity == null || source === 'onsite' || taken + x.party <= ev.capacity;
    let status: 'registered' | 'waitlisted';
    if (cur?.status === 'registered' && !fits) {
      const left = Math.max(0, (ev.capacity ?? 0) - taken);
      throw new CrmError('bad_request', `名额不够了，最多还能报 ${left} 位`);
    }
    status = cur?.status === 'registered' || fits ? 'registered' : 'waitlisted';
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO org_regs (event_id, contact_id, name, phone, party_size, answers, nickname, note, status, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (event_id, contact_id) DO UPDATE SET name=$3, phone=$4, party_size=$5, answers=$6, nickname=$7, note=$8, status=$9,
              cancelled_at = NULL, updated_at = now(),
              created_at = CASE WHEN org_regs.status = 'cancelled' THEN now() ELSE org_regs.created_at END
       RETURNING id`,
      [ev.id, contactId, x.name, x.phone, x.party, JSON.stringify(x.answers), x.nickname, x.note, status, source]
    );
    await markGuestIfNew(db, contactId);
    const changed = !!cur;
    return {
      regId: rows[0].id, status,
      message: status === 'waitlisted' ? '名额满了，已帮您排上候补；有人取消会按顺序补上。' : changed ? '已改好' : ev.mode === 'chain' ? '已接上' : '报名成功'
    };
  });
}

export async function cancelReg(code: string, contactId: string) {
  return withTransaction(async (db) => {
    const ev = await eventByCode(db, code, true);
    const { rows } = await db.query<{ id: string; checked_in_at: Date | null; status: string }>(`SELECT id, checked_in_at, status FROM org_regs WHERE event_id = $1 AND contact_id = $2 FOR UPDATE`, [ev.id, contactId]);
    const r = rows[0];
    if (!r || r.status === 'cancelled') return { message: '您没有报这场活动' };
    if (r.checked_in_at) throw new CrmError('already_checked_in', '您已经签到了，不能再取消');
    await db.query(`UPDATE org_regs SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = $1`, [r.id]);
    await fillWaitlist(db, ev.id);
    return { message: ev.mode === 'chain' ? '已撤回' : '已取消报名' };
  });
}

/**
 * 门口签到码（扫码 = 报名 + 签到一体，免手填）：k 是签到密钥（码里带前 8 位）。
 * 已报名的直接签到；没报名的带着资料来（老用户自动带出）就现场报名并签到（不受名额限制，人已经到门口了）。
 */
export async function selfCheckin(code: string, contactId: string, k: string, b: Input | null) {
  const pool = getPool();
  const ev0 = await eventByCode(pool, code);
  if (!checkinKeyOk(k, ev0.checkin_secret)) throw new CrmError('bad_request', '这不是这场活动的门口签到码，请扫门口贴的码');
  const w = checkinWindow(ev0);
  if (w.state !== 'open') throw new CrmError('bad_request', w.message);
  const { rows } = await pool.query<{ id: string; status: string; checked_in_at: Date | null }>(`SELECT id, status, checked_in_at FROM org_regs WHERE event_id = $1 AND contact_id = $2`, [ev0.id, contactId]);
  let reg = rows[0] && rows[0].status !== 'cancelled' ? rows[0] : null;
  if (reg?.checked_in_at) return { kind: 'already', message: '您已签到，里面请！' };
  if (!reg) {
    if (!b) return { kind: 'need_info', message: '先写一下称呼和手机号，马上签到' };
    await register(code, contactId, b, 'onsite');
    const { rows: again } = await pool.query<{ id: string; status: string; checked_in_at: Date | null }>(`SELECT id, status, checked_in_at FROM org_regs WHERE event_id = $1 AND contact_id = $2`, [ev0.id, contactId]);
    reg = again[0];
  }
  await pool.query(
    `UPDATE org_regs SET status = 'registered', checked_in_at = coalesce(checked_in_at, now()), checkin_method = coalesce(checkin_method, 'self_scan'), updated_at = now() WHERE id = $1`,
    [reg.id]
  );
  return { kind: 'checked_in', message: '签到成功，欢迎！' };
}

// ── 名单（负责人 / 帮手） ─────────────────────────────────────────────
export async function roster(contactId: string, eventId: string) {
  const pool = getPool();
  const { ev, m } = await eventAccess(pool, contactId, eventId, 'helper');
  const owner = m.role === 'owner';
  const { rows } = await pool.query<{ id: string; contact_id: string; name: string; phone: string | null; party_size: number; answers: Record<string, string>; nickname: string | null; note: string | null; status: string; checked_in_at: Date | null; paid_marked_at: Date | null; created_at: Date; times: number }>(
    `SELECT r.id, r.contact_id, r.name, r.phone, r.party_size, r.answers, r.nickname, r.note, r.status, r.checked_in_at, r.paid_marked_at, r.created_at,
            (SELECT count(*)::int FROM org_regs o JOIN org_events oe ON oe.id = o.event_id
              WHERE o.contact_id = r.contact_id AND oe.organizer_id = $2 AND o.checked_in_at IS NOT NULL AND o.event_id <> r.event_id) AS times
       FROM org_regs r WHERE r.event_id = $1 ORDER BY r.status = 'cancelled', r.created_at`,
    [ev.id, ev.organizer_id]
  );
  const live = rows.filter((r) => r.status !== 'cancelled');
  const sum = (xs: typeof rows) => xs.reduce((a, r) => a + r.party_size, 0);
  const registered = live.filter((r) => r.status === 'registered');
  const arrived = live.filter((r) => r.checked_in_at);
  return {
    role: m.role,
    event: { id: ev.id, code: ev.code, title: ev.title, mode: ev.mode, when: whenText(ev), status: ev.status, statusLabel: statusLabel(ev), ended: ended(ev),
      hasFee: ev.has_fee, fee: feeLabel(ev), capacity: ev.capacity, reviewNote: ev.review_note, takenDownReason: ev.taken_down_reason,
      posterStale: ev.poster_version > 0 && ev.poster_version !== ev.info_version, locationName: ev.location_name, formFields: ev.form_fields, question: ev.question },
    stats: {
      registered: sum(registered), arrived: sum(arrived), waitlisted: sum(live.filter((r) => r.status === 'waitlisted')),
      paid: live.filter((r) => r.paid_marked_at).length, cancelled: rows.length - live.length,
      rate: sum(registered) ? Math.round((sum(arrived) / sum(registered)) * 100) : null,
      returning: live.filter((r) => r.times >= 1).length
    },
    people: rows.map((r) => ({
      id: r.id, name: r.name,
      // 帮手只看现场所需：手机只给尾号（负责人看完整的，可以点了打电话）
      phone: owner ? r.phone : null, phoneMasked: maskPhone(r.phone),
      partySize: r.party_size, nickname: r.nickname, note: owner ? r.note : null, answers: owner ? r.answers : {},
      status: r.status, checkedIn: !!r.checked_in_at, paid: !!r.paid_marked_at,
      visits: r.times ? `来过 ${r.times} 次` : '第一次'
    })),
    canExport: owner
  };
}

export async function markReg(contactId: string, eventId: string, regId: string, b: Input) {
  const pool = getPool();
  const { ev, m } = await eventAccess(pool, contactId, eventId, 'helper');
  if (m.status !== 'active') throw new CrmError('forbidden', '主办方已停用');
  if (!UUID.test(regId)) throw new CrmError('not_found', '找不到这个人');
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM org_regs WHERE id = $1 AND event_id = $2`, [regId, ev.id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这个人');
  if (typeof b.paid === 'boolean') {
    await pool.query(`UPDATE org_regs SET paid_marked_at = CASE WHEN $2 THEN now() END, paid_marked_by = CASE WHEN $2 THEN $3::uuid END, updated_at = now() WHERE id = $1`, [regId, b.paid, contactId]);
  }
  if (typeof b.checkin === 'boolean') {
    await pool.query(
      `UPDATE org_regs SET checked_in_at = CASE WHEN $2 THEN coalesce(checked_in_at, now()) END, checkin_method = CASE WHEN $2 THEN 'organizer' END,
              status = CASE WHEN $2 AND status = 'waitlisted' THEN 'registered' ELSE status END, updated_at = now() WHERE id = $1`,
      [regId, b.checkin]
    );
  }
  return { ok: true };
}

// ── 导出（只限负责人） ────────────────────────────────────────────────
async function exportRows(db: Db, ev: OrgEvent) {
  const { rows } = await db.query<{ name: string; phone: string | null; party_size: number; created_at: Date; status: string; checked_in_at: Date | null; paid_marked_at: Date | null; answers: Record<string, string>; nickname: string | null; note: string | null; times: number }>(
    `SELECT r.*, (SELECT count(*)::int FROM org_regs o JOIN org_events oe ON oe.id = o.event_id WHERE o.contact_id = r.contact_id AND oe.organizer_id = $2 AND o.checked_in_at IS NOT NULL) AS times
       FROM org_regs r WHERE r.event_id = $1 AND r.status <> 'cancelled' ORDER BY r.created_at`,
    [ev.id, ev.organizer_id]
  );
  const t = (d: Date | null) => (d ? fmt(d, ev.timezone, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '');
  const extra = ev.form_fields.filter((f) => f !== 'party');
  const head = ['姓名', '手机', '一共几位', '报名时间', '状态', '是否到场', '签到时间', '已交费（主办方手动标记）', ...extra.map((f) => (f === 'question' ? ev.question || '自定义问题' : FORM_FIELDS[f])), ...(ev.mode === 'chain' ? ['接龙称呼', '备注'] : []), '来过几次'];
  const body = rows.map((r) => [r.name, r.phone ?? '', r.party_size, t(r.created_at), r.status === 'waitlisted' ? '候补' : '已报名', r.checked_in_at ? '到了' : '', t(r.checked_in_at),
    r.paid_marked_at ? '已交费' : '', ...extra.map((f) => r.answers?.[f] ?? ''), ...(ev.mode === 'chain' ? [r.nickname ?? '', r.note ?? ''] : []), r.times]);
  return { head, body };
}

export async function startExport(contactId: string, eventId: string, kind: 'file' | 'copy', base: string) {
  const pool = getPool();
  const { ev, m } = await eventAccess(pool, contactId, eventId, 'owner');
  if (m.status === 'suspended' && m.suspended_at && Date.now() - new Date(m.suspended_at).getTime() > SUSPEND_EXPORT_DAYS * 86400_000) {
    throw new CrmError('forbidden', '主办方停用已超过 30 天，名单不能再导出了，请联系商会');
  }
  const { head, body } = await exportRows(pool, ev);
  if (kind === 'copy') {
    await pool.query(`INSERT INTO org_exports (organizer_id, event_id, contact_id, kind, row_count) VALUES ($1, $2, $3, 'copy', $4)`, [ev.organizer_id, ev.id, contactId, body.length]);
    const text = [`${ev.title}（${whenText(ev)}）`, ...body.map((r) => [r[0], r[1], `${r[2]}位`, r[5] ? '到了' : '', r[7]].filter(Boolean).join(' '))].join('\n');
    return { kind, text, rows: body.length };
  }
  const token = randomBytes(24).toString('base64url');
  await pool.query(
    `INSERT INTO org_exports (organizer_id, event_id, contact_id, kind, row_count, token_hash, expires_at) VALUES ($1, $2, $3, 'file', $4, $5, now() + make_interval(mins => $6))`,
    [ev.organizer_id, ev.id, contactId, body.length, sha(token), EXPORT_TTL_MIN]
  );
  return { kind, url: `${base.replace(/\/$/, '')}/api/v1/org/export/${token}`, rows: body.length, expiresMin: EXPORT_TTL_MIN, fileName: `${ev.title.replace(/[\\/:*?"<>|]/g, '')}-名单.xlsx` };
}

/** 下载：地址 10 分钟有效、只能下一次 */
export async function downloadExport(token: string): Promise<{ xlsx: Buffer; name: string }> {
  if (!/^[A-Za-z0-9_-]{20,60}$/.test(token)) throw new CrmError('not_found', '下载地址不对或已过期，请回小程序重新导出');
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string; event_id: string | null; expires_at: Date; downloaded_at: Date | null }>(
      `SELECT id, event_id, expires_at, downloaded_at FROM org_exports WHERE token_hash = $1 FOR UPDATE`, [sha(token)]);
    const x = rows[0];
    if (!x || x.downloaded_at || x.expires_at.getTime() < Date.now() || !x.event_id) throw new CrmError('not_found', '下载地址已过期或已经下载过，请回小程序重新导出');
    await db.query(`UPDATE org_exports SET downloaded_at = now() WHERE id = $1`, [x.id]);
    const { rows: e } = await db.query<OrgEvent>(`SELECT * FROM org_events WHERE id = $1`, [x.event_id]);
    const { head, body } = await exportRows(db, e[0]);
    const { makeXlsx } = await import('./xlsx');
    return { xlsx: makeXlsx('名单', [head, ...body]), name: `${e[0].title}-名单.xlsx` };
  });
}

// ── 海报 / 码 ─────────────────────────────────────────────────────────
export async function posterData(contactId: string, eventId: string, base: string) {
  const pool = getPool();
  const { ev } = await eventAccess(pool, contactId, eventId, 'helper');
  if (ev.status !== 'published' && ev.status !== 'review') throw new CrmError('event_closed', '这场活动已下架或取消，不能出海报');
  await pool.query(`UPDATE org_events SET poster_version = info_version WHERE id = $1`, [ev.id]);
  const { rows: o } = await pool.query<{ name: string; logo_url: string | null }>(`SELECT name, logo_url FROM organizers WHERE id = $1`, [ev.organizer_id]);
  const { wxConfigured } = await import('@/lib/crm/wechat');
  const b = base.replace(/\/$/, '');
  const tplVer = ev.poster_tpl && !ev.poster_own
    ? (await pool.query<{ version: number }>(`SELECT version FROM poster_templates WHERE id = $1`, [ev.poster_tpl])).rows[0]?.version ?? null
    : null;
  return {
    event: { code: ev.code, title: ev.title, when: whenText(ev), locationName: ev.location_name, address: ev.address, fee: feeLabel(ev), mode: ev.mode },
    organizer: { name: o[0].name, logoUrl: o[0].logo_url ? `${b}/_next/image?url=${encodeURIComponent(o[0].logo_url)}&w=256&q=80` : null },
    codeUrl: `${b}/api/v1/org/e/${ev.code}/qr`,
    isTestCode: !wxConfigured(),
    // 1.7.0：选了模板 → 服务器出成品图的地址（活动改过或模板换过图，v 跟着变）；没选 = null，小程序照旧画老海报
    posterTpl: ev.poster_tpl ?? null,
    posterUrl: ev.poster_own
      ? `${b}/api/v1/org/events/${ev.id}/poster.png?v=${new Date(ev.updated_at).getTime()}-o${ev.poster_own.slice(0, 8)}`
      : tplVer != null ? `${b}/api/v1/org/events/${ev.id}/poster.png?v=${new Date(ev.updated_at).getTime()}-${tplVer}` : null
  };
}

/** 报名码（公开）或门口签到码（只给负责人 / 帮手）的 PNG */
export async function codePng(code: string, kind: 'register' | 'door', contactId: string | null): Promise<Buffer> {
  const pool = getPool();
  const ev = await eventByCode(pool, code);
  if (kind === 'door') {
    if (!contactId || !(await memberOf(pool, contactId, ev.organizer_id))) throw new CrmError('not_found', '找不到这场活动');
  } else if (ev.org_status !== 'active' || !['published', 'review'].includes(ev.status)) throw new CrmError('not_found', '这场活动已下架');
  const { wxConfigured, orgEventCode } = await import('@/lib/crm/wechat');
  const k = ev.checkin_secret.slice(0, 8);
  if (!wxConfigured()) {
    const QRCode = (await import('qrcode')).default;
    return QRCode.toBuffer(`SAREC-TEST:pages/org/event?e=${ev.code}${kind === 'door' ? `&k=${k}` : ''}`, { margin: 1, width: 600 });
  }
  return orgEventCode(ev.code, kind === 'door' ? k : null);
}

// ── 我也要办活动 ─────────────────────────────────────────────────────
export async function apply(contactId: string, b: Input) {
  await requireToolOn();
  const orgName = str(b.orgName, 40);
  const personName = str(b.personName, 20);
  const rawPhone = str(b.phone, 30);
  const phone = rawPhone ? normalizePhone(rawPhone) ?? normalizePhone(rawPhone, '+86') : null;
  if (!orgName || !personName) throw new CrmError('bad_request', '请写单位名称和您的称呼');
  if (!phone) throw new CrmError('bad_request', '请写手机号，商会好联系您');
  const bad = bannedWord([orgName, personName, b.note].filter(Boolean).join(' '));
  if (bad) throw new CrmError('bad_request', `内容里有不能用的字「${bad}」，请改一下`);
  let fromEvent: string | null = null;
  if (typeof b.from === 'string' && /^[A-Za-z0-9]{10}$/.test(b.from)) {
    const { rows } = await getPool().query<{ id: string }>(`SELECT id FROM org_events WHERE code = $1`, [b.from.toUpperCase()]);
    fromEvent = rows[0]?.id ?? null;
  }
  const { rows: dup } = await getPool().query(`SELECT 1 FROM org_applications WHERE contact_id = $1 AND status = 'open'`, [contactId]);
  if (dup[0]) return { message: '已经收到您的申请了，商会会尽快联系您' };
  await getPool().query(
    `INSERT INTO org_applications (contact_id, org_name, person_name, phone, note, from_event) VALUES ($1, $2, $3, $4, $5, $6)`,
    [contactId, orgName, personName, phone, str(b.note, 200) || null, fromEvent]
  );
  // 自己申请开通 = 本人主动和商会发生关系
  const { linkToChamber } = await import('./guest');
  await linkToChamber(getPool(), contactId, '申请开通主办方');
  return { message: '已收到申请。商会看过后会联系您，开通后在「我的 → 我办的活动」就能发活动' };
}
