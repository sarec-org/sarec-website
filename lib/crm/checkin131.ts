/**
 * 1.3.1 A：签到与注册一体（扫一次、填完就算到场，永远不要求扫第二个码）。
 *
 * 三条路，最后都到同一个欢迎页：
 *  - 系统不认识 → 新人一屏三项：手机号（微信一键填 / 手填 + 短信码）、姓名、职业（单选）。
 *  - 认识、资料还缺 → 先记到场，再弹 1–3 道选择题（按“档案缺什么”排序，题库在后台维护）。
 *  - 认识、资料齐 → 直接“欢迎光临”。
 *
 * “认识”= 这个微信登录对应的档案有姓名和手机号 / 邮箱，或者报过名、到过场（11/6 教训：认出来的人先记到场，
 * 题目答不答都不影响到场记录）。同一场重复扫码：不重复问、不重复签到、不重复计分。
 *
 * 身份（A4）：每人一个不变的内部编号（contacts.id）。新人验证过的手机号如果已经属于另一份档案，
 * 而当前这个微信登录还是空档案，就把这个微信登录挂到那份档案下面（merged_into），换发那份档案的会话；
 * 当前档案已有内容时不自动合并，记一条“疑似重复”给助理在工作台确认。
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { createSession } from '@/lib/crm/auth';
import { CrmError, checkIn, normalizePhone, startRegistration, type EventRow } from '@/lib/crm/events';
import { requireEvent } from '@/lib/crm/flow';
import { noteVerified, phoneSendLimits, promoteIdentity, setMethod, twilioVerify, twilioVerifyConfigured } from '@/lib/crm/contactInfo';
import { memberStatus } from '@/lib/crm/membership';
import { getSetting } from '@/lib/crm/orders';
import { withWxToken, wxConfigured } from '@/lib/crm/wechat';

type Db = { query: ReturnType<typeof getPool>['query'] };

export const ANSWER_POINTS = 5; // 补一项资料
export const TEXT_BONUS_POINTS = 5; // “愿意多写一点”手填的多给
export const MAX_QUESTIONS = 3;
export const PROFESSIONS = ['开发商', '经纪', '贷款', '投资人', '律师会计', '建筑装修', '其他'];
export const REGIONS = ['洛杉矶/橙县', '旧金山湾区', '纽约', '美国其他', '中国大陆', '其他'];

export type CheckinQuestion = { key: string; prompt: string; options: string[]; allowText: boolean };

export type Welcome = {
  kind: 'welcome';
  greetName: string | null;
  already: boolean; // 这一场之前已经签过
  points: number; // 这次扫码新得的积分（签到 + 答题）
  showJoin: boolean; // “了解入会”：非会员，同一场只出现一次
};

export type CheckinStep =
  | Welcome
  | { kind: 'new'; professions: string[]; phoneQuick: boolean; smsAvailable: boolean }
  | { kind: 'questions'; questions: CheckinQuestion[]; greetName: string | null; points: number }
  | { kind: 'pending_payment' | 'waitlisted' | 'rejected'; message: string };

/** 签到题库（后台维护）。 */
export async function activeQuestions(db: Db): Promise<CheckinQuestion[]> {
  const { rows } = await db.query<{ key: string; prompt: string; options: string[]; allow_text: boolean }>(
    `SELECT key, prompt, options, allow_text FROM checkin_questions WHERE is_active ORDER BY sort, key`
  );
  return rows.map((r) => ({ key: r.key, prompt: r.prompt, options: r.options, allowText: r.allow_text }));
}

const itemCode = (key: string) => `CK:${key}`;

/** 档案缺哪些题（常驻地区看 region_self；其他看签到题的回答）。 */
export async function missingQuestions(db: Db, contactId: string): Promise<CheckinQuestion[]> {
  const qs = await activeQuestions(db);
  const { rows } = await db.query<{ item_code: string }>(
    `SELECT DISTINCT item_code FROM profile_answers WHERE contact_id = $1 AND status = 'current' AND item_code LIKE 'CK:%'`,
    [contactId]
  );
  const have = new Set(rows.map((r) => r.item_code));
  const { rows: c } = await db.query<{ region_self: string | null }>(`SELECT region_self FROM contacts WHERE id = $1`, [contactId]);
  if (c[0]?.region_self) have.add(itemCode('region'));
  return qs.filter((q) => !have.has(itemCode(q.key)));
}

