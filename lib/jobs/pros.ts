/** 接活人：登记、我的接活、找工人列表、联系（看电话并记录） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { memberStatus } from '@/lib/crm/membership';
import type { Db } from '@/lib/crm/profile';
import { msgSecCheck } from '@/lib/crm/contentSec';
import { anyPhone, verifiedPhone, type Viewer } from './access';
import { LANGUAGES, PRO_ROLES, PRO_STATUS_LABEL, REVIEW_DAYS, RULES, roleLabel, type ProRole, type ProStatus } from './constants';
import { getSwitches } from './settings';
import { tradeMap, type Trade } from './trades';
import { cityNames, loadCities, resolveCities, resolveCity } from './cities';

export type ProRow = {
  id: string; contact_id: string; role: ProRole; name: string; avatar_url: string | null; trades: string[]; verified_trades: string[]; cities: string[];
  years: number | null; languages: string[]; available_now: boolean; license_no: string | null; license_state: Record<string, unknown> | null;
  license_expires_on: string | null; intro: string | null; photos: string[]; team_size: number | null; insurance_url: string | null;
  business_reg_url: string | null; license_doc_url: string | null; design_no_ca_stamp: boolean; agreed_at: Date | null; status: ProStatus;
  return_reason: string | null; needs_review: boolean; verified_at: Date | null; verified_by: string | null; next_review_at: Date | null;
  is_paid_member: boolean; listed: boolean; wx_quota: number; removed_reason: string | null; wechat: string | null; created_at: Date; updated_at: Date;
};
const PRO_COLS = `p.id, p.contact_id, p.role, p.name, p.avatar_url, p.trades, p.verified_trades, p.cities, p.years, p.languages, p.available_now, p.license_no,
  p.license_state, p.license_expires_on::text AS license_expires_on, p.intro, p.photos, p.team_size, p.insurance_url, p.business_reg_url, p.license_doc_url,
  p.design_no_ca_stamp, p.agreed_at, p.status, p.return_reason, p.needs_review, p.verified_at, p.verified_by, p.next_review_at, p.is_paid_member, p.listed,
  p.wx_quota, p.removed_reason, p.wechat, p.created_at, p.updated_at`;

const ymd = (d: Date | null) => (d ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d) : null);

export async function proByContact(db: Db, contactId: string): Promise<ProRow | null> {
  const { rows } = await db.query<ProRow>(`SELECT ${PRO_COLS} FROM jobs_pros p WHERE p.contact_id = $1`, [contactId]);
  return rows[0] ?? null;
}
export async function proById(db: Db, id: string): Promise<ProRow | null> {
  const { rows } = await db.query<ProRow>(`SELECT ${PRO_COLS} FROM jobs_pros p WHERE p.id = $1`, [id]);
  return rows[0] ?? null;
}

/** 需要交会费才上列表、才能看电话：施工队或公司、持牌师傅、设计与专业服务（工人免费） */
export function needPayFor(p: Pick<ProRow, 'role' | 'status' | 'is_paid_member'>, requirePaid: boolean): boolean {
  return p.role !== 'worker' && p.status === 'verified' && requirePaid && !p.is_paid_member;
}
export function listedFor(p: Pick<ProRow, 'role' | 'status' | 'is_paid_member' | 'verified_trades'>, requirePaid: boolean): boolean {
  return p.status === 'verified' && p.verified_trades.length > 0 && !needPayFor(p, requirePaid);
}

