/**
 * 1.5.0 群发和按条件选人（东哥 11/13 点头的默认方案；11/14 第二批工作令）
 * - 条件是活的：城市 / 地区、行业、会员 / 注册用户、参加过哪场、到场次数、俱乐部、标签、来源渠道、年龄段、性别（选填），
 *   再加上资料题库里所有“单选 / 多选”题——以后加了新的资料题，自动成为可选条件。任意组合（条件之间“并且”，同一条件里多选“或者”）。
 * - 渠道如实显示：短信能发几个（有手机号的）、邮件几个（只算验证过邮箱、没退订的）、微信服务通知几个（只算点过“允许通知”、还没用掉的）。
 * - 流程固定三步：选人 → 写内容 → 先发一条给东哥本人预览 → 东哥点「确认群发」才发出。短信确认前显示预计条数和费用。
 * - 1.5.0 体验1（合并后台综合优化）：短信、邮件的真发送一律过总闸（lib/crm/notifySend.ts 的 gatedSend → notifyGate）：
 *   · 正式站：先看 crm_settings.broadcast_live（群发真发，默认没有 = 关 = 演练，只记录“本来会发给谁”）；
 *     打开了也还要过总闸 notify_live——总闸关着只记“本来要发什么”（held），一条不发。两个都要东哥点头才开。
 *   · 测试站 / 本机：走总闸，只发给测试身份（邮件白名单、555-01xx 等测试号），其他人记 blocked。
 *   · 微信服务通知这一版仍只记录（没有接订阅消息发送）。
 *   · 正式站选人时排除审核演示账号和测试账号（内部账号照常能收）。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import { getSetting } from './orders';
import { QUESTIONS } from './questionBank';
import { REGIONS } from './regions';
import type { Staff } from './auth';
import { isProduction } from '@/lib/email/resend-client';
import { gatedSend } from './notifySend';

export const AGE_RANGES = ['30 岁以下', '30–39 岁', '40–49 岁', '50–59 岁', '60 岁及以上'];
export const GENDERS = ['男', '女'];

export type Cond = { field: string; values: string[] };
export type Filters = { conds: Cond[]; audience?: 'all' };

/**
 * 安全（测试窗口 11/21）：条件为空的群发 = 所有人。服务器只认“真有用的条件”（认识的字段 + 至少选了一个值）；
 * 一个都没有时，必须明确 audience = 'all'（页面上勾「发给全体」并二次确认人数）才放行。
 */
const KNOWN_FIELDS = new Set(['region', 'industry', 'member', 'attended', 'attend_count', 'club', 'tag', 'channel', 'age_range', 'gender']);
export function usefulConds(f: Filters | null | undefined): Cond[] {
  return (f?.conds ?? []).filter(
    (c) => c && (KNOWN_FIELDS.has(c.field) || /^q:[A-Z0-9:]+$/.test(String(c.field))) && (c.values ?? []).map(String).filter(Boolean).length > 0
  );
}
export function assertAudience(f: Filters | null | undefined): void {
  if (usefulConds(f).length) return;
  if (f?.audience === 'all') return;
  throw new CrmError('audience_required', '没有设任何条件，等于发给所有人。请至少选一个条件；真要发给全体，请勾选「发给全体」并确认人数。');
}

type FieldDef = { key: string; label: string; options: { value: string; label: string }[]; multi: boolean; hint?: string };

