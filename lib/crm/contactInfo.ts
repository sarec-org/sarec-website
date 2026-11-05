/**
 * 联系方式真实性（东哥 2026-11-04）
 * ------------------------------------------------------------------
 * - 报名必填姓名、手机号、邮箱：只检查格式，不发验证码、不挡报名。
 * - 邮箱：报名后发确认邮件，点“确认邮箱”标为已确认；Resend 退信 → 标“无效”，用户下次打开时提示修改。
 * - 手机：Twilio Verify，每个号码只在首次填写时验证一次；同一号码 60 秒一次、一天最多 10 次。
 *   Twilio 未配置时手机号一律“未验证”，功能放着。
 * - 只有已验证的邮箱 / 手机号才写进档案身份（contacts.email / phone_e164），才能登录网站、用来认人合并。
 * - 修改后重新验证；旧值保留为历史，不删除。
 * 密钥只从环境变量读，不打日志。
 */
import { createHash, randomBytes } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { getFromAddress, getResend, isEmailConfigured } from '@/lib/email/resend-client';
import { CrmError, normalizeEmail, normalizePhone } from './events';
import type { Db } from './profile';

export type Kind = 'email' | 'phone';
export type MethodStatus = 'unconfirmed' | 'confirmed' | 'invalid';
export const RECONFIRM_MONTHS = 6;
const PHONE_GAP_SEC = 60;
const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const PHONE_DAILY_MAX = 10;

export const STATUS_TEXT: Record<Kind, Record<MethodStatus, string>> = {
  email: { unconfirmed: '未确认', confirmed: '已确认', invalid: '无效' },
  phone: { unconfirmed: '未验证', confirmed: '已验证', invalid: '发送失败' }
};