/** 这个微信登录对应的档案“认不认识”。 */
export async function recognized(db: Db, contactId: string, eventId: string): Promise<boolean> {
  const { rows } = await db.query<{ ok: boolean }>(
    `SELECT (
        (NULLIF(c.name, '微信用户') IS NOT NULL AND (c.phone_e164 IS NOT NULL OR c.email IS NOT NULL
           OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.is_current)))
        OR EXISTS (SELECT 1 FROM registrations r WHERE r.contact_id = c.id AND (r.event_id = $2 AND r.status <> 'cancelled' OR r.arrival_status = 'checked_in'))
      ) AS ok FROM contacts c WHERE c.id = $1`,
    [contactId, eventId]
  );
  return !!rows[0]?.ok;
}

async function greetName(db: Db, contactId: string): Promise<string | null> {
  const { rows } = await db.query<{ name: string | null }>(`SELECT NULLIF(name, '微信用户') AS name FROM contacts WHERE id = $1`, [contactId]);
  return (rows[0]?.name || '').trim().slice(0, 20) || null;
}

async function regOf(db: Db, eventId: string, contactId: string) {
  const { rows } = await db.query<{ id: string; ck_asked_at: Date | null; join_hint_at: Date | null; arrival_status: string }>(
    `SELECT id, ck_asked_at, join_hint_at, arrival_status FROM registrations WHERE event_id = $1 AND contact_id = $2`,
    [eventId, contactId]
  );
  return rows[0] ?? null;
}

/** 欢迎页（“了解入会”同一场只出现一次）。 */
async function welcome(db: Db, ev: EventRow, contactId: string, already: boolean, points: number): Promise<Welcome> {
  const ms = await memberStatus(db, contactId);
  let showJoin = false;
  if (!ms.isMember) {
    const { rows } = await db.query(
      `UPDATE registrations SET join_hint_at = now() WHERE event_id = $1 AND contact_id = $2 AND join_hint_at IS NULL RETURNING id`,
      [ev.id, contactId]
    );
    showJoin = !!rows[0];
  }
  return { kind: 'welcome', greetName: await greetName(db, contactId), already, points, showJoin };
}

/** 记到场（复用原来的入场判断：候补转正、收费活动找工作人员）。返回新得积分。 */
async function markArrived(db: Db, ev: EventRow, contactId: string) {
  const r = await checkIn(db, ev, contactId);
  return r;
}

/** 第一步：扫码。认得的人直接记到场；还缺资料就给 1–3 道题；不认得就要新人那一屏。 */
export async function scan(slug: string, contactId: string): Promise<CheckinStep> {
  return withTransaction(async (db) => {
    const ev = await requireEvent(db, slug);
    if (!(await recognized(db, contactId, ev.id))) {
      return { kind: 'new', professions: PROFESSIONS, phoneQuick: await phoneQuickOn(db), smsAvailable: twilioVerifyConfigured() };
    }
    return afterRecognized(db, ev, contactId);
  });
}

async function afterRecognized(db: Db, ev: EventRow, contactId: string, earned = 0): Promise<CheckinStep> {
  const r = await markArrived(db, ev, contactId);
  if (r.kind === 'pending_payment') return { kind: 'pending_payment', message: '本场为收费活动，请到门口找工作人员确认，确认后就能入场。' };
  if (r.kind === 'waitlisted') return { kind: 'waitlisted', message: '本场名额已满，您在候补名单里。请到门口找工作人员，有空位会马上为您安排。' };
  if (r.kind === 'rejected') return { kind: 'rejected', message: r.message };
  const points = earned + (r.kind === 'checked_in' ? await checkinPoints(db, contactId, ev.id) : 0);
  const reg = await regOf(db, ev.id, contactId);
  if (reg && !reg.ck_asked_at) {
    const qs = (await missingQuestions(db, contactId)).slice(0, MAX_QUESTIONS);
    await db.query(`UPDATE registrations SET ck_asked_at = now() WHERE id = $1`, [reg.id]);
    if (qs.length) return { kind: 'questions', questions: qs, greetName: await greetName(db, contactId), points };
  }
  return welcome(db, ev, contactId, r.kind === 'already', points);
}