/** 条件目录：固定的 + 题库里的单选 / 多选题（自动） */
export async function conditionCatalog(): Promise<FieldDef[]> {
  const pool = getPool();
  const q = async <T extends Record<string, unknown>>(sql: string): Promise<T[]> => (await pool.query<T>(sql).catch(() => ({ rows: [] as T[] }))).rows;
  const events = await q<{ id: string; title: string; d: string }>(`SELECT id, title, to_char(starts_at, 'YYYY-MM-DD') AS d FROM events WHERE starts_at < now() + interval '60 days' ORDER BY starts_at DESC LIMIT 60`);
  const clubs = await q<{ key: string; name: string }>(`SELECT key, name FROM clubs WHERE closed_at IS NULL ORDER BY sort_order`);
  const tags = await q<{ tag: string }>(`SELECT tag FROM contact_tags GROUP BY tag ORDER BY count(*) DESC LIMIT 60`);
  const channels = await q<{ ch: string }>(`SELECT COALESCE(first_channel, acquisition_source) AS ch FROM contacts WHERE COALESCE(first_channel, acquisition_source) IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC LIMIT 40`);
  const industries = await q<{ v: string }>(`SELECT DISTINCT value->>'choice' AS v FROM profile_answers WHERE item_code = 'CK:profession' AND status = 'current' AND value->>'choice' IS NOT NULL ORDER BY 1 LIMIT 40`);
  const opt = (xs: string[]) => xs.map((v) => ({ value: v, label: v }));
  const fixed: FieldDef[] = [
    { key: 'region', label: '城市 / 地区', options: opt([...REGIONS]), multi: true },
    { key: 'industry', label: '行业', options: opt(industries.map((x) => x.v)), multi: true, hint: '签到时选的职业 / 名片上的行业' },
    { key: 'member', label: '会员 / 注册用户', options: [{ value: 'member', label: '缴费会员' }, { value: 'registered', label: '注册用户' }], multi: false },
    { key: 'attended', label: '参加过哪场', options: events.map((e) => ({ value: e.id, label: `${e.d} ${e.title}` })), multi: true, hint: '到场签到过的' },
    { key: 'attend_count', label: '到场次数（至少）', options: ['1', '2', '3', '5', '10'].map((v) => ({ value: v, label: `${v} 次及以上` })), multi: false },
    { key: 'club', label: '俱乐部', options: clubs.map((c) => ({ value: c.key, label: c.name })), multi: true },
    { key: 'tag', label: '标签', options: opt(tags.map((t) => t.tag)), multi: true },
    { key: 'channel', label: '来源渠道', options: opt(channels.map((c) => c.ch)), multi: true },
    { key: 'age_range', label: '年龄段（选填项）', options: opt(AGE_RANGES), multi: true, hint: '只算填了的人' },
    { key: 'gender', label: '性别（选填项）', options: opt(GENDERS), multi: true, hint: '只算填了的人' }
  ];
  // 题库里的单选 / 多选题自动变成条件（以后加了新题，这里自动多一个）
  const dyn: FieldDef[] = QUESTIONS.filter((x) => (x.input === 'single' || x.input === 'multi') && Array.isArray(x.options) && x.options.length > 1).map((x) => ({
    key: 'q:' + x.code, label: '资料：' + x.prompt.replace(/[？?（(].*$/, ''), options: opt(x.options as string[]), multi: true
  }));
  return [...fixed, ...dyn];
}

/** 把条件变成 SQL（参数化，不拼用户输入） */
function where(f: Filters, params: unknown[]): string {
  // 1.6.0：「主办方的客人」（只通过别的主办方的活动来过的人）任何时候都不进商会群发（方案 11/23 修正 第 5 条）
  const parts: string[] = [`c.merged_into IS NULL`, `NOT coalesce(c.is_placeholder, false)`, `c.org_guest_since IS NULL`];
  // 后台综合优化 八：正式站群发不发给审核演示账号、测试账号（内部账号照常能收）
  if (isProduction()) parts.push(`coalesce(c.account_kind, '') NOT IN ('review_demo', 'test')`);
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
  for (const cond of f.conds ?? []) {
    const vals = (cond.values ?? []).map(String).filter(Boolean);
    if (!vals.length) continue;
    switch (cond.field) {
      case 'region': parts.push(`coalesce(c.region_self, c.region_inferred) = ANY(${p(vals)}::text[])`); break;
      case 'industry': parts.push(`(EXISTS (SELECT 1 FROM profile_answers a WHERE a.contact_id = c.id AND a.item_code = 'CK:profession' AND a.status = 'current' AND a.value->>'choice' = ANY(${p(vals)}::text[]))
                                  OR EXISTS (SELECT 1 FROM member_cards m WHERE m.contact_id = c.id AND m.industry = ANY(${p(vals)}::text[])))`); break;
      case 'member': {
        const active = `EXISTS (SELECT 1 FROM applications ap WHERE ap.contact_id = c.id AND ap.membership_end_date >= current_date
                          AND (ap.application_status IN ('approved','paid','second_payment_due') OR (ap.application_status = 'under_review' AND ap.payment_status IN ('paid','partially_paid'))))`;
        parts.push(vals[0] === 'member' ? active : `NOT ${active}`);
        break;
      }
      case 'attended': parts.push(`EXISTS (SELECT 1 FROM registrations r WHERE r.contact_id = c.id AND r.arrival_status = 'checked_in' AND r.event_id::text = ANY(${p(vals)}::text[]))`); break;
      case 'attend_count': parts.push(`(SELECT count(*) FROM registrations r WHERE r.contact_id = c.id AND r.arrival_status = 'checked_in') >= ${p(Number(vals[0]) || 1)}`); break;
      case 'club': parts.push(`EXISTS (SELECT 1 FROM club_members cm JOIN clubs cl ON cl.id = cm.club_id WHERE cm.contact_id = c.id AND cm.left_at IS NULL AND cl.key = ANY(${p(vals)}::text[]))`); break;
      case 'tag': parts.push(`EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag = ANY(${p(vals)}::text[]))`); break;
      case 'channel': parts.push(`coalesce(c.first_channel, c.acquisition_source) = ANY(${p(vals)}::text[])`); break;
      case 'age_range': parts.push(`c.age_range = ANY(${p(vals)}::text[])`); break;
      case 'gender': parts.push(`c.gender = ANY(${p(vals)}::text[])`); break;
      default:
        if (/^q:[A-Z0-9:]+$/.test(cond.field)) {
          const code = cond.field.slice(2);
          parts.push(`EXISTS (SELECT 1 FROM profile_answers a WHERE a.contact_id = c.id AND a.item_code = ${p(code)} AND a.status = 'current'
                       AND (a.value->>'choice' = ANY(${p(vals)}::text[]) OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(coalesce(a.value->'choices', '[]'::jsonb)) x WHERE x = ANY(${p(vals)}::text[]))))`);
        }
    }
  }
  return parts.join(' AND ');
}

/** 选人：人数、每个渠道能发到几个、名单（前 300）。excluded = 手动去掉的人 */
export async function previewAudience(f: Filters, excluded: string[] = []) {
  const pool = getPool();
  const params: unknown[] = [];
  const w = where(f, params);
  params.push(excluded.filter((x) => /^[0-9a-f-]{36}$/.test(x)));
  const ex = `$${params.length}`;
  const base = `FROM contacts c WHERE ${w} AND NOT (c.id = ANY(${ex}::uuid[]))`;
  const { rows: cnt } = await pool.query<{ total: number; sms: number; email: number; wechat: number; sms_cn: number }>(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE c.phone_e164 IS NOT NULL)::int AS sms,
            count(*) FILTER (WHERE c.phone_e164 LIKE '+86%')::int AS sms_cn,
            count(*) FILTER (WHERE c.email IS NOT NULL AND c.email_verified_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email) = lower(c.email)))::int AS email,
            count(*) FILTER (WHERE EXISTS (SELECT 1 FROM event_reminder_subs s WHERE s.contact_id = c.id AND s.status = 'pending'))::int AS wechat
       ${base}`,
    params
  );
  const { rows: list } = await pool.query<{ id: string; name: string | null; member_no: number; region: string | null; phone: boolean; email: boolean }>(
    `SELECT c.id, NULLIF(c.name, '微信用户') AS name, c.member_no::int AS member_no, coalesce(c.region_self, c.region_inferred) AS region,
            c.phone_e164 IS NOT NULL AS phone, (c.email IS NOT NULL AND c.email_verified_at IS NOT NULL) AS email
       ${base} ORDER BY c.created_at DESC LIMIT 300`,
    params
  );
  const k = cnt[0];
  return {
    total: k.total,
    reach: {
      sms: { n: k.sms, note: '有手机号的人；短信按条收费' },
      email: { n: k.email, note: '只算验证过邮箱、没退订的' },
      wechat: { n: k.wechat, note: '只算点过“允许通知”、还没用掉的；每次允许只能发一条' }
    },
    smsCn: k.sms_cn,
    list
  };
}

/** 短信预计费用（只在后台显示，不进小程序）：美国约 $0.0083 / 条，中国约 $0.05 / 条（Twilio 公开价，可在设置里改） */
export async function smsEstimate(f: Filters, excluded: string[], text: string) {
  const a = await previewAudience(f, excluded);
  const segs = Math.max(1, Math.ceil(Array.from(text).length / 70));
  const pool = getPool();
  const us = Number(await getSetting(pool, 'sms_unit_usd_us', 0.0083)) || 0.0083;
  const cn = Number(await getSetting(pool, 'sms_unit_usd_cn', 0.05)) || 0.05;
  const usN = a.reach.sms.n - a.smsCn;
  return { people: a.reach.sms.n, segments: segs, messages: a.reach.sms.n * segs, usd: Math.round((usN * us + a.smsCn * cn) * segs * 100) / 100 };
}

export async function saveAudience(s: Staff, name: string, f: Filters) {
  const n = name.trim().slice(0, 30);
  if (!n) throw new CrmError('bad_request', '给这个人群起个名字');
  await getPool().query(`INSERT INTO broadcast_audiences (name, filters, created_by) VALUES ($1, $2::jsonb, $3)`, [n, JSON.stringify(f), s.name || s.email]);
  return { message: `已存为常用人群「${n}」` };
}

export async function listAudiences() {
  const { rows } = await getPool().query(`SELECT id, name, filters, created_by, created_at FROM broadcast_audiences ORDER BY created_at DESC LIMIT 50`);
  return rows;
}

const CHANNELS = ['sms', 'email', 'wechat'];

/** 第二步：写内容，存成草稿 */
export async function createBroadcast(s: Staff, b: { filters: Filters; excluded?: string[]; channels: string[]; content: Record<string, string>; audience?: string }) {
  // 只存有用的条件；没有条件时必须明确 audience = 'all'
  const filters: Filters = { conds: usefulConds(b.filters), ...(b.audience === 'all' && !usefulConds(b.filters).length ? { audience: 'all' as const } : {}) };
  assertAudience(filters);
  b = { ...b, filters };
  const channels = (b.channels ?? []).filter((c) => CHANNELS.includes(c));
  if (!channels.length) throw new CrmError('bad_request', '至少选一个渠道');
  const content: Record<string, string> = {};
  if (channels.includes('sms')) { content.sms = String(b.content?.sms ?? '').trim().slice(0, 300); if (!content.sms) throw new CrmError('bad_request', '短信内容没写'); }
  if (channels.includes('email')) {
    content.emailSubject = String(b.content?.emailSubject ?? '').trim().slice(0, 80);
    content.emailBody = String(b.content?.emailBody ?? '').trim().slice(0, 5000);
    if (!content.emailSubject || !content.emailBody) throw new CrmError('bad_request', '邮件标题和正文都要写');
  }
  if (channels.includes('wechat')) { content.wechat = String(b.content?.wechat ?? '').trim().slice(0, 20); if (!content.wechat) throw new CrmError('bad_request', '微信服务通知要填一句（模板里的“备注”，20 字以内）'); }
  const a = await previewAudience(b.filters, b.excluded ?? []);
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO broadcasts (filters, excluded, channels, content, counts, created_by, dry_run) VALUES ($1::jsonb, $2::uuid[], $3, $4::jsonb, $5::jsonb, $6, true) RETURNING id`,
    [JSON.stringify(b.filters), (b.excluded ?? []).filter((x) => /^[0-9a-f-]{36}$/.test(x)), channels, JSON.stringify(content),
      JSON.stringify({ total: a.total, sms: a.reach.sms.n, email: a.reach.email.n, wechat: a.reach.wechat.n }), s.name || s.email]
  );
  return { id: rows[0].id, total: a.total };
}

