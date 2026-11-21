/**
 * 找工人 · 接活儿：工作人员代登记接活人（后台优化 D，指令 13 第 3 条；迁移 0041）
 * ------------------------------------------------------------------
 * - 一个人一个人填（表单）+ 一次贴一张表（从 Excel / 微信表格复制的多行文字，按列解析）。先预览每一行会怎样、会不会被拒，确认后才写。
 * - 资质规则和本人登记完全一样（pros.ts 的 qualificationError / tradeOpenError 同一份）；没开放的工种照样不让上。
 *   唯一的不同：本人登记 C 类工种要上传营业登记照片，代登记也可以只填营业登记号（工作人员照号码到官方查询页核验）。
 * - 写入后照常核验：加州承包商牌照照常排队对 CSLB 总表，其他照常人工核验；工人照本人登记的规则登记即生效。
 * - 标“商会代登记”（jobs_pros.proxy_by）：只在后台显示，接活人卡片和公开接口不出。
 * - 电话去重：同号已有接活人的 → 提示、不重复建；同号已有档案没登记接活的 → 关联到那份档案；都没有 → 新建档案。
 * - 给本人发一条确认短信：走发消息总闸（lib/crm/notifyGate.ts，沿用子任务 B 的 gateSend：正式站 notify_live 默认关 → 只记录、不真发；
 *   测试站只发测试号码）。记录里收件人打码，正文里链接的令牌也打码（真发出去的是完整链接）。
 *   链接打开不用登录的确认页（/zh/jobs/confirm/<一次性令牌>，带签名），确认后标“本人已确认”；要改走正常的登记页（登录后资料自动带入）。
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { CrmError, normalizePhone } from '@/lib/crm/events';
import type { Staff } from '@/lib/crm/auth';
import type { Db } from '@/lib/crm/profile';
import { maskPhone } from '@/lib/crm/contactInfo';
import { gateSend, notifyLive } from '@/lib/crm/notifyGate';
import { isProduction } from '@/lib/email/resend-client';
import { smsSend } from '@/lib/crm/payLinks';
import { PRO_ROLES, PRO_STATUS_LABEL, RULES, roleLabel, webBase, WEB_JOBS_PATH, type ProRole } from './constants';
import { anyPhone } from './access';
import { loadCities, type City } from './cities';
import { tradeMap, type Trade } from './trades';
import { PROXY_LIST_KEY, proById, proxyListBeforeConfirm, qualificationError, refreshPro, refreshAllListed, tradeOpenError } from './pros';

// ── 一次贴一张表：列名 ───────────────────────────────────────────────
export const PROXY_COLUMNS = ['姓名', '电话', '身份', '工种', '城市', '年限', '牌照号/登记号', '介绍'] as const;
type ColKey = 'name' | 'phone' | 'role' | 'trades' | 'cities' | 'years' | 'regNo' | 'intro';
const COL_KEYS: ColKey[] = ['name', 'phone', 'role', 'trades', 'cities', 'years', 'regNo', 'intro'];
const HEADER_ALIASES: Record<ColKey, string[]> = {
  name: ['姓名', '名字', '名称', '姓名或公司', '公司'],
  phone: ['电话', '手机', '手机号', '电话号码', '联系电话'],
  role: ['身份', '类型', '类别'],
  trades: ['工种', '能做的工种', '工种服务', '服务'],
  cities: ['城市', '服务城市', '地区'],
  years: ['年限', '从业年限', '年数', '干了几年'],
  regNo: ['牌照号/登记号', '牌照号', '登记号', '执照号', '牌照', '营业登记号', '牌照号或登记号'],
  intro: ['介绍', '简介', '备注', '说明']
};
export const PROXY_HEADER = PROXY_COLUMNS.join('\t');
export const PROXY_SAMPLE = [
  PROXY_HEADER,
  '张师傅\t626-555-0101\t持牌师傅\t水管、电工\t尔湾、橙县其他\t12\t1050000\t通下水、换热水器',
  '李姐保洁\t949-555-0102\t设计与专业服务\t清洁保洁\t尔湾\t5\t202412345678\t退租清洁、开荒保洁',
  '王工\t909-555-0103\t工人\t油漆粉刷、地板瓷砖\t钻石吧、罗兰岗\t8\t\t能干油漆、贴砖'
].join('\n');
export const PROXY_HELP = [
  '从 Excel 或微信表格里整块复制（含第一行列名），直接贴进来。列名照这个写：姓名、电话、身份、工种、城市、年限、牌照号/登记号、介绍。',
  '身份填：施工队或公司 / 持牌师傅 / 设计与专业服务 / 工人。工种、城市一格里有几个就用顿号隔开，名字照「工种与资质表」「城市」里的写。',
  '牌照号/登记号：施工队、持牌师傅、要州执照的工种填牌照号或执照号；只要营业登记的工种（清洁、垃圾清运、室内设计等）填营业登记号。工人不用填。',
  '没有列名那一行也行，就按上面的顺序认。电话：美国号码 10 位；中国号码前面加 +86。'
];

const ROLE_WORDS: Record<ProRole, string[]> = {
  company: ['施工队或公司', '施工队', '公司', '承包商', '施工公司'],
  licensed: ['持牌师傅', '师傅', '持牌'],
  pro_service: ['设计与专业服务', '专业服务', '设计', '设计师'],
  worker: ['工人', '散工', '小工']
};
function parseRole(raw: string): ProRole | null {
  const v = raw.trim();
  if (!v) return null;
  const byKey = PRO_ROLES.find((r) => r.key === v)?.key;
  if (byKey) return byKey;
  for (const [k, words] of Object.entries(ROLE_WORDS) as [ProRole, string[]][]) if (words.includes(v)) return k;
  return null;
}

const splitMulti = (v: unknown): string[] =>
  (Array.isArray(v) ? v.map(String) : String(v ?? '').split(/[、,，;；/／|]+/)).map((x) => x.trim()).filter(Boolean);
const stripParen = (s: string) => s.replace(/[（(].*?[)）]/g, '').trim();

function matchTrade(raw: string, trades: Trade[]): { trade: Trade | null; error: string | null } {
  const v = raw.trim();
  const exact = trades.find((t) => t.key === v || t.name === v || stripParen(t.name) === v);
  if (exact) return { trade: exact, error: null };
  const loose = trades.filter((t) => t.name.includes(v) || v.includes(stripParen(t.name)));
  if (loose.length === 1) return { trade: loose[0], error: null };
  if (loose.length > 1) return { trade: null, error: `工种「${v}」能对上好几个（${loose.map((t) => t.name).join('、')}），请写全名` };
  return { trade: null, error: `工种「${v}」不在「工种与资质表」里` };
}
function matchCity(raw: string, cities: City[]): City | null {
  const v = raw.trim();
  return cities.find((c) => c.key === v || c.name === v) ?? cities.find((c) => c.name.replace(/市$/, '') === v.replace(/市$/, '')) ?? null;
}

/** 美国号码 10 位（前面带 1 也行）；中国号码要带 +86 或 86（不带的一律按美国号码认，免得 1 开头的 11 位美国号被认错） */
function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+')) return normalizePhone(raw);
  if (digits.length === 13 && digits.startsWith('86')) return normalizePhone(`+${digits}`);
  return normalizePhone(raw, '+1');
}

