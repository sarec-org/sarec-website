/**
 * 登录（不设密码）：邮箱 / 短信验证码 → 会话；小程序微信登录；网站扫码登录；工作人员角色。
 * ------------------------------------------------------------------
 * - 验证码 6 位、10 分钟有效、最多试 5 次、只存 sha256；同一目标 60 秒内不重复发送。
 * - 会话 token 只在返回时出现一次，库里只存 sha256；网站放 httpOnly cookie，小程序用 Bearer。
 * - 密钥只从环境变量读，不打日志。
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { getFromAddress, getResend, isEmailConfigured } from '@/lib/email/resend-client';
import { CrmError, findOrCreateContact, normalizeEmail, normalizePhone } from './events';
import type { Db } from './profile';

export const SESSION_COOKIE = 'sarec_session';
export const SESSION_DAYS = 90;
const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_GAP_SEC = 60;

export const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

export type Channel = 'email' | 'sms';

export function smsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

/** 测试环境（本地 / 验收脚本）可以拿到验证码；正式环境永远不返回。 */
function devEcho(): boolean {
  return process.env.CRM_DEV_ECHO_CODES === '1' && process.env.VERCEL_ENV !== 'production';
}

/** 审核账号：CRM_REVIEW_EMAIL + CRM_REVIEW_CODE（6 位数字）都配置时，这个邮箱用固定验证码登录。 */
export function reviewEmail(): string | null {
  const e = process.env.CRM_REVIEW_EMAIL?.trim().toLowerCase();
  const c = process.env.CRM_REVIEW_CODE?.trim();
  return e && c && /^\d{6}$/.test(c) ? e : null;
}
function reviewLogin(channel: Channel, target: string): string | null {
  const e = reviewEmail();
  return channel === 'email' && e && target === e ? process.env.CRM_REVIEW_CODE!.trim() : null;
}

export function normalizeTarget(channel: Channel, raw: string): string | null {
  return channel === 'email' ? normalizeEmail(raw) : normalizePhone(raw);
}