/**
 * 群发怎么发：
 *   dry_run —— 演练：只记录“本来会发给谁”（正式站 broadcast_live 没打开时）
 *   gated   —— 过总闸发（正式站 broadcast_live 打开后再看 notify_live；测试站 / 本机只发测试身份）
 */
export async function broadcastMode(): Promise<'dry_run' | 'gated'> {
  if (!isProduction()) return 'gated';
  const v = await getSetting<unknown>(getPool(), 'broadcast_live', false);
  return v === true || v === 'true' ? 'gated' : 'dry_run';
}
export async function isDryRun(): Promise<boolean> {
  return (await broadcastMode()) === 'dry_run';
}
/** 页面上的一句说明：现在按了会怎样 */
export async function gateNote(): Promise<string> {
  if (!isProduction()) return '测试站：确认后过通知总闸，只真发给测试身份（测试邮箱、555-01xx 测试号），其他人只记录"本来会发"。';
  if (await isDryRun()) return '';
  const { notifyLive } = await import('./notifyGate');
  return (await notifyLive()) ? '群发真发已打开，通知总闸也开着：确认后会真的发出短信和邮件。' : '群发真发已打开，但通知总闸关着：确认后只记录"本来要发什么"，一条不发。';
}

const CH_LABEL: Record<string, string> = { sms: '短信', email: '邮件', wechat: '微信服务通知' };
const STATUS_LABEL: Record<string, string> = { sent: '已发出', held: '总闸关着只记录', blocked: '测试站只发测试身份，只记录', failed: '没发出去', duplicate: '已经发过' };