// ── 一行：检查（预览用，写入前再查一遍） ───────────────────────────────
export type ProxyInput = {
  name?: unknown; phone?: unknown; role?: unknown; trades?: unknown; cities?: unknown; years?: unknown;
  /** 表格里的「牌照号/登记号」一列：按身份和工种自动认成牌照号还是营业登记号 */
  regNo?: unknown; licenseNo?: unknown; businessRegNo?: unknown;
  businessRegUrl?: unknown; insuranceUrl?: unknown; licenseDocUrl?: unknown; intro?: unknown; wechat?: unknown;
};
export type CheckedRow = {
  line: number | null;
  ok: boolean;
  /** create 新建档案并登记 / link 关联到已有档案再登记 / duplicate 同号已有接活人，不重复建 / reject 有问题，不写 */
  action: 'create' | 'link' | 'duplicate' | 'reject';
  errors: string[];
  notes: string[];
  existing: { contactId: string; contactName: string | null; proId: string | null; proName: string | null; proStatus: string | null } | null;
  data: {
    name: string; phone: string | null; role: ProRole | null; roleLabel: string | null; trades: { key: string; name: string; licType: string }[];
    cities: { key: string; name: string }[]; years: number | null; licenseNo: string | null; businessRegNo: string | null;
    businessRegUrl: string | null; insuranceUrl: string | null; licenseDocUrl: string | null; intro: string | null; wechat: string | null;
  };
  /** 写入后会怎样（一句人话） */
  outcome: string;
};

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : typeof v === 'number' ? String(v) : '');
const urlOr = (v: unknown): string | null => {
  const s = str(v, 600);
  return /^https:\/\//.test(s) ? s : null;
};