/** 发送验证码。返回 devCode 仅在测试环境。 */
export async function sendLoginCode(channel: Channel, rawTarget: string): Promise<{ target: string; devCode?: string }> {
  const target = normalizeTarget(channel, rawTarget);
  if (!target) {
    throw new CrmError('bad_target', channel === 'email' ? '邮箱格式不对，请检查后再试' : '手机号格式不对，请加国家码，例如 +1 626 555 1234');
  }
  if (channel === 'sms' && !smsConfigured()) {
    throw new CrmError('sms_unavailable', '短信暂不可用，请用邮箱接收验证码');
  }
  const pool = getPool();
  const { rows: recent } = await pool.query(
    `SELECT 1 FROM login_codes WHERE target = $1 AND created_at > now() - make_interval(secs => $2) LIMIT 1`,
    [target, RESEND_GAP_SEC]
  );
  if (recent[0]) throw new CrmError('too_soon', '验证码刚刚发过，请 60 秒后再试，或先查看收件箱/垃圾邮件');

  // 小程序审核账号：固定验证码（环境变量配置），不发邮件；该账号不能成为工作人员
  const review = reviewLogin(channel, target);
  const code = review ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
  await pool.query(
    `INSERT INTO login_codes (channel, target, code_hash, expires_at) VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
    [channel, target, sha256(`${target}:${code}`), CODE_TTL_MIN]
  );

  if (review) {
    // 不发送
  } else if (channel === 'email') {
    if (isEmailConfigured()) {
      await getResend().emails.send({
        from: getFromAddress(),
        to: target,
        subject: `SAREC 验证码 ${code}`,
        text: `您的 SAREC 登录验证码是：${code}\n\n10 分钟内有效。如果不是您本人操作，请忽略这封邮件。\n\n中美房地产商会 SAREC`,
        html: `<div style="font-family:-apple-system,'PingFang SC',sans-serif;font-size:16px;color:#0A1730">
<p>您的 SAREC 登录验证码是：</p>
<p style="font-size:32px;letter-spacing:6px;font-weight:700;color:#0A1730">${code}</p>
<p>10 分钟内有效。如果不是您本人操作，请忽略这封邮件。</p>
<p style="color:#8a7a55">中美房地产商会 SAREC</p></div>`
      });
    } else if (!devEcho()) {
      throw new CrmError('email_unavailable', '邮件服务暂不可用，请稍后再试或联系工作人员');
    }
  } else {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const body = new URLSearchParams({ To: target, From: process.env.TWILIO_FROM!, Body: `SAREC 验证码 ${code}，10 分钟内有效。` });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    if (!res.ok) throw new CrmError('sms_failed', '短信发送失败，请改用邮箱接收验证码');
  }
  return devEcho() ? { target, devCode: code } : { target };
}

/** 校验验证码 → 找到或建立档案 → 新会话。 */
export async function verifyLoginCode(
  channel: Channel,
  rawTarget: string,
  code: string,
  opts: { name?: string; sessionChannel?: 'web' | 'miniprogram'; bindContactId?: string | null } = {}
): Promise<{ token: string; contactId: string; created: boolean }> {
  const target = normalizeTarget(channel, rawTarget);
  if (!target) throw new CrmError('bad_target', '联系方式格式不对');
  const clean = (code || '').replace(/\D/g, '');
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string; code_hash: string; attempts: number; expires_at: Date }>(
      `SELECT id, code_hash, attempts, expires_at FROM login_codes
        WHERE target = $1 AND channel = $2 AND consumed_at IS NULL
        ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [target, channel]
    );
    const row = rows[0];
    if (!row) throw new CrmError('no_code', '请先获取验证码');
    if (row.expires_at.getTime() < Date.now()) throw new CrmError('code_expired', '验证码已过期，请重新获取');
    if (row.attempts >= MAX_ATTEMPTS) throw new CrmError('too_many_attempts', '输错次数太多，请重新获取验证码');
    if (row.code_hash !== sha256(`${target}:${clean}`)) {
      await db.query(`UPDATE login_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
      const left = MAX_ATTEMPTS - row.attempts - 1;
      throw new CrmError('code_wrong', left > 0 ? `验证码不对，还可以再试 ${left} 次` : '输错次数太多，请重新获取验证码');
    }
    await db.query(`UPDATE login_codes SET consumed_at = now() WHERE id = $1`, [row.id]);

    let contactId: string;
    let created = false;
    if (opts.bindContactId) {
      // 小程序首次绑定：把已验证的联系方式并到当前微信档案；若该联系方式已有档案，改为把微信身份移到那份档案。
      contactId = await bindVerifiedIdentity(db, opts.bindContactId, channel, target);
    } else {
      const r = await findOrCreateContact(
        db,
        channel === 'email' ? { email: target } : { phone: target },
        (opts.name || '').trim() || (channel === 'email' ? target.split('@')[0] : target)
      );
      contactId = r.id;
      created = r.created;
      // 网站会费申请先用未验证邮箱建过档：验证后补上验证时间
      if (channel === 'email') {
        await db.query(`UPDATE contacts SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1`, [contactId]);
      }
    }
    const token = await createSession(db, contactId, opts.sessionChannel ?? 'web');
    return { token, contactId, created };
  });
}

async function bindVerifiedIdentity(db: Db, wechatContactId: string, channel: Channel, target: string): Promise<string> {
  const col = channel === 'email' ? 'email' : 'phone_e164';
  const vcol = channel === 'email' ? 'email_verified_at' : 'phone_verified_at';
  const { rows: other } = await db.query<{ id: string }>(`SELECT id FROM contacts WHERE ${col} = $1 AND id <> $2`, [target, wechatContactId]);
  if (!other[0]) {
    await db.query(`UPDATE contacts SET ${col} = $2, ${vcol} = now(), updated_at = now() WHERE id = $1`, [wechatContactId, target]);
    return wechatContactId;
  }
  // 已有网站账号：微信身份移到原档案，不新建、不产生第二个会员编号
  const { rows: w } = await db.query<{ wechat_openid: string | null; wechat_unionid: string | null }>(
    `SELECT wechat_openid, wechat_unionid FROM contacts WHERE id = $1`,
    [wechatContactId]
  );
  const { rows: hasData } = await db.query(
    `SELECT 1 FROM registrations WHERE contact_id = $1 UNION ALL SELECT 1 FROM orders WHERE contact_id = $1 UNION ALL SELECT 1 FROM profile_answers WHERE contact_id = $1 LIMIT 1`,
    [wechatContactId]
  );
  if (hasData[0]) {
    // 微信临时档案已有业务数据：不自动合并，留给工作人员核验后合并
    await db.query(
      `INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value, reason)
       VALUES ('system', 'merge_needed', 'contact', $1, $2, '微信档案与已有网站档案需人工核验合并')`,
      [wechatContactId, JSON.stringify({ other: other[0].id })]
    );
    throw new CrmError('merge_needed', '这个联系方式已经有账号，请联系工作人员帮您合并，不会丢资料');
  }
  await db.query(`UPDATE contacts SET wechat_openid = NULL, wechat_unionid = NULL WHERE id = $1`, [wechatContactId]);
  await db.query(
    `UPDATE contacts SET wechat_openid = COALESCE(wechat_openid, $2), wechat_unionid = COALESCE(wechat_unionid, $3), ${vcol} = COALESCE(${vcol}, now()), updated_at = now() WHERE id = $1`,
    [other[0].id, w[0]?.wechat_openid ?? null, w[0]?.wechat_unionid ?? null]
  );
  await db.query(`DELETE FROM sessions WHERE contact_id = $1`, [wechatContactId]);
  await db.query(`DELETE FROM contacts WHERE id = $1`, [wechatContactId]);
  return other[0].id;
}

export async function createSession(db: Db, contactId: string, channel: 'web' | 'miniprogram' | 'qr_login'): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.query(
    `INSERT INTO sessions (token_hash, contact_id, channel, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
    [sha256(token), contactId, channel, SESSION_DAYS]
  );
  return token;
}

export async function sessionContact(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const { rows } = await getPool().query<{ contact_id: string }>(
    `UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1 AND expires_at > now() RETURNING contact_id`,
    [sha256(token)]
  );
  return rows[0]?.contact_id ?? null;
}

export async function destroySession(token: string): Promise<void> {
  await getPool().query(`DELETE FROM sessions WHERE token_hash = $1`, [sha256(token)]);
}

// ── 小程序：wx.login code → openid ─────────────────────────────────────
export async function wechatLogin(code: string): Promise<{ token: string; contactId: string; needsBind: boolean }> {
  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;
  let openid: string | undefined;
  let unionid: string | undefined;
  if (appid && secret) {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const data = (await (await fetch(url)).json()) as { openid?: string; unionid?: string; errcode?: number };
    if (!data.openid) throw new CrmError('wechat_failed', '微信登录失败，请稍后再试');
    openid = data.openid;
    unionid = data.unionid;
  } else if (devEcho() && code.startsWith('dev-')) {
    openid = `dev-openid-${code.slice(4)}`; // 本地测试用
  } else {
    throw new CrmError('wechat_unconfigured', '小程序登录暂未配置，请用邮箱验证码登录');
  }
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string; email_verified_at: Date | null; phone_verified_at: Date | null }>(
      `SELECT id, email_verified_at, phone_verified_at FROM contacts WHERE wechat_openid = $1`,
      [openid]
    );
    let id = rows[0]?.id;
    let verified = !!(rows[0]?.email_verified_at || rows[0]?.phone_verified_at);
    if (!id) {
      const ins = await db.query<{ id: string }>(
        `INSERT INTO contacts (name, wechat_openid, wechat_unionid, acquisition_source) VALUES ('微信用户', $1, $2, 'miniprogram') RETURNING id`,
        [openid, unionid ?? null]
      );
      id = ins.rows[0].id;
      verified = false;
    }
    const token = await createSession(db, id, 'miniprogram');
    return { token, contactId: id, needsBind: !verified };
  });
}