/** 重新算一个人的缴费会员快照和“上不上列表” */
export async function refreshPro(db: Db, proId: string): Promise<ProRow | null> {
  const p = await proById(db, proId);
  if (!p) return null;
  const { requirePaid } = await getSwitches(db);
  const paid = (await memberStatus(db, p.contact_id).catch(() => ({ isMember: false }))).isMember;
  const listed = listedFor({ ...p, is_paid_member: paid }, requirePaid);
  if (paid !== p.is_paid_member || listed !== p.listed) {
    await db.query(`UPDATE jobs_pros SET is_paid_member = $2, listed = $3, updated_at = now() WHERE id = $1`, [proId, paid, listed]);
  }
  return { ...p, is_paid_member: paid, listed };
}
export async function refreshAllListed(): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM jobs_pros WHERE status = 'verified' OR listed`);
  for (const r of rows) await refreshPro(pool, r.id);
  return rows.length;
}

// ── 标记（D6：分开显示，不合成一个） ─────────────────────────────────
export type Badge = { kind: 'license' | 'no_state_license' | 'business_reg' | 'insurance' | 'member' | 'note'; text: string };
export function badgesFor(p: ProRow, trades: Map<string, Trade>): Badge[] {
  const out: Badge[] = [];
  const types = new Set(p.verified_trades.map((k) => trades.get(k)?.licType).filter(Boolean));
  if (p.status === 'verified' && p.role !== 'worker' && !!p.license_no && (types.has('A') || types.has('B')) && p.verified_at) out.push({ kind: 'license', text: `执照已核验 ${ymd(p.verified_at)}` });
  if (types.has('C')) {
    out.push({ kind: 'no_state_license', text: '此类服务无需州执照' });
    if (p.business_reg_url) out.push({ kind: 'business_reg', text: '已提供营业登记' });
    if (p.insurance_url) out.push({ kind: 'insurance', text: '已提供责任保险' });
  }
  if (p.is_paid_member) out.push({ kind: 'member', text: '缴费会员' });
  if (p.design_no_ca_stamp) out.push({ kind: 'note', text: '方案与咨询，不提供加州报批签章' });
  return out;
}

/** 列表卡片（公开） */
export function proCard(p: ProRow, trades: Map<string, Trade>, cities: Map<string, string> = new Map()) {
  const showLicense = p.role === 'company' || p.role === 'licensed' || (p.role === 'pro_service' && !!p.license_no);
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar_url,
    role: p.role,
    roleLabel: roleLabel(p.role),
    trades: p.verified_trades.map((k) => trades.get(k)?.name ?? k),
    tradeKeys: p.verified_trades,
    cities: p.cities.map((k) => cities.get(k) ?? k),
    cityKeys: p.cities,
    years: p.years,
    languages: p.languages,
    availableNow: p.available_now,
    intro: p.intro,
    photos: p.photos,
    teamSize: p.team_size,
    badges: badgesFor(p, trades),
    ...(showLicense && p.license_no ? { licenseNo: p.license_no } : {})
  };
}

/** 本人看的完整资料 */
export async function proSelf(db: Db, p: ProRow) {
  const trades = await tradeMap(db);
  const { requirePaid } = await getSwitches(db);
  const names = await cityNames(db);
  return {
    ...proCard(p, trades, names),
    // 本人编辑用：cities 是 key，cityNames 是名字
    cities: p.cities,
    cityNames: p.cities.map((k) => names.get(k) ?? k),
    trades: p.trades,
    tradeNames: p.trades.map((k) => trades.get(k)?.name ?? k),
    verifiedTrades: p.verified_trades,
    licenseNo: p.license_no,
    insuranceUrl: p.insurance_url,
    businessRegUrl: p.business_reg_url,
    licenseDocUrl: p.license_doc_url,
    wechat: p.wechat,
    status: p.status,
    statusLabel: PRO_STATUS_LABEL[p.status],
    returnReason: p.status === 'returned' ? p.return_reason : null,
    removedReason: p.status === 'removed' ? p.removed_reason : null,
    needsReview: p.needs_review,
    verifiedAt: ymd(p.verified_at),
    nextReviewAt: ymd(p.next_review_at),
    listed: p.listed,
    needPay: needPayFor(p, requirePaid),
    agreedAt: p.agreed_at,
    designNoCaStamp: p.design_no_ca_stamp
  };
}

/** meta 里的 me.pro */
export async function proBrief(db: Db, contactId: string | null) {
  if (!contactId) return null;
  const p = await proByContact(db, contactId);
  if (!p) return null;
  const { requirePaid } = await getSwitches(db);
  return { id: p.id, role: p.role, status: p.status, listed: p.listed, needPay: needPayFor(p, requirePaid) };
}

// ── 现有会员资料自动带入 ─────────────────────────────────────────────
const ROLE_SUB_TRADES: Record<string, string[]> = {
  '总承包建筑公司': ['general', 'remodel', 'adu'], '装修公司': ['remodel', 'kitchen_bath'], '屋顶': ['roofing'], '水电专业承包': ['plumbing', 'electrical'],
  '太阳能与储能': ['solar'], '绿化园林': ['landscape', 'gardening'], '防水与外墙': ['roofing', 'painting'], '建筑设计': ['architect'], '结构工程': ['engineer'],
  '土木工程': ['engineer'], '室内设计': ['interior'], '景观设计': ['landscape'], '测量': ['surveyor'], '规划与许可代办': ['permit'], '物业管理公司': ['property_mgmt'],
  '清洁维修': ['cleaning', 'handyman'], '律师': ['lawyer'], '会计师（CPA）': ['tax'], '税务顾问': ['tax'], '房屋财产险': ['insurance'],
  '建筑工程险': ['insurance'], '建材供应': ['supply'], '橱柜石材': ['supply'], '门窗': ['windows'], '家具软装': ['staging'], '建筑设备与机械': ['supply']
};
const ROLE_SUB_ROLE: Record<string, ProRole> = {
  '总承包建筑公司': 'company', '装修公司': 'company', '屋顶': 'company', '水电专业承包': 'company', '太阳能与储能': 'company', '绿化园林': 'company',
  '防水与外墙': 'company', '建筑设计': 'pro_service', '结构工程': 'pro_service', '土木工程': 'pro_service', '室内设计': 'pro_service', '景观设计': 'pro_service',
  '测量': 'pro_service', '规划与许可代办': 'pro_service', '物业管理公司': 'pro_service', '律师': 'pro_service', '会计师（CPA）': 'pro_service', '税务顾问': 'pro_service'
};
export async function prefillFor(db: Db, contactId: string) {
  const { rows } = await db.query<{ name: string; avatar_url: string | null; role_sub: string | null; company: string | null; intro: string | null; wechat_id: string | null }>(
    `SELECT c.name, c.avatar_url, c.role_sub, mc.company, mc.intro, mc.wechat_id
       FROM contacts c LEFT JOIN member_cards mc ON mc.contact_id = c.id WHERE c.id = $1`,
    [contactId]
  );
  const c = rows[0];
  const trades = await tradeMap(db);
  const sub = c?.role_sub ?? '';
  const name = (c?.company || (c?.name && c.name !== '微信用户' ? c.name : '') || '').trim();
  return {
    name,
    personName: c?.name && c.name !== '微信用户' ? c.name : '',
    avatar: c?.avatar_url ?? null,
    phone: await verifiedPhone(db, contactId),
    wechat: c?.wechat_id ?? null,
    intro: c?.intro ?? null,
    role: ROLE_SUB_ROLE[sub] ?? null,
    trades: (ROLE_SUB_TRADES[sub] ?? []).filter((k) => trades.has(k)),
    cities: [] as string[],
    isMember: (await memberStatus(db, contactId).catch(() => ({ isMember: false }))).isMember
  };
}

// ── 登记 / 更新 ─────────────────────────────────────────────────────
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const strArr = (v: unknown, n: number, max: number) =>
  Array.from(new Set((Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, n)).filter(Boolean))).slice(0, max);
const intOr = (v: unknown, lo: number, hi: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : null;
};
const urlOr = (v: unknown): string | null => {
  const s = str(v, 600);
  return /^https:\/\//.test(s) ? s : null;
};

export type SaveResult = { pro: Awaited<ReturnType<typeof proSelf>>; autoCheck: unknown };

export async function saveMyPro(v: Viewer, contactId: string, b: Record<string, unknown>): Promise<SaveResult> {
  const pool = getPool();
  if (b.agree !== true) throw new CrmError('bad_request', '请先勾选同意登记规则');
  const role = PRO_ROLES.find((r) => r.key === b.role)?.key;
  if (!role) throw new CrmError('bad_request', '请选身份：施工队或公司、持牌师傅、设计与专业服务、工人');
  const name = str(b.name, 60);
  if (!name) throw new CrmError('bad_request', '请填名称或姓名');
  const trades = await tradeMap(pool);
  const tradeKeys = strArr(b.trades, 40, 30);
  if (!tradeKeys.length) throw new CrmError('bad_request', '请至少选一个能做的工种');
  for (const k of tradeKeys) {
    const t = trades.get(k);
    if (!t) throw new CrmError('bad_request', '选的工种里有一项已经不存在了，请重新选');
    if (!t.open && !v.staff) throw new CrmError('bad_request', `「${t.name}」暂时还没开放登记`);
  }
  const cities = (await resolveCities(pool, b.cities)).map((c) => c.key);
  if (!cities.length) throw new CrmError('bad_request', '请至少选一个服务城市');
  const languages = strArr(b.languages, 20, 8).filter((x) => LANGUAGES.includes(x) || x.length <= 20);
  const licenseNo = str(b.licenseNo, 40).replace(/\s+/g, '') || null;
  const businessRegUrl = urlOr(b.businessRegUrl);
  const insuranceUrl = urlOr(b.insuranceUrl);
  const licenseDocUrl = urlOr(b.licenseDocUrl);
  const photos = strArr(b.photos, 600, 10).filter((u) => /^https:\/\//.test(u));
  if (photos.length > 9) throw new CrmError('bad_request', '活儿照片最多 9 张');
  const needsLicense = tradeKeys.filter((k) => trades.get(k)!.licType !== 'C');
  const needsBizReg = tradeKeys.filter((k) => trades.get(k)!.licType === 'C');
  if (role === 'company' || role === 'licensed') {
    if (!licenseNo) throw new CrmError('bad_request', '请填牌照号（施工队和持牌师傅必须核验牌照）');
  }
  if (role === 'pro_service') {
    if (needsLicense.length && !licenseNo) {
      throw new CrmError('bad_request', `「${needsLicense.map((k) => trades.get(k)!.name).join('、')}」需要州执照，请填执照号`);
    }
  }
  if (role !== 'worker' && needsBizReg.length && !businessRegUrl && !licenseNo) {
    throw new CrmError('bad_request', `「${needsBizReg.map((k) => trades.get(k)!.name).join('、')}」不需要州执照，但要上传营业登记`);
  }
  const phone = await verifiedPhone(pool, contactId);
  if (!phone) throw new CrmError('need_phone', '请先验证手机号：找工人的人要能打电话给你');
  const intro = str(b.intro, 300) || null;
  if (intro && v.mp) {
    const { rows: o } = await pool.query<{ openid: string | null }>(`SELECT wechat_openid AS openid FROM contacts WHERE id = $1`, [contactId]);
    if ((await msgSecCheck(`${name}\n${intro}`, o[0]?.openid ?? null, 1)) === 'risky') throw new CrmError('bad_request', '介绍里有不合适的内容，请修改后再提交');
  }

  const cur = await proByContact(pool, contactId);
  const fields = {
    role, name, avatar: urlOr(b.avatar) ?? cur?.avatar_url ?? null, trades: tradeKeys, cities, years: intOr(b.years, 0, 80), languages,
    availableNow: typeof b.availableNow === 'boolean' ? b.availableNow : cur?.available_now ?? true,
    licenseNo: role === 'worker' ? null : licenseNo, intro, photos, teamSize: intOr(b.teamSize, 1, 5000),
    insuranceUrl, businessRegUrl, licenseDocUrl, wechat: str(b.wechat, 60) || null, designNoCaStamp: b.designNoCaStamp === true
  };

  // 状态由服务器决定
  let status: ProStatus;
  let verifiedTrades: string[] = cur?.verified_trades ?? [];
  let needsReview = false;
  let verifiedAt: Date | null = cur?.verified_at ?? null;
  if (role === 'worker') {
    // 工人不填牌照、免费登记：登记即生效（只给施工队招工时用，不出现在业主找人的列表里）
    status = 'verified';
    verifiedTrades = tradeKeys;
    verifiedAt = verifiedAt ?? new Date();
  } else if (cur && cur.status === 'verified' && cur.role === role) {
    // 已通过：只保留仍然勾着的工种；新加的工种、换了牌照号、换了营业登记 → 等工作人员再看，原来的照常上列表
    const changedKey = (cur.license_no ?? null) !== fields.licenseNo || (cur.business_reg_url ?? null) !== businessRegUrl;
    verifiedTrades = changedKey ? [] : cur.verified_trades.filter((k) => tradeKeys.includes(k));
    needsReview = changedKey || tradeKeys.some((k) => !verifiedTrades.includes(k));
    status = changedKey ? 'pending' : 'verified';
  } else if (cur && cur.status === 'removed' && !v.staff) {
    throw new CrmError('forbidden', '你的接活资料已被下架，请联系商会工作人员');
  } else {
    status = 'pending';
    verifiedTrades = [];
  }

  const params = [
    contactId, fields.role, fields.name, fields.avatar, fields.trades, verifiedTrades, fields.cities, fields.years, fields.languages, fields.availableNow,
    fields.licenseNo, fields.intro, fields.photos, fields.teamSize, fields.insuranceUrl, fields.businessRegUrl, fields.licenseDocUrl, fields.wechat,
    fields.designNoCaStamp, status, needsReview, verifiedAt
  ];
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO jobs_pros (contact_id, role, name, avatar_url, trades, verified_trades, cities, years, languages, available_now, license_no, intro, photos, team_size,
        insurance_url, business_reg_url, license_doc_url, wechat, design_no_ca_stamp, status, needs_review, verified_at, agreed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22, now())
     ON CONFLICT (contact_id) DO UPDATE SET role=$2, name=$3, avatar_url=$4, trades=$5, verified_trades=$6, cities=$7, years=$8, languages=$9, available_now=$10,
        license_no=$11, intro=$12, photos=$13, team_size=$14, insurance_url=$15, business_reg_url=$16, license_doc_url=$17, wechat=$18, design_no_ca_stamp=$19,
        status=$20, needs_review=$21, verified_at=$22, agreed_at=now(), return_reason=NULL, updated_at=now()
     RETURNING id`,
    params
  );
  const id = rows[0].id;
  if (role === 'worker') {
    await pool.query(`UPDATE jobs_pros SET next_review_at = NULL WHERE id = $1`, [id]);
  }
  // 自动查加州承包商牌照（CSLB）：只记结果，工作人员一键通过
  let autoCheck: unknown = null;
  if (fields.licenseNo && tradeKeys.some((k) => trades.get(k)!.licType === 'A') && (!cur || cur.license_no !== fields.licenseNo || !cur.license_state)) {
    const { checkAndRecord } = await import('./verify');
    autoCheck = await checkAndRecord(id, 'auto_cslb', 'system').catch(() => null);
  }
  const fresh = (await refreshPro(pool, id))!;
  if (status === 'pending' || needsReview) {
    const { recordException } = await import('@/lib/crm/followups');
    await recordException('jobs_verify', `jobs_verify:${id}`, id, `接活人「${name}」（${roleLabel(role)}）等待核验`, { proId: id });
  }
  return { pro: await proSelf(pool, fresh), autoCheck };
}