type Ctx = { trades: Map<string, Trade>; tradeList: Trade[]; cities: City[]; seenPhones: Map<string, number> };
async function ctxFor(db: Db): Promise<Ctx> {
  const trades = await tradeMap(db);
  return { trades, tradeList: Array.from(trades.values()), cities: await loadCities(db, { all: true }), seenPhones: new Map() };
}

async function findByPhone(db: Db, phone: string) {
  const { rows } = await db.query<{ id: string; name: string | null }>(
    `SELECT coalesce(c.merged_into, c.id) AS id, (SELECT x.name FROM contacts x WHERE x.id = coalesce(c.merged_into, c.id)) AS name FROM contacts c
      WHERE c.phone_e164 = $1 OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.value = $1)
      ORDER BY (c.phone_verified_at IS NOT NULL) DESC, c.created_at LIMIT 1`,
    [phone]
  );
  if (!rows[0]) return null;
  const { rows: p } = await db.query<{ id: string; name: string; status: string }>(`SELECT id, name, status FROM jobs_pros WHERE contact_id = $1`, [rows[0].id]);
  return { contactId: rows[0].id, contactName: rows[0].name, proId: p[0]?.id ?? null, proName: p[0]?.name ?? null, proStatus: p[0]?.status ?? null };
}

export async function checkRow(db: Db, input: ProxyInput, ctx: Ctx, line: number | null = null): Promise<CheckedRow> {
  const errors: string[] = [];
  const notes: string[] = [];
  const name = str(input.name, 60);
  if (!name) errors.push('没填姓名（或公司名称）');
  const phoneRaw = str(input.phone, 40);
  const phone = phoneRaw ? toE164(phoneRaw) : null;
  if (!phoneRaw) errors.push('没填电话（找工人的人要能打电话给他）');
  else if (!phone) errors.push(`电话「${phoneRaw}」格式不对：美国号码 10 位，中国号码 11 位`);
  const roleRaw = str(input.role, 20);
  const role = parseRole(roleRaw);
  if (!roleRaw) errors.push('没填身份：施工队或公司 / 持牌师傅 / 设计与专业服务 / 工人');
  else if (!role) errors.push(`身份「${roleRaw}」认不出来，请填：施工队或公司 / 持牌师傅 / 设计与专业服务 / 工人`);

  const tradeObjs: Trade[] = [];
  const tradeWords = splitMulti(input.trades);
  if (!tradeWords.length) errors.push('没填工种');
  for (const w of tradeWords.slice(0, 30)) {
    const m = matchTrade(w, ctx.tradeList);
    if (m.error) errors.push(m.error);
    else if (m.trade && !tradeObjs.some((t) => t.key === m.trade!.key)) tradeObjs.push(m.trade);
  }
  const tradeKeys = tradeObjs.map((t) => t.key);
  if (tradeKeys.length) {
    const e = tradeOpenError(tradeKeys, ctx.trades, false);
    if (e) errors.push(e);
  }
  const cityObjs: City[] = [];
  const cityWords = splitMulti(input.cities);
  if (!cityWords.length) errors.push('没填城市');
  for (const w of cityWords.slice(0, 40)) {
    const c = matchCity(w, ctx.cities);
    if (!c || !c.enabled) errors.push(`城市「${w}」不在城市列表里（列表里没有的先到「找工人接活儿城市」里加）`);
    else if (!cityObjs.some((x) => x.key === c.key)) cityObjs.push(c);
  }
  const yRaw = str(input.years, 10).replace(/年$/, '');
  let years: number | null = null;
  if (yRaw) {
    const n = Number(yRaw);
    if (!Number.isFinite(n) || n < 0 || n > 80) errors.push(`年限「${yRaw}」请填 0 到 80 的数字`);
    else years = Math.round(n);
  }

  // 牌照号 / 营业登记号
  let licenseNo = str(input.licenseNo, 40).replace(/\s+/g, '') || null;
  let businessRegNo = str(input.businessRegNo, 60) || null;
  const regNo = str(input.regNo, 60).replace(/^[（(].*[)）]$/, '').trim();
  const needsLic = role === 'company' || role === 'licensed' || tradeObjs.some((t) => t.licType !== 'C');
  if (regNo && !licenseNo && !businessRegNo) {
    if (role === 'worker') notes.push('工人不用填牌照号，这一格不用');
    else if (needsLic) licenseNo = regNo.replace(/\s+/g, '');
    else businessRegNo = regNo;
  }
  if (role === 'worker') licenseNo = null;
  const businessRegUrl = urlOr(input.businessRegUrl);
  if (role && tradeKeys.length && tradeKeys.every((k) => ctx.trades.has(k))) {
    const q = qualificationError(role, tradeKeys, ctx.trades, { licenseNo, hasBizReg: !!businessRegUrl || !!businessRegNo });
    if (q) errors.push(q.replace('但要上传营业登记', '但要有营业登记（填营业登记号或上传营业登记照片）'));
  }
  if (licenseNo) notes.push(`「${licenseNo}」按牌照 / 执照号登记`);
  if (businessRegNo) notes.push(`「${businessRegNo}」按营业登记号登记`);

  const intro = str(input.intro, 300) || null;
  let action: CheckedRow['action'] = 'create';
  let existing: CheckedRow['existing'] = null;
  if (phone) {
    const first = ctx.seenPhones.get(phone);
    if (first != null) {
      errors.push(`和第 ${first} 行是同一个电话，表里重复了`);
    } else {
      ctx.seenPhones.set(phone, line ?? 0);
      existing = await findByPhone(db, phone);
      if (existing?.proId) {
        action = 'duplicate';
      } else if (existing) {
        action = 'link';
        notes.push(`这个电话已有档案「${existing.contactName ?? '未填名字'}」，接活儿资料会挂到这份档案上，不另建档案`);
      }
    }
  }
  if (errors.length) action = 'reject';
  const st = existing?.proStatus as keyof typeof PRO_STATUS_LABEL | undefined;
  const outcome =
    action === 'reject' ? '不会写入：先把上面的问题改好'
      : action === 'duplicate' ? `不会重复建：这个电话已经登记过接活儿「${existing!.proName}」（${st ? PRO_STATUS_LABEL[st] : ''}）。要改请到「接活人核验」里找他，或让本人在「我的接活儿」里改`
      : role === 'worker' ? '登记即生效（和本人登记一样：工人只给施工队招工用，不进业主找人的列表）'
      : `进「接活人核验」等核验${licenseNo && tradeObjs.some((t) => t.licType === 'A') ? '；牌照自动排队对照加州承包商（CSLB）官方名单' : '（工作人员照官方查询页人工核验）'}；核验通过就上找工人列表`;
  return {
    line, ok: action === 'create' || action === 'link', action, errors, notes, existing,
    data: {
      name, phone, role, roleLabel: role ? roleLabel(role) : null, trades: tradeObjs.map((t) => ({ key: t.key, name: t.name, licType: t.licType })),
      cities: cityObjs.map((c) => ({ key: c.key, name: c.name })), years, licenseNo, businessRegNo, businessRegUrl,
      insuranceUrl: urlOr(input.insuranceUrl), licenseDocUrl: urlOr(input.licenseDocUrl), intro, wechat: str(input.wechat, 60) || null
    },
    outcome
  };
}

