/**
 * 1.5.0 群发和按条件选人（东哥 11/13 点头的默认方案；11/14 第二批工作令）
 * - 条件是活的：城市 / 地区、行业、会员 / 注册用户、参加过哪场、到场次数、俱乐部、标签、来源渠道、年龄段、性别（选填），
 *   再加上资料题库里所有“单选 / 多选”题——以后加了新的资料题，自动成为可选条件。任意组合（条件之间“并且”，同一条件里多选“或者”）。
 * - 渠道如实显示：短信能发几个（有手机号的）、邮件几个（只算验证过邮箱、没退订的）、微信服务通知几个（只算点过“允许通知”、还没用掉的）。
 * - 流程固定三步：选人 → 写内容 → 先发一条给东哥本人预览 → 东哥点「确认群发」才发出。短信确认前显示预计条数和费用。
 * - **这一版一律演练**：只记录“本来会发给谁”，不调用任何发送接口（测试站永远演练；正式站群发按钮默认关，等东哥说开）。
 *   真正发送的代码这一版没有写——东哥说开以后再接，接之前再测。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import { getSetting } from './orders';
import { QUESTIONS } from './questionBank';
import { REGIONS } from './regions';
import type { Staff } from './auth';

export const AGE_RANGES = ['30 岁以下', '30–39 岁', '40–49 岁', '50–59 岁', '60 岁及以上'];
export const GENDERS = ['男', '女'];

export type Cond = { field: string; values: string[] };
export type Filters = { conds: Cond[] };

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
  const parts: string[] = [`c.merged_into IS NULL`, `NOT coalesce(c.is_placeholder, false)`];
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
export async function createBroadcast(s: Staff, b: { filters: Filters; excluded?: string[]; channels: string[]; content: Record<string, string> }) {
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

/** 现在是不是演练：测试站 / 本地永远演练；正式站要东哥在设置里打开“群发真发”（这一版没写真发，打开了也只演练并提示） */
export async function isDryRun(): Promise<boolean> {
  if (process.env.VERCEL_ENV !== 'production') return true;
  // 这一版没有写真发：正式站也一律演练（东哥说开以后再接真发送）
  return true;
}

/** 第三步：先发一条给东哥本人预览（演练：只记录） */
export async function previewToOwner(s: Staff, id: string) {
  const b = await getBroadcast(id);
  if (b.status === 'sent') throw new CrmError('bad_request', '这次已经发过了');
  const ownerNo = await getSetting<number | null>(getPool(), 'broadcast_preview_member_no', null);
  const { rows } = ownerNo ? await getPool().query<{ id: string; name: string }>(`SELECT id, name FROM contacts WHERE member_no = $1`, [ownerNo]) : { rows: [] as { id: string; name: string }[] };
  await getPool().query(`UPDATE broadcasts SET status = 'previewed', previewed_at = now() WHERE id = $1`, [id]);
  const to = rows[0]?.name ? `东哥本人（${rows[0].name}）` : `点按钮的您（${s.name || s.email}）——还没指定固定的预览人`;
  return { message: `演练：预览本来会发给${to}（${(b.channels as string[]).map((c) => ({ sms: '短信', email: '邮件', wechat: '微信服务通知' }[c])).join('、')} 各一条）。现在没有真的发出。东哥看过后再点「确认群发」。` };
}

/** 确认群发：必须先预览过；演练模式只把“本来会发给谁”写进记录 */
export async function confirmBroadcast(s: Staff, id: string) {
  if (!s.roles.includes('admin')) throw new CrmError('forbidden', '只有管理员能确认群发');
  const b = await getBroadcast(id);
  if (b.status === 'draft') throw new CrmError('bad_request', '先发一条预览给东哥本人看过，再确认群发');
  if (b.status === 'sent') throw new CrmError('bad_request', '这次已经确认过了');
  const params: unknown[] = [];
  const w = where(b.filters as Filters, params);
  params.push(b.excluded);
  const pool = getPool();
  const results: Record<string, { would: number; skipped: number }> = {};
  for (const ch of b.channels as string[]) {
    const ok =
      ch === 'sms' ? `c.phone_e164 IS NOT NULL`
      : ch === 'email' ? `c.email IS NOT NULL AND c.email_verified_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email) = lower(c.email))`
      : `EXISTS (SELECT 1 FROM event_reminder_subs x WHERE x.contact_id = c.id AND x.status = 'pending')`;
    const { rows } = await pool.query<{ n: number; skipped: number }>(
      `WITH a AS (SELECT c.id, (${ok}) AS can FROM contacts c WHERE ${w} AND NOT (c.id = ANY($${params.length}::uuid[]))),
            ins AS (INSERT INTO broadcast_recipients (broadcast_id, contact_id, channel, result)
                    SELECT $${params.length + 1}::uuid, a.id, $${params.length + 2}, CASE WHEN a.can THEN 'dry_run' ELSE 'unreachable' END FROM a
                    ON CONFLICT DO NOTHING RETURNING result)
       SELECT count(*) FILTER (WHERE result = 'dry_run')::int AS n, count(*) FILTER (WHERE result = 'unreachable')::int AS skipped FROM ins`,
      [...params, id, ch]
    );
    results[ch] = { would: rows[0].n, skipped: rows[0].skipped };
  }
  await pool.query(`UPDATE broadcasts SET status = 'sent', confirmed_by = $2, confirmed_at = now(), dry_run = true, counts = counts || $3::jsonb WHERE id = $1`, [id, s.name || s.email, JSON.stringify({ result: results })]);
  return { dryRun: true, results, message: '演练完成：没有真的发出任何消息。"本来会发给谁"已记在这次群发的记录里。' };
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