// ── 打码 ────────────────────────────────────────────────────────────────
export function maskEmail(e: string): string {
  const [local, domain] = e.split('@');
  if (!domain) return '***';
  const keep = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${keep}***@${domain}`;
}

export function maskPhone(p: string): string {
  const cc = p.startsWith('+1') ? '1' : p.startsWith('+86') ? '86' : p.slice(1, 3);
  const rest = p.slice(cc.length + 1);
  if (rest.length < 7) return `+${cc} ****`;
  return `+${cc} ${rest.slice(0, 3)}****${rest.slice(-4)}`;
}

// ── 读取 ────────────────────────────────────────────────────────────────
type MethodRow = { id: string; kind: Kind; value: string; status: MethodStatus; created_at: Date; confirmed_at: Date | null; invalid_reason: string | null };

export type ContactInfo = {
  email: { value: string; masked: string; status: MethodStatus; statusText: string } | null;
  phone: { value: string; masked: string; status: MethodStatus; statusText: string } | null;
  /** 邮箱退信或短信发送失败：标红“请更新” */
  needsUpdate: boolean;
  /** 距离上次确认满 6 个月：弹“您的联系方式还是这些吗？” */
  needsReconfirm: boolean;
  confirmedAt: string | null;
  phoneVerifyAvailable: boolean;
};

async function currentMethods(db: Db, contactId: string): Promise<Partial<Record<Kind, MethodRow>>> {
  const { rows } = await db.query<MethodRow>(
    `SELECT id, kind, value, status, created_at, confirmed_at, invalid_reason FROM contact_methods WHERE contact_id = $1 AND is_current`,
    [contactId]
  );
  const out: Partial<Record<Kind, MethodRow>> = {};
  for (const r of rows) out[r.kind] = r;
  return out;
}

export async function getContactInfo(db: Db, contactId: string): Promise<ContactInfo> {
  const cur = await currentMethods(db, contactId);
  const { rows } = await db.query<{ contact_info_confirmed_at: Date | null; created_at: Date }>(
    `SELECT contact_info_confirmed_at, created_at FROM contacts WHERE id = $1`,
    [contactId]
  );
  const view = (k: Kind) => {
    const m = cur[k];
    if (!m) return null;
    return { value: m.value, masked: k === 'email' ? maskEmail(m.value) : maskPhone(m.value), status: m.status, statusText: STATUS_TEXT[k][m.status] };
  };
  const latest = [cur.email?.created_at, cur.phone?.created_at].filter(Boolean).map((d) => d!.getTime());
  const base = rows[0]?.contact_info_confirmed_at?.getTime() ?? (latest.length ? Math.max(...latest) : null);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RECONFIRM_MONTHS);
  return {
    email: view('email'),
    phone: view('phone'),
    needsUpdate: cur.email?.status === 'invalid' || cur.phone?.status === 'invalid',
    needsReconfirm: base != null && base < cutoff.getTime(),
    confirmedAt: rows[0]?.contact_info_confirmed_at?.toISOString() ?? null,
    phoneVerifyAvailable: twilioVerifyConfigured()
  };
}

// ── 写入 ────────────────────────────────────────────────────────────────
/** 这个人以前验证过同一个值（或档案身份就是它）：不再重复验证。 */
async function previouslyConfirmed(db: Db, contactId: string, kind: Kind, value: string): Promise<boolean> {
  const col = kind === 'email' ? 'email' : 'phone_e164';
  const vcol = kind === 'email' ? 'email_verified_at' : 'phone_verified_at';
  const { rows } = await db.query(
    `SELECT 1 FROM contacts WHERE id = $1 AND ${col} = $2 AND ${vcol} IS NOT NULL
     UNION ALL
     SELECT 1 FROM contact_methods WHERE contact_id = $1 AND kind = $3 AND value = $2 AND confirmed_at IS NOT NULL
     LIMIT 1`,
    [contactId, value, kind]
  );
  return !!rows[0];
}

/** 档案行排他锁（同一人的并发写排队）。所有会锁报名行的路径都要先调它，保证加锁顺序一致：档案 → 报名。 */
export async function lockContact(db: Db, contactId: string): Promise<void> {
  await db.query(`SELECT 1 FROM contacts WHERE id = $1 FOR NO KEY UPDATE`, [contactId]);
}

/**
 * 设定当前联系方式（报名 / “我的”里修改）。值没变：不动；变了：旧值转为历史，新值从“未确认”开始
 * （本人以前验证过的同一值直接算已验证）。返回新状态与是否变化。
 */
export async function setMethod(
  db: Db,
  contactId: string,
  kind: Kind,
  value: string,
  source: string
): Promise<{ changed: boolean; status: MethodStatus; methodId: string }> {
  // 同一人并发提交（现场连点）：先锁档案行，两次写联系方式排队执行，避免撞唯一约束报“系统忙”。
  // 用 FOR NO KEY UPDATE（不挡外键引用）：签到写积分要对档案行加 KEY SHARE，用 FOR UPDATE 会和它互相等待而死锁。
  await lockContact(db, contactId);
  const { rows: cur } = await db.query<{ id: string; value: string; status: MethodStatus }>(
    `SELECT id, value, status FROM contact_methods WHERE contact_id = $1 AND kind = $2 AND is_current FOR UPDATE`,
    [contactId, kind]
  );
  if (cur[0] && cur[0].value === value) return { changed: false, status: cur[0].status, methodId: cur[0].id };
  if (cur[0]) await db.query(`UPDATE contact_methods SET is_current = false, replaced_at = now() WHERE id = $1`, [cur[0].id]);
  const confirmed = await previouslyConfirmed(db, contactId, kind, value);
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO contact_methods (contact_id, kind, value, status, source, confirmed_at)
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 = 'confirmed' THEN now() END)
     ON CONFLICT (contact_id, kind) WHERE is_current DO NOTHING RETURNING id`,
    [contactId, kind, value, confirmed ? 'confirmed' : 'unconfirmed', source]
  );
  if (!rows[0]) {
    // 不在事务里时仍可能并发：另一请求刚写入，以它为准。
    const { rows: now } = await db.query<{ id: string; value: string; status: MethodStatus }>(
      `SELECT id, value, status FROM contact_methods WHERE contact_id = $1 AND kind = $2 AND is_current`,
      [contactId, kind]
    );
    return { changed: now[0]?.value !== cur[0]?.value, status: now[0].status, methodId: now[0].id };
  }
  return { changed: true, status: confirmed ? 'confirmed' : 'unconfirmed', methodId: rows[0].id };
}