// ── 贴表解析 ────────────────────────────────────────────────────────────
function splitCells(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((x) => x.trim());
  if (line.includes('|')) return line.split('|').map((x) => x.trim());
  if (/\s{2,}/.test(line.trim())) return line.trim().split(/\s{2,}/).map((x) => x.trim());
  return line.split(/[,，]/).map((x) => x.trim());
}
const normHead = (s: string) => s.replace(/[\s*：:]/g, '').replace(/（.*?）|\(.*?\)/g, '');
export function parseTable(text: string): { headerFound: boolean; columns: string[]; rows: { line: number; input: ProxyInput }[] } {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  let order: (ColKey | null)[] = COL_KEYS;
  let headerFound = false;
  const rows: { line: number; input: ProxyInput }[] = [];
  lines.forEach((raw, i) => {
    if (!raw.trim()) return;
    const cells = splitCells(raw);
    if (!headerFound && !rows.length) {
      const mapped = cells.map((c) => (Object.entries(HEADER_ALIASES) as [ColKey, string[]][]).find(([, al]) => al.some((a) => normHead(a) === normHead(c)))?.[0] ?? null);
      if (mapped.includes('name') && mapped.includes('phone')) {
        order = mapped;
        headerFound = true;
        return;
      }
    }
    const input: Record<string, string> = {};
    order.forEach((k, j) => { if (k && cells[j] != null && input[k] == null) input[k] = cells[j]; });
    rows.push({ line: i + 1, input: input as ProxyInput });
  });
  return { headerFound, columns: order.map((k) => (k ? PROXY_COLUMNS[COL_KEYS.indexOf(k)] : '（不认识，忽略）')), rows: rows.slice(0, 300) };
}