export async function setAvailable(contactId: string, available: boolean) {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(`UPDATE jobs_pros SET available_now = $2, updated_at = now() WHERE contact_id = $1 RETURNING id`, [contactId, available]);
  if (!rows[0]) throw new CrmError('not_found', '你还没有登记接活');
  return proSelf(pool, (await proById(pool, rows[0].id))!);
}

// ── 找工人：列表 ───────────────────────────────────────────────────────
export async function listPros(q: { trade?: string | null; group?: string | null; city?: string | null; role?: string | null; cursor?: string | null }) {
  const pool = getPool();
  const trades = await tradeMap(pool);
  let keys: string[] | null = null;
  if (q.trade) keys = [q.trade];
  else if (q.group) keys = Array.from(trades.values()).filter((t) => t.group === q.group).map((t) => t.key);
  const worker = q.role === 'worker';
  const offset = Math.max(0, Number(q.cursor) || 0);
  const limit = 20;
  const where = `p.listed AND ${worker ? `p.role = 'worker'` : `p.role <> 'worker'`} AND ($1::text[] IS NULL OR p.verified_trades && $1::text[])`;
  const cityKey = q.city ? (await resolveCity(pool, q.city, { allowDisabled: true }))?.key ?? '__none__' : null;
  const { rows } = await pool.query<ProRow>(
    `SELECT ${PRO_COLS} FROM jobs_pros p WHERE ${where} AND ($2::text IS NULL OR $2 = ANY(p.cities))
      ORDER BY p.available_now DESC, p.verified_at DESC NULLS LAST, p.id LIMIT ${limit + 1} OFFSET $3`,
    [keys, cityKey, offset]
  );
  const { rows: cs } = await pool.query<{ c: string }>(`SELECT DISTINCT unnest(p.cities) AS c FROM jobs_pros p WHERE ${where}`, [keys]);
  // 筛选用的城市：按后台城市表的顺序，只列这批人服务的
  const have = new Set(cs.map((r) => r.c));
  const all = await loadCities(pool, { all: true });
  const names = new Map(all.map((c) => [c.key, c.name]));
  const cities = all.filter((c) => have.has(c.key)).map((c) => ({ key: c.key, name: c.name }));
  return {
    items: rows.slice(0, limit).map((p) => proCard(p, trades, names)),
    cities,
    nextCursor: rows.length > limit ? String(offset + limit) : null
  };
}