/** 验证码登录 / 绑定成功后调用：这个值已验证。 */
export async function noteVerified(db: Db, contactId: string, kind: Kind, value: string): Promise<void> {
  const { rows } = await db.query<{ id: string; value: string }>(
    `SELECT id, value FROM contact_methods WHERE contact_id = $1 AND kind = $2 AND is_current`,
    [contactId, kind]
  );
  if (!rows[0]) {
    await db.query(
      `INSERT INTO contact_methods (contact_id, kind, value, status, source, confirmed_at) VALUES ($1, $2, $3, 'confirmed', 'login', now())`,
      [contactId, kind, value]
    );
  } else if (rows[0].value === value) {
    await db.query(
      `UPDATE contact_methods SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, now()), invalid_at = NULL, invalid_reason = NULL WHERE id = $1`,
      [rows[0].id]
    );
  }
}

/**
 * 已验证的值写进档案身份（之后可用于登录网站）。已被别的档案占用：不自动合并，记一条待人工合并。
 */
export async function promoteIdentity(db: Db, contactId: string, kind: Kind, value: string): Promise<'promoted' | 'same' | 'kept' | 'merge_needed'> {
  const col = kind === 'email' ? 'email' : 'phone_e164';
  const vcol = kind === 'email' ? 'email_verified_at' : 'phone_verified_at';
  const { rows: me } = await db.query<{ v: string | null; verified: Date | null }>(`SELECT ${col} AS v, ${vcol} AS verified FROM contacts WHERE id = $1 FOR UPDATE`, [contactId]);
  if (me[0]?.v === value) {
    await db.query(`UPDATE contacts SET ${vcol} = COALESCE(${vcol}, now()), updated_at = now() WHERE id = $1`, [contactId]);
    return 'same';
  }
  const { rows: other } = await db.query<{ id: string }>(`SELECT id FROM contacts WHERE ${col} = $1 AND id <> $2`, [value, contactId]);
  if (other[0]) {
    await db.query(
      `INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value, reason)
       VALUES ('system', 'merge_needed', 'contact', $1, $2, $3)`,
      [contactId, JSON.stringify({ other: other[0].id, kind }), `已验证的${kind === 'email' ? '邮箱' : '手机号'}已在另一份档案中，需人工核验合并`]
    );
    return 'merge_needed';
  }
  if (me[0]?.v && me[0].verified) return 'kept'; // 已有另一个已验证身份：保留原登录方式
  await db.query(`UPDATE contacts SET ${col} = $2, ${vcol} = now(), updated_at = now() WHERE id = $1`, [contactId, value]);
  return 'promoted';
}

/** 报名 / 修改：同时校验并保存手机号、邮箱（格式不对直接提示，不发验证码）。 */
export function parseContactInput(raw: { phone?: unknown; email?: unknown }, required: { phone: boolean; email: boolean }) {
  const phoneRaw = typeof raw.phone === 'string' ? raw.phone.trim() : '';
  const emailRaw = typeof raw.email === 'string' ? raw.email.trim() : '';
  if (required.phone && !phoneRaw) throw new CrmError('bad_phone', '请填写手机号');
  if (required.email && !emailRaw) throw new CrmError('bad_email', '请填写邮箱');
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (phoneRaw && !phone) throw new CrmError('bad_phone', '手机号格式不对：美国号码 10 位，其他国家请加 +国家码，例如 +86 138 0000 0000');
  if (emailRaw && !email) throw new CrmError('bad_email', '邮箱格式不对，请检查后再填');
  return { phone, email };
}

export async function saveContactInput(
  db: Db,
  contactId: string,
  v: { phone: string | null; email: string | null },
  source: string
): Promise<{ emailChanged: boolean; phoneChanged: boolean; emailStatus: MethodStatus | null; phoneStatus: MethodStatus | null }> {
  let emailChanged = false;
  let phoneChanged = false;
  let emailStatus: MethodStatus | null = null;
  let phoneStatus: MethodStatus | null = null;
  if (v.email) {
    const r = await setMethod(db, contactId, 'email', v.email, source);
    emailChanged = r.changed;
    emailStatus = r.status;
  }
  if (v.phone) {
    const r = await setMethod(db, contactId, 'phone', v.phone, source);
    phoneChanged = r.changed;
    phoneStatus = r.status;
  }
  return { emailChanged, phoneChanged, emailStatus, phoneStatus };
}

/** “没变”：记下确认时间。 */
export async function confirmStillValid(contactId: string): Promise<void> {
  await getPool().query(`UPDATE contacts SET contact_info_confirmed_at = now(), updated_at = now() WHERE id = $1`, [contactId]);
}