export const BATCH_MAX = 200;
export async function previewBatch(text: string) {
  const pool = getPool();
  const parsed = parseTable(text);
  if (!parsed.rows.length) throw new CrmError('bad_request', '没读到内容：请从表格里整块复制（含第一行列名）贴进来');
  if (parsed.rows.length > BATCH_MAX) throw new CrmError('bad_request', `一次最多 ${BATCH_MAX} 行，请分几次贴`);
  const ctx = await ctxFor(pool);
  const rows: CheckedRow[] = [];
  for (const r of parsed.rows) rows.push(await checkRow(pool, r.input, ctx, r.line));
  return { headerFound: parsed.headerFound, columns: parsed.columns, rows, summary: summarize(rows) };
}
function summarize(rows: CheckedRow[]) {
  return {
    total: rows.length,
    willSave: rows.filter((r) => r.ok).length,
    rejected: rows.filter((r) => r.action === 'reject').length,
    duplicate: rows.filter((r) => r.action === 'duplicate').length,
    linked: rows.filter((r) => r.action === 'link').length
  };
}

// ── 写入 ────────────────────────────────────────────────────────────────
const actorOf = (s: Staff) => `staff:${s.name || s.email}`;

async function saveChecked(db: Db, s: Staff, r: CheckedRow): Promise<{ proId: string | null; error: string | null }> {
  if (!r.ok || !r.data.role || !r.data.phone) return { proId: null, error: r.errors[0] ?? r.outcome };
  const actor = actorOf(s);
  const d = r.data;
  const role: ProRole = r.data.role;
  const phone: string = r.data.phone;
  let contactId = r.existing?.contactId ?? null;
  if (!contactId) {
    const { rows } = await db.query<{ id: string }>(`INSERT INTO contacts (name, phone_e164, acquisition_source) VALUES ($1, $2, 'jobs_proxy') RETURNING id`, [d.name, d.phone]);
    contactId = rows[0].id;
    const { setMethod } = await import('@/lib/crm/contactInfo');
    await setMethod(db, contactId, 'phone', phone, 'staff');
  }
  const worker = d.role === 'worker';
  const keys = d.trades.map((t) => t.key);
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO jobs_pros (contact_id, role, name, trades, verified_trades, cities, years, available_now, license_no, intro, insurance_url, business_reg_url,
        license_doc_url, wechat, status, verified_at, business_reg_no, proxy_by, proxy_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now())
     ON CONFLICT (contact_id) DO NOTHING RETURNING id`,
    [
      contactId, d.role, d.name, keys, worker ? keys : [], d.cities.map((c) => c.key), d.years, d.licenseNo, d.intro, d.insuranceUrl, d.businessRegUrl,
      d.licenseDocUrl, d.wechat, worker ? 'verified' : 'pending', worker ? new Date() : null, d.businessRegNo, actor
    ]
  );
  if (!rows[0]) return { proId: null, error: '这个电话刚刚已经有人登记了接活儿，没有重复建' };
  const id = rows[0].id;
  // 和本人登记一样：加州承包商牌照自动排队比对；其余等工作人员核验
  if (d.licenseNo && d.trades.some((t) => t.licType === 'A')) {
    const { checkAndRecord } = await import('./verify');
    await checkAndRecord(id, 'auto_cslb', actor).catch(() => null);
  }
  await refreshPro(db, id);
  if (!worker) {
    const { recordException } = await import('@/lib/crm/followups');
    await recordException('jobs_verify', `jobs_verify:${id}`, id, `接活人「${d.name}」（${roleLabel(role)}，商会代登记）等待核验`, { proId: id });
  }
  await db.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value) VALUES ($1, 'jobs_pro_proxy', 'jobs_pro', $2, $3)`, [
    actor, id, JSON.stringify({ name: d.name, role: d.role, trades: keys, linked: r.action === 'link' })
  ]);
  return { proId: id, error: null };
}

/** 单个代登记：mode=preview 只检查；mode=save 写入（写入前再查一遍） */
export async function proxyOne(s: Staff, b: Record<string, unknown>) {
  const pool = getPool();
  const ctx = await ctxFor(pool);
  const row = await checkRow(pool, (b.row ?? b) as ProxyInput, ctx, null);
  if (b.mode !== 'save') return { row };
  if (!row.ok) return { row, saved: false };
  const out = await saveChecked(pool, s, row);
  const sms = out.proId && b.sendSms !== false ? await sendConfirm(out.proId, actorOf(s)) : null;
  return { row, saved: !!out.proId, proId: out.proId, error: out.error, sms };
}