async function checkinPoints(db: Db, contactId: string, eventId: string): Promise<number> {
  const { rows } = await db.query<{ points: number }>(`SELECT points FROM points_ledger WHERE event_key = $1`, [`checkin:${contactId}:${eventId}`]);
  return rows[0]?.points ?? 0;
}

/** 第二步（来过的人）：答题。只记选择 / 手填，答完到欢迎页。 */
export async function answer(slug: string, contactId: string, answers: Record<string, { choice?: string; text?: string }>): Promise<Welcome> {
  return withTransaction(async (db) => {
    const ev = await requireEvent(db, slug);
    const reg = await regOf(db, ev.id, contactId);
    if (!reg || reg.arrival_status !== 'checked_in') throw new CrmError('not_checked_in', '请先扫门口的签到码');
    const earned = await saveAnswers(db, contactId, answers);
    return welcome(db, ev, contactId, false, earned + (await checkinPoints(db, contactId, ev.id)));
  });
}

/** 记回答 + 积分（每题一次；手填的多给）。返回新得积分。 */
export async function saveAnswers(db: Db, contactId: string, answers: Record<string, { choice?: string; text?: string }>): Promise<number> {
  const qs = new Map((await activeQuestions(db)).map((q) => [q.key, q]));
  let earned = 0;
  for (const [key, a] of Object.entries(answers ?? {})) {
    const q = qs.get(key);
    if (!q) continue;
    const choice = typeof a?.choice === 'string' && q.options.includes(a.choice) ? a.choice : null;
    const text = q.allowText && typeof a?.text === 'string' ? a.text.trim().slice(0, 200) : '';
    if (!choice && !text) continue;
    await db.query(`UPDATE profile_answers SET status = 'history' WHERE contact_id = $1 AND item_code = $2 AND status = 'current'`, [contactId, itemCode(key)]);
    await db.query(
      `INSERT INTO profile_answers (contact_id, item_code, value, source, recorded_by) VALUES ($1, $2, $3, $4, 'self')`,
      [contactId, itemCode(key), JSON.stringify({ choice, ...(text ? { text } : {}) }), text && !choice ? 'self_text' : 'self_select']
    );
    if (key === 'region' && choice) await db.query(`UPDATE contacts SET region_self = $2, updated_at = now() WHERE id = $1`, [contactId, choice]);
    const ins = await db.query(
      `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, rule_version)
       VALUES ($1, 'profile', $2, $3, $4, 'v1.3.1') ON CONFLICT (event_key) DO NOTHING RETURNING id`,
      [contactId, ANSWER_POINTS, `ck:${contactId}:${key}`, `补充资料：${q.prompt}`]
    );
    if (ins.rows[0]) earned += ANSWER_POINTS;
    if (text.length >= 4) {
      const x = await db.query(
        `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, rule_version)
         VALUES ($1, 'profile', $2, $3, $4, 'v1.3.1') ON CONFLICT (event_key) DO NOTHING RETURNING id`,
        [contactId, TEXT_BONUS_POINTS, `ckx:${contactId}:${key}`, `补充资料（多写了一点）：${q.prompt}`]
      );
      if (x.rows[0]) earned += TEXT_BONUS_POINTS;
    }
  }
  return earned;
}

async function phoneQuickOn(db: Db): Promise<boolean> {
  return !!(await getSetting<boolean>(db as never, 'phone_quick', false)) && wxConfigured();
}