/** “我的”里修改联系方式：保存 → 记确认时间 → 新邮箱发确认邮件。 */
export async function updateMyContact(contactId: string, raw: { phone?: unknown; email?: unknown }, base: string) {
  const v = parseContactInput(raw, { phone: false, email: false });
  if (!v.phone && !v.email) throw new CrmError('bad_request', '请填写要修改的手机号或邮箱');
  const r = await withTransaction(async (db) => {
    const out = await saveContactInput(db, contactId, v, 'profile');
    await db.query(`UPDATE contacts SET contact_info_confirmed_at = now(), updated_at = now() WHERE id = $1`, [contactId]);
    return out;
  });
  if (r.emailChanged && r.emailStatus === 'unconfirmed') await sendConfirmEmailSafe(contactId, base, null);
  return {
    ...r,
    contactInfo: await getContactInfo(getPool(), contactId),
    message: [
      r.emailChanged ? (r.emailStatus === 'confirmed' ? '邮箱已更新' : '邮箱已更新，请到邮箱点“确认邮箱”') : null,
      r.phoneChanged ? (r.phoneStatus === 'confirmed' ? '手机号已更新' : '手机号已更新，请验证') : null
    ]
      .filter(Boolean)
      .join('；') || '没有变化'
  };
}

// ── 邮件：报名确认 + 确认邮箱 ───────────────────────────────────────────
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function fmtLA(d: Date, tz = 'America/Los_Angeles'): string {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: tz, month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

/** 生成新的确认链接 token（旧链接随之失效）。库里只存 sha256。 */
export async function issueEmailToken(db: Db, methodId: string): Promise<string> {
  const token = randomBytes(24).toString('base64url');
  await db.query(`UPDATE contact_methods SET confirm_token_hash = $2 WHERE id = $1`, [methodId, sha256(token)]);
  return token;
}

/**
 * 发确认邮件（报名成功后 / 修改邮箱后）。邮箱未确认时带“确认邮箱”按钮；无效（退信）的不发。
 * 永不抛错：邮件失败不影响报名。
 */
export async function sendConfirmEmailSafe(contactId: string, base: string, eventId: string | null): Promise<'sent' | 'skipped' | 'failed'> {
  try {
    if (!isEmailConfigured()) return 'skipped';
    const pool = getPool();
    const { rows: m } = await pool.query<{ id: string; value: string; status: MethodStatus }>(
      `SELECT id, value, status FROM contact_methods WHERE contact_id = $1 AND kind = 'email' AND is_current`,
      [contactId]
    );
    const em = m[0];
    if (!em || em.status === 'invalid') return 'skipped';
    type Ev = { title: string; starts_at: Date; ends_at: Date | null; timezone: string; location_name: string | null; address: string | null; slug: string };
    const ev: Ev | null = eventId
      ? ((await pool.query<Ev>(`SELECT title, starts_at, ends_at, timezone, location_name, address, slug FROM events WHERE id = $1`, [eventId])).rows[0] ?? null)
      : null;
    if (!ev && em.status !== 'unconfirmed') return 'skipped';
    const token = em.status === 'unconfirmed' ? await issueEmailToken(pool, em.id) : null;
    const confirmUrl = token ? `${base}/zh/confirm-email?t=${token}` : null;
    const { rows: c } = await pool.query<{ name: string }>(`SELECT name FROM contacts WHERE id = $1`, [contactId]);
    const name = c[0]?.name && c[0].name !== '微信用户' ? c[0].name : '';
    const subject = ev ? `报名成功：${ev.title}` : '请确认您的邮箱｜SAREC';
    const when = ev ? `${fmtLA(ev.starts_at, ev.timezone)}${ev.ends_at ? ` – ${fmtLA(ev.ends_at, ev.timezone).replace(/^.*?(\d{2}:\d{2})$/, '$1')}` : ''}` : '';
    const where = ev ? [ev.location_name, ev.address].filter(Boolean).join(' · ') : '';
    const lines = [
      name ? `${name}，您好：` : '您好：',
      ev ? `您已成功报名「${ev.title}」。` : '您在 SAREC 填写了这个邮箱。',
      ev ? `时间：${when}（洛杉矶时间）` : null,
      ev && where ? `地点：${where}` : null,
      confirmUrl ? '请点下面的按钮确认邮箱，以后活动通知会发到这里。' : null
    ].filter(Boolean) as string[];
    const text = `${lines.join('\n')}${confirmUrl ? `\n\n确认邮箱：${confirmUrl}` : ''}\n\n如果不是您本人操作，请忽略这封邮件。\n中美房地产商会 SAREC`;
    const html = `<div style="font-family:-apple-system,'PingFang SC',sans-serif;font-size:16px;line-height:1.7;color:#0A1730">
${lines.map((l) => `<p style="margin:0 0 8px">${esc(l)}</p>`).join('\n')}
${confirmUrl ? `<p style="margin:20px 0"><a href="${esc(confirmUrl)}" style="display:inline-block;background:#0A1730;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600">确认邮箱</a></p>` : ''}
<p style="color:#8a7a55;font-size:14px;margin-top:24px">如果不是您本人操作，请忽略这封邮件。<br>中美房地产商会 SAREC</p></div>`;
    const res = await getResend().emails.send({ from: getFromAddress(), to: em.value, subject, text, html });
    if (res.error) {
      console.error('[contact-email] send failed');
      return 'failed';
    }
    return 'sent';
  } catch {
    console.error('[contact-email] send failed');
    return 'failed';
  }
}

/** 确认链接（网页自动提交）：标为已确认；档案没有已验证邮箱时写进身份（之后可用这个邮箱登录网站）。 */
export async function confirmEmailToken(token: string): Promise<{ ok: boolean; masked?: string; message: string }> {
  if (!token || token.length < 20) return { ok: false, message: '链接不完整，请从邮件里重新点开' };
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string; contact_id: string; value: string; is_current: boolean; status: MethodStatus }>(
      `SELECT id, contact_id, value, is_current, status FROM contact_methods WHERE confirm_token_hash = $1 AND kind = 'email' FOR UPDATE`,
      [sha256(token)]
    );
    const m = rows[0];
    if (!m) return { ok: false, message: '链接已失效。如果邮箱已确认，无需再点；否则请在“我的”里重新发送' };
    if (!m.is_current) return { ok: false, message: '这个邮箱已被修改，链接已失效' };
    await db.query(
      `UPDATE contact_methods SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, now()), invalid_at = NULL, invalid_reason = NULL WHERE id = $1`,
      [m.id]
    );
    await promoteIdentity(db, m.contact_id, 'email', m.value);
    return { ok: true, masked: maskEmail(m.value), message: '邮箱已确认，以后活动通知会发到这个邮箱' };
  });
}