/** 一次贴一张表：mode=preview 只解析检查；mode=save 写入能写的行（有问题的、同号已有的跳过） */
export async function proxyBatch(s: Staff, b: Record<string, unknown>) {
  const preview = await previewBatch(String(b.text ?? ''));
  if (b.mode !== 'save') return preview;
  if (b.confirm !== true) throw new CrmError('bad_request', '请先看预览，再点“确认写入”');
  const pool = getPool();
  const results: { line: number | null; name: string; saved: boolean; proId: string | null; error: string | null; sms: string | null }[] = [];
  for (const r of preview.rows) {
    if (!r.ok) { results.push({ line: r.line, name: r.data.name, saved: false, proId: null, error: r.action === 'duplicate' ? r.outcome : r.errors.join('；'), sms: null }); continue; }
    const out = await saveChecked(pool, s, r).catch((e) => ({ proId: null, error: e instanceof Error ? e.message.slice(0, 200) : '写入出错' }));
    const sms = out.proId && b.sendSms !== false ? (await sendConfirm(out.proId, actorOf(s)).catch(() => null))?.status ?? null : null;
    results.push({ line: r.line, name: r.data.name, saved: !!out.proId, proId: out.proId, error: out.error, sms });
  }
  return { ...preview, results, saved: results.filter((x) => x.saved).length };
}

// ── 确认短信 + 一次性确认链接 ─────────────────────────────────────────
function tokenSecret(): string {
  const s = process.env.NEWSLETTER_SECRET || process.env.CRON_SECRET || process.env.AGENT_IP_SALT || (process.env.VERCEL_ENV !== 'production' ? 'dev-local-only' : '');
  if (!s) throw new CrmError('server_error', '系统配置不完整，确认链接生成不了');
  return s;
}
const sign = (nonce: string) => createHmac('sha256', tokenSecret()).update(`jobs-proxy-confirm|${nonce}`).digest('base64url').slice(0, 16);
export const CONFIRM_DAYS = 30;
export const confirmPath = (token: string) => `${WEB_JOBS_PATH}/confirm/${token}`;

export function confirmSmsText(name: string, url: string): string {
  return `SAREC：商会帮你登记了「找工人·接活儿」的接活儿资料（${name}）。请点链接确认或修改：${url} 不是你本人或不想登记，也可以在链接里说一声。`;
}

/** 记录里的正文：链接令牌打码（/confirm/abc***），真发出去的是完整链接 */
export function maskBody(text: string): string {
  return text.replace(/(\/confirm\/)([A-Za-z0-9_-]{3})[A-Za-z0-9_.-]+/g, '$1$2***');
}
export const GATE_WHY_TEXT = {
  held: '发消息总闸关着：只记录，没有真发',
  blocked: '测试站只发给测试号码：只记录，没有真发'
} as const;

export const SMS_LABEL: Record<string, string> = {
  none: '未发', logged: '已记录待发', sent: '已发', failed: '发送失败', confirmed: '已确认', declined: '本人说不用登记'
};

/** 发（或重发）确认短信：每次换一个新令牌（旧链接作废），过发消息总闸 */
export async function sendConfirm(proId: string, actor: string) {
  const pool = getPool();
  const p = await proById(pool, proId);
  if (!p) throw new CrmError('not_found', '找不到这个接活人');
  const { rows: f } = await pool.query<{ proxy: boolean; confirmed: boolean }>(`SELECT proxy_by IS NOT NULL AS proxy, self_confirmed_at IS NOT NULL AS confirmed FROM jobs_pros WHERE id = $1`, [proId]);
  if (!f[0]?.proxy) throw new CrmError('bad_request', '这个人是自己登记的，不用发确认短信');
  if (f[0].confirmed) return { status: 'confirmed', label: SMS_LABEL.confirmed, why: null, text: null };
  const phone = await anyPhone(pool, p.contact_id);
  if (!phone) throw new CrmError('bad_request', '这个人没有手机号，发不了确认短信');
  const nonce = randomBytes(12).toString('base64url');
  const token = `${nonce}.${sign(nonce)}`;
  await pool.query(`UPDATE jobs_pros SET confirm_nonce = $2, confirm_nonce_at = now() WHERE id = $1`, [proId, nonce]);
  const text = confirmSmsText(p.name, `${webBase()}${confirmPath(token)}`);
  const g = await gateSend(
    { channel: 'sms', to: phone, kind: '代登记确认短信', text: maskBody(text), ref: `jobs_pro:${proId}` },
    async () => { if (!(await smsSend(phone, text))) throw new Error('sms_not_sent'); }
  );
  const status: 'logged' | 'sent' | 'failed' = g.status === 'sent' ? 'sent' : g.status === 'failed' ? 'failed' : 'logged';
  const why = g.status === 'held' ? GATE_WHY_TEXT.held : g.status === 'blocked' ? GATE_WHY_TEXT.blocked : null;
  await pool.query(`UPDATE jobs_pros SET confirm_sms_status = $2, confirm_sms_at = now() WHERE id = $1`, [proId, status]);
  await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id, reason) VALUES ($1, 'jobs_proxy_sms', 'jobs_pro', $2, $3)`, [actor, proId, g.status]).catch(() => undefined);
  return { status, label: SMS_LABEL[status], why, to: maskPhone(phone), text: maskBody(text) };
}

export async function sendConfirmMany(s: Staff, b: Record<string, unknown>) {
  const pool = getPool();
  let ids = (Array.isArray(b.ids) ? b.ids : []).filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 200);
  if (b.pending === true) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM jobs_pros WHERE proxy_by IS NOT NULL AND self_confirmed_at IS NULL AND self_declined_at IS NULL AND coalesce(confirm_sms_status, 'none') IN ('none', 'logged', 'failed') ORDER BY proxy_at LIMIT 200`
    );
    ids = rows.map((r) => r.id);
  }
  if (!ids.length) throw new CrmError('bad_request', '没有要发的');
  const out = { total: ids.length, sent: 0, logged: 0, failed: 0, skipped: 0 };
  for (const id of ids) {
    const r = await sendConfirm(id, actorOf(s)).catch(() => null);
    if (!r || r.status === 'confirmed') out.skipped++;
    else if (r.status === 'sent') out.sent++;
    else if (r.status === 'logged') out.logged++;
    else out.failed++;
  }
  return { ...out, live: await gateLiveNow() };
}