// ── 网站扫码登录 ────────────────────────────────────────────────────────
export async function createQrLogin(): Promise<{ code: string; poll: string; expiresAt: Date }> {
  const code = randomBytes(12).toString('base64url');
  const poll = randomBytes(24).toString('base64url');
  const { rows } = await getPool().query<{ expires_at: Date }>(
    `INSERT INTO qr_logins (code_hash, poll_hash, expires_at) VALUES ($1, $2, now() + interval '3 minutes') RETURNING expires_at`,
    [sha256(code), sha256(poll)]
  );
  return { code, poll, expiresAt: rows[0].expires_at };
}

export async function approveQrLogin(code: string, contactId: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    `UPDATE qr_logins SET status = 'approved', contact_id = $2 WHERE code_hash = $1 AND status = 'pending' AND expires_at > now()`,
    [sha256(code), contactId]
  );
  return !!rowCount;
}

/** 网站轮询：批准后换出一个新会话（只能换一次）。 */
export async function pollQrLogin(poll: string): Promise<{ status: 'pending' | 'expired' | 'approved'; token?: string }> {
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string; status: string; contact_id: string | null; expires_at: Date }>(
      `SELECT id, status, contact_id, expires_at FROM qr_logins WHERE poll_hash = $1 FOR UPDATE`,
      [sha256(poll)]
    );
    const r = rows[0];
    if (!r || r.status === 'consumed' || r.status === 'expired') return { status: 'expired' };
    if (r.status === 'pending') return r.expires_at.getTime() < Date.now() ? { status: 'expired' } : { status: 'pending' };
    await db.query(`UPDATE qr_logins SET status = 'consumed' WHERE id = $1`, [r.id]);
    return { status: 'approved', token: await createSession(db, r.contact_id!, 'qr_login') };
  });
}

// ── 工作人员 ────────────────────────────────────────────────────────────
export type StaffRole = 'checkin' | 'finance' | 'ops' | 'admin';
export type Staff = { contactId: string; email: string; name: string; roles: StaffRole[] };

export async function staffFor(contactId: string): Promise<Staff | null> {
  const { rows } = await getPool().query<{ email: string; name: string; roles: StaffRole[] }>(
    `SELECT s.email, s.name, s.roles FROM contacts c JOIN staff_roles s ON s.email = c.email
      WHERE c.id = $1 AND c.email_verified_at IS NOT NULL AND s.is_active`,
    [contactId]
  );
  if (!rows[0] || rows[0].email.toLowerCase() === reviewEmail()) return null; // 审核账号永远不是工作人员
  return { contactId, ...rows[0] };
}

export function staffCan(s: Staff | null, role: StaffRole): boolean {
  return !!s && (s.roles.includes('admin') || s.roles.includes(role));
}