export async function getProPublic(id: string, v: Viewer) {
  const pool = getPool();
  const p = await proById(pool, id);
  if (!p || (!p.listed && !v.staff && p.contact_id !== v.contactId)) throw new CrmError('not_found', '找不到这个人，可能已经下架');
  return proCard(p, await tradeMap(pool), await cityNames(pool));
}

/** 找工人的人点“联系”：给电话（和微信），记录谁看过 */
export async function contactPro(id: string, v: Viewer, viewerId: string) {
  const pool = getPool();
  const p = await proById(pool, id);
  if (!p || (!p.listed && !v.staff && p.contact_id !== viewerId)) throw new CrmError('not_found', '找不到这个人，可能已经下架');
  const phone = await anyPhone(pool, p.contact_id);
  if (p.contact_id !== viewerId) {
    await pool.query(
      `INSERT INTO jobs_contacts (direction, pro_id, viewer_contact_id) VALUES ('pro', $1, $2)
       ON CONFLICT (pro_id, viewer_contact_id) WHERE direction = 'pro' DO UPDATE SET times = jobs_contacts.times + 1, last_at = now()`,
      [id, viewerId]
    );
  }
  return { phone, wechat: p.wechat, name: p.name };
}

export async function addSubscription(contactId: string, accepted: unknown): Promise<{ saved: boolean; quota: number }> {
  const { jobsTemplate } = await import('./notify');
  const t = jobsTemplate();
  const list = Array.isArray(accepted) ? accepted.filter((x): x is string => typeof x === 'string') : [];
  if (!t || !(list.includes('jobs') || list.includes(t.id))) return { saved: false, quota: 0 };
  const { rows } = await getPool().query<{ wx_quota: number }>(
    `UPDATE jobs_pros SET wx_quota = LEAST(wx_quota + 1, 50), updated_at = now() WHERE contact_id = $1 RETURNING wx_quota`,
    [contactId]
  );
  return { saved: !!rows[0], quota: rows[0]?.wx_quota ?? 0 };
}

export const REVIEW_INTERVAL = `${REVIEW_DAYS} days`;
export { RULES };