/** 微信“手机号快速验证”：code 换手机号（微信已验证过）。 */
export async function wxPhoneFromCode(code: string): Promise<string> {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(code)) throw new CrmError('bad_request', '没取到微信手机号，请点“不是这个号？手动填”');
  if (!wxConfigured()) throw new CrmError('wx_error', '没取到微信手机号，请点“不是这个号？手动填”');
  const d = await withWxToken(
    async (token) => {
      const res = await fetch(`https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      return (await res.json()) as { errcode?: number; phone_info?: { purePhoneNumber?: string; countryCode?: string } };
    },
    (r) => r.errcode || undefined
  );
  const pure = d.phone_info?.purePhoneNumber ?? '';
  const cc = d.phone_info?.countryCode ?? '';
  if (d.errcode || !pure || !cc) throw new CrmError('wx_error', '没取到微信手机号，请点“不是这个号？手动填”');
  return `+${cc}${pure}`;
}

/** 手填的号：发短信验证码。发不出去时告诉对方直接完成签到，手机号先记为未验证，工作人员会后核对。 */
export async function sendSms(contactId: string, rawPhone: string, cc: string): Promise<{ sent: boolean; message: string }> {
  const phone = normalizePhone(rawPhone, cc === '+86' ? '+86' : '+1');
  if (!phone) throw new CrmError('bad_phone', '手机号好像不对，请检查一下（美国号码 10 位，中国号码 11 位）');
  if (!twilioVerifyConfigured()) return { sent: false, message: '短信暂时发不出，直接点“完成签到”就行，工作人员会帮您核对手机号。' };
  const pool = getPool();
  await phoneSendLimits(pool, phone, contactId);
  const r = await twilioVerify('Verifications', { To: phone, Channel: 'sms', Locale: 'zh' });
  await pool.query(`INSERT INTO phone_verify_sends (phone, contact_id, ok, error) VALUES ($1, $2, $3, $4)`, [phone, contactId, r.ok, r.ok ? null : String(r.code ?? 'error')]);
  if (!r.ok) return { sent: false, message: '短信没发出去，直接点“完成签到”就行，工作人员会帮您核对手机号。' };
  return { sent: true, message: '验证码已发到这个号码，填进来就行' };
}

async function smsOk(phone: string, code: string): Promise<boolean> {
  const clean = String(code ?? '').replace(/\D/g, '');
  if (clean.length < 4) return false;
  const r = await twilioVerify('VerificationCheck', { To: phone, Code: clean });
  return r.ok && r.status === 'approved';
}

/** 已验证手机号的主人（顺着 merged_into 找到主档案）。 */
export async function verifiedOwner(db: Db, phone: string, except: string): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT coalesce(c.merged_into, c.id) AS id FROM contacts c
      WHERE c.id <> $2 AND (
        (c.phone_e164 = $1 AND c.phone_verified_at IS NOT NULL)
        OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.value = $1 AND m.status = 'confirmed' AND m.is_current))
      ORDER BY c.created_at LIMIT 1`,
    [phone, except]
  );
  return rows[0] && rows[0].id !== except ? rows[0].id : null;
}

/** 空档案：只是一个微信登录，没有姓名、报名、订单、积分、入会申请、工作人员身份。 */
export async function isEmptyShell(db: Db, contactId: string): Promise<boolean> {
  const { rows } = await db.query<{ empty: boolean }>(
    `SELECT (NULLIF(c.name, '微信用户') IS NULL AND c.phone_e164 IS NULL AND c.email IS NULL
        AND NOT EXISTS (SELECT 1 FROM registrations r WHERE r.contact_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.contact_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM points_ledger p WHERE p.contact_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.contact_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM staff_roles s WHERE s.mp_contact_id = c.id)) AS empty
       FROM contacts c WHERE c.id = $1`,
    [contactId]
  );
  return !!rows[0]?.empty;
}

// 微信一键填：先换出号码给客户看（“不是这个号？手动填”），提交时带回签名证明这个号是微信验证过的（30 分钟内、同一档案有效）
function proofSecret(): string {
  const s = process.env.NEWSLETTER_SECRET || process.env.CRON_SECRET || process.env.AGENT_IP_SALT || (process.env.NODE_ENV !== 'production' ? 'dev-local-only' : '');
  if (!s) throw new CrmError('server_error', '系统配置不完整，请直接手动填写手机号');
  return s;
}
export function phoneProof(contactId: string, phone: string, exp = Date.now() + 30 * 60_000): string {
  const sig = createHmac('sha256', proofSecret()).update(`wxphone|${contactId}|${phone}|${exp}`).digest('base64url');
  return `${exp}.${sig}`;
}
export function proofOk(contactId: string, phone: string, proof: string): boolean {
  const [expS, sig] = String(proof ?? '').split('.');
  const exp = Number(expS);
  if (!exp || exp < Date.now() || !sig) return false;
  const want = phoneProof(contactId, phone, exp).split('.')[1];
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function wxPhoneStep(contactId: string, code: string): Promise<{ phone: string; cc: string; number: string; proof: string }> {
  const phone = await wxPhoneFromCode(code);
  const cc = phone.startsWith('+86') ? '+86' : phone.startsWith('+1') ? '+1' : phone.slice(0, phone.length - 10);
  return { phone, cc, number: phone.slice(cc.length), proof: phoneProof(contactId, phone) };
}

export type NewcomerInput = { name?: string; profession?: string; phoneCode?: string; phoneProof?: string; phone?: string; cc?: string; smsCode?: string };

/**
 * 新人一屏三项 → 建档、现场报名、签到，到欢迎页。
 * 返回 token：这个微信登录被挂到已有档案下时，小程序换用新会话（之后就是那份档案）。
 */
export async function newcomer(slug: string, me: string, b: NewcomerInput): Promise<{ step: CheckinStep; token?: string; contactId: string }> {
  const name = String(b.name ?? '').trim().slice(0, 60);
  const profession = PROFESSIONS.includes(String(b.profession)) ? String(b.profession) : null;
  const miss = [!b.phoneCode && !b.phone ? '手机号' : '', !name ? '姓名' : '', !profession ? '职业' : ''].filter(Boolean);
  if (miss.length) throw new CrmError('incomplete', `还差：${miss.join('、')}`);

  let phone: string | null;
  let verified = false;
  if (b.phoneCode) {
    phone = await wxPhoneFromCode(String(b.phoneCode));
    verified = true;
  } else if (b.phoneProof && b.phone && proofOk(me, String(b.phone), String(b.phoneProof))) {
    phone = String(b.phone);
    verified = true;
  } else {
    phone = normalizePhone(String(b.phone ?? ''), b.cc === '+86' ? '+86' : '+1');
    if (!phone) throw new CrmError('bad_phone', '手机号好像不对，请检查一下（美国号码 10 位，中国号码 11 位）');
    if (b.smsCode) {
      verified = twilioVerifyConfigured() && (await smsOk(phone, String(b.smsCode)));
      if (!verified) throw new CrmError('code_wrong', '验证码不对，请再看一下短信；收不到就清空验证码，直接点“完成签到”');
    }
    // 没填验证码（短信发不出 / 收不到）：照样签到，手机号记为未验证，只用来提示疑似重复
  }

  return withTransaction(async (db) => {
    const ev = await requireEvent(db, slug);
    let target = me;
    let token: string | undefined;
    const owner = verified ? await verifiedOwner(db, phone!, me) : null;
    if (owner && (await isEmptyShell(db, me))) {
      // 这个微信登录挂到已有档案下：以后用这个微信打开就是那份档案（报名、积分都在）
      await db.query(`UPDATE contacts SET merged_into = $2, updated_at = now() WHERE id = $1`, [me, owner]);
      await db.query(
        `INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value, reason)
         VALUES ('system', 'wechat_identity_linked', 'contact', $1, $2, '现场签到：验证过的手机号属于已有档案，这个微信登录挂到该档案下')`,
        [owner, JSON.stringify({ wechatContact: me, event: slug })]
      );
      target = owner;
      token = await createSession(db, owner, 'miniprogram');
    } else {
      const { rows: cur } = await db.query<{ name: string }>(`SELECT name FROM contacts WHERE id = $1`, [me]);
      if (!cur[0]?.name || cur[0].name === '微信用户') await db.query(`UPDATE contacts SET name = $2, updated_at = now() WHERE id = $1`, [me, name]);
      await setMethod(db, me, 'phone', phone!, 'checkin');
      if (verified) {
        await noteVerified(db, me, 'phone', phone!);
        await promoteIdentity(db, me, 'phone', phone!); // 被别的档案占用 → 记“需人工合并”，不自动合
      } else {
        const { rows: t } = await db.query(`SELECT 1 FROM contacts WHERE phone_e164 = $1 AND id <> $2`, [phone, me]);
        if (!t[0]) await db.query(`UPDATE contacts SET phone_e164 = coalesce(phone_e164, $2), updated_at = now() WHERE id = $1`, [me, phone]);
      }
    }
    const { rows: has } = await db.query(`SELECT 1 FROM registrations WHERE event_id = $1 AND contact_id = $2 AND status <> 'cancelled'`, [ev.id, target]);
    if (!has[0]) await startRegistration(db, ev, target, { source: 'onsite' });
    const earned = await saveAnswers(db, target, { profession: { choice: profession! } });
    // 新人这一屏就是这次唯一要填的：不再追加选择题
    await db.query(`UPDATE registrations SET ck_asked_at = coalesce(ck_asked_at, now()) WHERE event_id = $1 AND contact_id = $2`, [ev.id, target]);
    const step = await afterRecognized(db, ev, target, earned);
    return { step, token, contactId: target };
  });
}