/** 正式站看总闸；测试站 / 本机不看总闸、只发测试号码（B 的 gateSend 规则），这里按“没真发给真人”算 false */
async function gateLiveNow(): Promise<boolean> {
  return isProduction() ? notifyLive() : false;
}

async function proByToken(token: string) {
  const [nonce, sig] = String(token ?? '').split('.');
  if (!nonce || !sig || nonce.length > 40) return null;
  const want = Buffer.from(sign(nonce));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT id FROM jobs_pros WHERE confirm_nonce = $1 AND confirm_nonce_at > now() - make_interval(days => $2)`,
    [nonce, CONFIRM_DAYS]
  );
  return rows[0] ? proById(getPool(), rows[0].id) : null;
}
export const LINK_USED_TEXT = '这个链接已经用过或已失效。要看或改接活儿资料，请用登记的手机号登录「我的接活儿」。';

/** 确认页（不用登录）：给本人看商会帮他登记的资料 */
export async function confirmView(token: string) {
  const p = await proByToken(token);
  if (!p) throw new CrmError('not_found', LINK_USED_TEXT);
  const pool = getPool();
  const trades = await tradeMap(pool);
  const cities = new Map((await loadCities(pool, { all: true })).map((c) => [c.key, c.name]));
  const { rows } = await pool.query<{ business_reg_no: string | null }>(`SELECT business_reg_no FROM jobs_pros WHERE id = $1`, [p.id]);
  const phone = await anyPhone(pool, p.contact_id);
  return {
    pro: {
      name: p.name, roleLabel: roleLabel(p.role), trades: p.trades.map((k) => trades.get(k)?.name ?? k), cities: p.cities.map((k) => cities.get(k) ?? k),
      years: p.years, licenseNo: p.license_no, businessRegNo: rows[0]?.business_reg_no ?? null, intro: p.intro, statusLabel: PRO_STATUS_LABEL[p.status]
    },
    phoneMasked: phone ? maskPhone(phone) : null,
    rules: RULES,
    editUrl: `${WEB_JOBS_PATH}/register`,
    editHint: `要改的话：点“我要修改”，用${phone ? `手机号 ${maskPhone(phone)}` : '登记的手机号'}收验证码登录，资料会自动带进登记页，改好提交就行。`
  };
}

export async function confirmAction(token: string, action: unknown) {
  const p = await proByToken(token);
  if (!p) throw new CrmError('not_found', LINK_USED_TEXT);
  const pool = getPool();
  if (action === 'confirm') {
    await pool.query(
      `UPDATE jobs_pros SET self_confirmed_at = now(), self_confirm_via = 'link', agreed_at = coalesce(agreed_at, now()), confirm_nonce = NULL, updated_at = now() WHERE id = $1`,
      [p.id]
    );
    await refreshPro(pool, p.id);
    await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id) VALUES ('self:confirm_link', 'jobs_proxy_confirmed', 'jobs_pro', $1)`, [p.id]);
    return { confirmed: true, message: '谢谢，已确认。以后有对口的活儿会通知你；资料要改，用登记的手机号登录「我的接活儿」。' };
  }
  if (action === 'decline') {
    await pool.query(
      `UPDATE jobs_pros SET self_declined_at = now(), status = 'removed', removed_reason = '本人说不用登记（确认链接里点的）', listed = false, confirm_nonce = NULL, updated_at = now() WHERE id = $1`,
      [p.id]
    );
    await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id) VALUES ('self:confirm_link', 'jobs_proxy_declined', 'jobs_pro', $1)`, [p.id]);
    const { recordException } = await import('@/lib/crm/followups');
    await recordException('jobs_verify', `jobs_proxy_declined:${p.id}`, p.id, `商会代登记的接活人「${p.name}」本人说不用登记，已从列表撤下`, { proId: p.id }).catch(() => undefined);
    return { confirmed: false, declined: true, message: '好的，已撤下，不会出现在找工人列表里。以后想登记，可以自己在「登记接活儿」里登记。' };
  }
  throw new CrmError('bad_request', '请点“没问题，确认”或“不是我 / 不用登记”');
}

// ── 后台列表和设置 ─────────────────────────────────────────────────────
export async function proxyList() {
  const pool = getPool();
  const trades = await tradeMap(pool);
  const cities = new Map((await loadCities(pool, { all: true })).map((c) => [c.key, c.name]));
  const { rows } = await pool.query<{
    id: string; name: string; role: string; status: keyof typeof PRO_STATUS_LABEL; listed: boolean; trades: string[]; cities: string[]; license_no: string | null;
    business_reg_no: string | null; proxy_by: string; proxy_at: Date; self_confirmed_at: Date | null; self_confirm_via: string | null; self_declined_at: Date | null;
    confirm_sms_status: string | null; confirm_sms_at: Date | null; phone: string | null; needs_review: boolean;
  }>(
    `SELECT p.id, p.name, p.role, p.status, p.listed, p.trades, p.cities, p.license_no, p.business_reg_no, p.proxy_by, p.proxy_at, p.self_confirmed_at, p.self_confirm_via,
            p.self_declined_at, p.confirm_sms_status, p.confirm_sms_at, p.needs_review, c.phone_e164 AS phone
       FROM jobs_pros p JOIN contacts c ON c.id = p.contact_id WHERE p.proxy_by IS NOT NULL ORDER BY p.proxy_at DESC LIMIT 500`
  );
  const items = rows.map((r) => {
    const sms = r.self_confirmed_at ? 'confirmed' : r.self_declined_at ? 'declined' : r.confirm_sms_status ?? 'none';
    return {
      id: r.id, name: r.name, roleLabel: roleLabel(r.role), phone: r.phone, status: r.status, statusLabel: PRO_STATUS_LABEL[r.status], needsReview: r.needs_review, listed: r.listed,
      trades: r.trades.map((k) => trades.get(k)?.name ?? k), cities: r.cities.map((k) => cities.get(k) ?? k), licenseNo: r.license_no, businessRegNo: r.business_reg_no,
      proxyBy: r.proxy_by.replace(/^staff:/, ''), proxyAt: r.proxy_at, sms, smsLabel: SMS_LABEL[sms] ?? sms, smsAt: r.confirm_sms_at,
      confirmedAt: r.self_confirmed_at, confirmedVia: r.self_confirm_via === 'edit' ? '本人登录改过资料' : r.self_confirm_via === 'link' ? '点了确认链接' : null
    };
  });
  return {
    items,
    settings: { notifyLive: await gateLiveNow(), testSite: !isProduction(), listBeforeConfirm: await proxyListBeforeConfirm(pool) },
    columns: PROXY_COLUMNS, header: PROXY_HEADER, sample: PROXY_SAMPLE, help: PROXY_HELP,
    smsTemplate: confirmSmsText('师傅名称', `${webBase()}${WEB_JOBS_PATH}/confirm/（一次性链接）`),
    roles: PRO_ROLES
  };
}

export async function setProxySettings(s: Staff, b: Record<string, unknown>) {
  if (typeof b.listBeforeConfirm !== 'boolean') throw new CrmError('bad_request', '请选：没确认前上不上列表');
  const pool = getPool();
  const before = await proxyListBeforeConfirm(pool);
  if (before !== b.listBeforeConfirm) {
    const { setSetting } = await import('@/lib/crm/orders');
    await setSetting(pool, PROXY_LIST_KEY, b.listBeforeConfirm, actorOf(s));
    await pool.query(
      `INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value) VALUES ($1, 'jobs_switch', 'setting', $2, $3, $4)`,
      [actorOf(s), PROXY_LIST_KEY, JSON.stringify(before), JSON.stringify(b.listBeforeConfirm)]
    );
    await refreshAllListed();
  }
  return { listBeforeConfirm: b.listBeforeConfirm };
}