async function emailText(body: string, to: string): Promise<string> {
  let foot = '\n\n——\n南加州华人房地产商会（SAREC）';
  try {
    // 和邮件通讯同一个退订（没配密钥时不带链接，测试站常见）
    const { unsubUrl } = await import('./newsletter');
    foot += `\n不想再收到商会邮件：${unsubUrl(to)}`;
  } catch {
    /* 没有退订密钥就不带 */
  }
  return body + foot;
}

/** 发一条（过总闸）。返回总闸状态 */
async function sendOne(ch: string, to: string, content: Record<string, string>, ref: string, dedupe: string): Promise<string> {
  if (ch === 'sms') return (await gatedSend({ channel: 'sms', to, kind: '群发', text: content.sms, ref, dedupeKey: dedupe })).status;
  if (ch === 'email') return (await gatedSend({ channel: 'email', to, kind: '群发', subject: content.emailSubject, text: await emailText(content.emailBody, to), ref, dedupeKey: dedupe })).status;
  return 'dry_run';
}

/** 第三步：先发一条给东哥本人预览。演练：只记录；过总闸时真发给预览人（总闸 / 测试站规则照样管） */
export async function previewToOwner(s: Staff, id: string) {
  const b = await getBroadcast(id);
  if (b.status === 'sent') throw new CrmError('bad_request', '这次已经发过了');
  const ownerNo = await getSetting<number | null>(getPool(), 'broadcast_preview_member_no', null);
  const { rows } = ownerNo
    ? await getPool().query<{ id: string; name: string; phone: string | null; email: string | null }>(`SELECT id, name, phone_e164 AS phone, email FROM contacts WHERE member_no = $1`, [ownerNo])
    : { rows: [] as { id: string; name: string; phone: string | null; email: string | null }[] };
  await getPool().query(`UPDATE broadcasts SET status = 'previewed', previewed_at = now() WHERE id = $1`, [id]);
  const chs = (b.channels as string[]).map((c) => CH_LABEL[c]).join('、');
  const to = rows[0]?.name ? `东哥本人（${rows[0].name}）` : `点按钮的您（${s.name || s.email}）——还没指定固定的预览人`;
  if ((await broadcastMode()) === 'dry_run' || !rows[0]) {
    return { message: `演练：预览本来会发给${to}（${chs} 各一条）。现在没有真的发出。东哥看过后再点「确认群发」。` };
  }
  const done: string[] = [];
  for (const ch of b.channels as string[]) {
    const dest = ch === 'sms' ? rows[0].phone : ch === 'email' ? rows[0].email : null;
    if (!dest) {
      done.push(`${CH_LABEL[ch]}：${ch === 'wechat' ? '这一版只记录' : '预览人没有' + (ch === 'sms' ? '手机号' : '邮箱')}`);
      continue;
    }
    const st = await sendOne(ch, dest, b.content, id, `broadcast_preview:${id}:${ch}:${Date.now()}`);
    done.push(`${CH_LABEL[ch]}：${STATUS_LABEL[st] ?? st}`);
  }
  return { message: `预览发给${to}——${done.join('；')}。东哥看过后再点「确认群发」。` };
}