/** Resend 退信：这个邮箱在所有档案里都标“无效”。 */
export async function markEmailBounced(rawEmail: string, reason: string): Promise<number> {
  const email = normalizeEmail(rawEmail);
  if (!email) return 0;
  const { rowCount } = await getPool().query(
    `UPDATE contact_methods SET status = 'invalid', invalid_at = now(), invalid_reason = $2
      WHERE kind = 'email' AND value = $1 AND is_current AND status <> 'invalid'`,
    [email, reason.slice(0, 300)]
  );
  return rowCount ?? 0;
}

// ── 手机：Twilio Verify ────────────────────────────────────────────────
export function twilioVerifyConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
}

/** 短信发不出时（余额不足、号码无效、Twilio 故障）的统一提示：不让用户卡住 */
export const SMS_FALLBACK = '短信暂时发不出，请改用邮箱验证';

export async function twilioVerify(path: 'Verifications' | 'VerificationCheck', params: Record<string, string>): Promise<{ ok: boolean; status?: string; code?: number }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  let res: Response;
  try {
    res = await fetch(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(params)
    });
  } catch {
    return { ok: false, code: -1 };
  }
  const data = (await res.json().catch(() => ({}))) as { status?: string; code?: number };
  return { ok: res.ok, status: data.status, code: data.code };
}

/** 号码本身有问题（不存在、座机、不支持短信）的 Twilio 错误码 → 标“发送失败” */
const BAD_NUMBER_CODES = new Set([60200, 60205, 21211, 21614, 21408, 60410]);