/** 确认群发：必须先预览过；演练只记“本来会发给谁”；过总闸时逐个发，每人每个渠道的结果记在这次群发的名单里 */
export async function confirmBroadcast(s: Staff, id: string) {
  if (!s.roles.includes('admin')) throw new CrmError('forbidden', '只有管理员能确认群发');
  const b = await getBroadcast(id);
  if (b.status === 'draft') throw new CrmError('bad_request', '先发一条预览给东哥本人看过，再确认群发');
  if (b.status === 'sent') throw new CrmError('bad_request', '这次已经确认过了');
  // 以前存下的草稿也再查一遍：没条件又没明确“发给全体”的不发
  assertAudience(b.filters as Filters);
  const mode = await broadcastMode();
  const params: unknown[] = [];
  const w = where(b.filters as Filters, params);
  params.push(b.excluded);
  const pool = getPool();
  const results: Record<string, { would: number; skipped: number; sent?: number; held?: number; failed?: number }> = {};
  for (const ch of b.channels as string[]) {
    const okSql =
      ch === 'sms' ? `c.phone_e164 IS NOT NULL`
      : ch === 'email' ? `c.email IS NOT NULL AND c.email_verified_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email) = lower(c.email))`
      : `EXISTS (SELECT 1 FROM event_reminder_subs x WHERE x.contact_id = c.id AND x.status = 'pending')`;
    const { rows } = await pool.query<{ n: number; skipped: number }>(
      `WITH a AS (SELECT c.id, (${okSql}) AS can FROM contacts c WHERE ${w} AND NOT (c.id = ANY($${params.length}::uuid[]))),
            ins AS (INSERT INTO broadcast_recipients (broadcast_id, contact_id, channel, result)
                    SELECT $${params.length + 1}::uuid, a.id, $${params.length + 2}, CASE WHEN a.can THEN 'dry_run' ELSE 'unreachable' END FROM a
                    ON CONFLICT DO NOTHING RETURNING result)
       SELECT count(*) FILTER (WHERE result = 'dry_run')::int AS n, count(*) FILTER (WHERE result = 'unreachable')::int AS skipped FROM ins`,
      [...params, id, ch]
    );
    results[ch] = { would: rows[0].n, skipped: rows[0].skipped };
    if (mode === 'gated' && (ch === 'sms' || ch === 'email')) {
      const { rows: list } = await pool.query<{ contact_id: string; dest: string | null }>(
        `SELECT r.contact_id, ${ch === 'sms' ? 'c.phone_e164' : 'c.email'} AS dest FROM broadcast_recipients r JOIN contacts c ON c.id = r.contact_id
          WHERE r.broadcast_id = $1 AND r.channel = $2 AND r.result = 'dry_run'`,
        [id, ch]
      );
      const tally = { sent: 0, held: 0, failed: 0 };
      for (const r of list) {
        if (!r.dest) continue;
        const st = await sendOne(ch, r.dest, b.content, id, `broadcast:${id}:${ch}:${r.contact_id}`);
        if (st === 'sent') tally.sent++;
        else if (st === 'failed') tally.failed++;
        else tally.held++;
        await pool.query(`UPDATE broadcast_recipients SET result = $4 WHERE broadcast_id = $1 AND contact_id = $2 AND channel = $3`, [id, r.contact_id, ch, st]);
      }
      Object.assign(results[ch], tally);
    }
  }
  const dry = mode === 'dry_run';
  await pool.query(`UPDATE broadcasts SET status = 'sent', confirmed_by = $2, confirmed_at = now(), dry_run = $4, counts = counts || $3::jsonb WHERE id = $1`, [id, s.name || s.email, JSON.stringify({ result: results }), dry]);
  if (dry) return { dryRun: true, results, message: '演练完成：没有真的发出任何消息。"本来会发给谁"已记在这次群发的记录里。' };
  const sum = (k: 'sent' | 'held' | 'failed') => Object.values(results).reduce((a, r) => a + (r[k] ?? 0), 0);
  return {
    dryRun: false,
    results,
    message: `已按通知总闸处理：真发出 ${sum('sent')} 条，只记录没发 ${sum('held')} 条（总闸关着，或测试站不是测试身份），没发出去 ${sum('failed')} 条。${(b.channels as string[]).includes('wechat') ? '微信服务通知这一版只记录。' : ''}每个人的结果在“看名单”里。`
  };
}

async function getBroadcast(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new CrmError('not_found', '找不到这次群发');
  const { rows } = await getPool().query(`SELECT * FROM broadcasts WHERE id = $1`, [id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这次群发');
  return rows[0] as { id: string; filters: unknown; excluded: string[]; channels: string[]; content: Record<string, string>; status: string };
}

export async function listBroadcasts() {
  const { rows } = await getPool().query(
    `SELECT id, channels, content, status, dry_run, counts, created_by, created_at, previewed_at, confirmed_by, confirmed_at FROM broadcasts ORDER BY created_at DESC LIMIT 50`
  );
  return rows;
}

export async function broadcastRecipients(id: string) {
  const { rows } = await getPool().query(
    `SELECT r.channel, r.result, NULLIF(c.name, '微信用户') AS name, c.member_no::int AS member_no FROM broadcast_recipients r JOIN contacts c ON c.id = r.contact_id
      WHERE r.broadcast_id = $1 ORDER BY r.channel, c.name LIMIT 1000`,
    [id]
  );
  return rows;
}