/** 同一号码 60 秒一次、一天最多 10 次（同一档案一天也最多 10 次）。 */
export async function phoneSendLimits(db: Db, phone: string, contactId: string | null): Promise<void> {
  const { rows: lim } = await db.query<{ recent: number; today: number; mine: number }>(
    `SELECT count(*) FILTER (WHERE phone = $1 AND created_at > now() - make_interval(secs => $3))::int AS recent,
            count(*) FILTER (WHERE phone = $1)::int AS today,
            count(*) FILTER (WHERE $2::uuid IS NOT NULL AND contact_id = $2)::int AS mine
       FROM phone_verify_sends WHERE (phone = $1 OR ($2::uuid IS NOT NULL AND contact_id = $2)) AND created_at > now() - interval '1 day'`,
    [phone, contactId, PHONE_GAP_SEC]
  );
  if (lim[0].recent > 0) throw new CrmError('too_soon', '验证码刚刚发过，请 60 秒后再试');
  if (lim[0].today >= PHONE_DAILY_MAX || lim[0].mine >= PHONE_DAILY_MAX) throw new CrmError('too_many_attempts', '今天发送次数已达上限（10 次），请明天再试，或改用邮箱验证');
}

export async function sendPhoneCode(contactId: string): Promise<{ alreadyVerified: boolean; masked: string; message: string }> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; value: string; status: MethodStatus }>(
    `SELECT id, value, status FROM contact_methods WHERE contact_id = $1 AND kind = 'phone' AND is_current`,
    [contactId]
  );
  const m = rows[0];
  if (!m) throw new CrmError('no_phone', '请先填写手机号');
  if (m.status === 'confirmed' || (await previouslyConfirmed(pool, contactId, 'phone', m.value))) {
    await withTransaction(async (db) => {
      await noteVerified(db, contactId, 'phone', m.value);
      await promoteIdentity(db, contactId, 'phone', m.value);
    });
    return { alreadyVerified: true, masked: maskPhone(m.value), message: '这个号码已验证过，无需再验证' };
  }
  if (!twilioVerifyConfigured()) throw new CrmError('sms_unavailable', SMS_FALLBACK);
  await phoneSendLimits(pool, m.value, contactId);
  const r = await twilioVerify('Verifications', { To: m.value, Channel: 'sms', Locale: 'zh' });
  await pool.query(`INSERT INTO phone_verify_sends (phone, contact_id, ok, error) VALUES ($1, $2, $3, $4)`, [m.value, contactId, r.ok, r.ok ? null : String(r.code ?? 'error')]);
  if (!r.ok) {
    if (r.code && BAD_NUMBER_CODES.has(r.code)) {
      await pool.query(`UPDATE contact_methods SET status = 'invalid', invalid_at = now(), invalid_reason = '短信发送失败' WHERE id = $1`, [m.id]);
    }
    throw new CrmError('sms_failed', SMS_FALLBACK);
  }
  return { alreadyVerified: false, masked: maskPhone(m.value), message: `验证码已发送到 ${maskPhone(m.value)}` };
}

export async function checkPhoneCode(contactId: string, code: string): Promise<{ message: string }> {
  const clean = String(code ?? '').replace(/\D/g, '');
  if (clean.length < 4) throw new CrmError('code_wrong', '请填写短信里的验证码');
  const pool = getPool();
  const { rows } = await pool.query<{ value: string; status: MethodStatus }>(
    `SELECT value, status FROM contact_methods WHERE contact_id = $1 AND kind = 'phone' AND is_current`,
    [contactId]
  );
  const m = rows[0];
  if (!m) throw new CrmError('no_phone', '请先填写手机号');
  if (m.status === 'confirmed') return { message: '手机号已验证' };
  if (!twilioVerifyConfigured()) throw new CrmError('sms_unavailable', SMS_FALLBACK);
  const r = await twilioVerify('VerificationCheck', { To: m.value, Code: clean });
  if (!r.ok && r.code === 20404) throw new CrmError('code_expired', '验证码已过期，请重新获取');
  if (!r.ok) throw new CrmError('sms_failed', SMS_FALLBACK);
  if (r.status !== 'approved') throw new CrmError('code_wrong', '验证码不对，请再试一次');
  await withTransaction(async (db) => {
    await noteVerified(db, contactId, 'phone', m.value);
    await promoteIdentity(db, contactId, 'phone', m.value);
  });
  return { message: '手机号已验证' };
}
