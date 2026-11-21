/**
 * 对外发送总闸 notify_live —— 后台综合优化（B、C 共用；谁后到谁对齐这个文件，不要另写一份）
 * ------------------------------------------------------------------
 * 所有"新加的对外发送"（给工作人员的通知邮件/短信/企业微信、每日汇总、给申请人发缴费链接、代登记确认短信……）
 * 一律经过 gateSend()：
 *   · 正式站（VERCEL_ENV=production）：crm_settings.notify_live 不是 true（默认没有这一行 = 关）→ 不发，只在 notify_log 记一行
 *     "本该发什么、发给谁（打码）"，status='held'。打开总闸要东哥点头（设置页由 A/C 做开关，这里只读）。
 *   · 测试站 / 本机：不看总闸，只发给测试身份——邮件看 PREVIEW_EMAIL_ALLOW 白名单，短信看测试号名单
 *     （555-01xx 虚构号 + test_fixed_code_phones）；企业微信在测试站一律不发。其余 status='blocked' 只记录。
 *   · 真发了记 status='sent'；发送函数抛错记 status='failed'（错误文字截 300 字，不含密钥）。
 * 例外：opts.existing = 改版前正式站就在发的同一封通知（只改了内容），正式站照发、照记；测试站仍只发测试身份。
 * 同一件事不重复发：传 dedupeKey，notify_log 里已有 sent/held 的同 key 直接返回 duplicate。
 *
 * 表 notify_log 在 db/migrations/0039_today.sql（IF NOT EXISTS；C 的 0040 如也需要，原样 CREATE TABLE IF NOT EXISTS 同一份即可）。
 */
import { getPool } from '@/lib/db/client';
import { isProduction, testRecipientAllowed } from '@/lib/email/resend-client';
import { getSetting } from './orders';
import { testPhoneAllowed } from './testPhones';

export type NotifyChannel = 'email' | 'sms' | 'wecom';
export type NotifyStatus = 'sent' | 'held' | 'blocked' | 'failed' | 'duplicate';

export type NotifyMessage = {
  channel: NotifyChannel;
  /** 邮箱 / E.164 手机号 / 企业微信 userid */
  to: string;
  /** 这是哪类通知（人话或短代号都行，只给后台记录看），例：'咨询通知'、'每日汇总' */
  kind: string;
  subject?: string;
  text: string;
  /** 关联的那条东西（任务号、申请号……），方便查 */
  ref?: string | null;
  /** 同一件事只发一次 */
  dedupeKey?: string | null;
};

/** 总闸是否打开（只在正式站有意义）。读不到 = 关 */
export async function notifyLive(): Promise<boolean> {
  const v = await getSetting<unknown>(getPool(), 'notify_live', false);
  return v === true || v === 'true';
}

/** 打码：邮箱 a***@b.com；手机 ***1234；其他留前 2 位 */
export function maskTarget(channel: NotifyChannel, to: string): string {
  const t = to.trim();
  if (channel === 'email') {
    const [u, d] = t.split('@');
    return d ? `${u.slice(0, 1)}***@${d}` : '***';
  }
  if (channel === 'sms') return `***${t.replace(/\D/g, '').slice(-4)}`;
  return `${t.slice(0, 2)}***`;
}

/** 测试身份：测试站 / 本机只发给这些 */
export async function isTestIdentity(channel: NotifyChannel, to: string): Promise<boolean> {
  if (channel === 'email') return testRecipientAllowed(to);
  if (channel === 'sms') return testPhoneAllowed(to).catch(() => false);
  return false;
}

async function log(m: NotifyMessage, status: NotifyStatus, error?: string | null): Promise<void> {
  await getPool()
    .query(
      `INSERT INTO notify_log (kind, channel, to_masked, subject, body, ref, dedupe_key, status, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [m.kind.slice(0, 60), m.channel, maskTarget(m.channel, m.to), m.subject?.slice(0, 300) ?? null, m.text.slice(0, 8000), m.ref ?? null, m.dedupeKey ?? null, status, error?.slice(0, 300) ?? null]
    )
    .catch((e) => console.error('[notify_log]', e instanceof Error ? e.message : 'error'));
}

/**
 * 过总闸发一条。send 只在允许真发时才被调用。
 * 返回 status：sent 真发了 / held 正式站总闸关着只记录 / blocked 测试站非测试身份只记录 / failed 发送出错 / duplicate 已发过或已记录过
 */
export async function gateSend(
  m: NotifyMessage,
  send: () => Promise<unknown>,
  opts: { existing?: boolean } = {}
): Promise<{ status: NotifyStatus }> {
  if (m.dedupeKey) {
    const { rows } = await getPool()
      .query(`SELECT 1 FROM notify_log WHERE dedupe_key = $1 AND status IN ('sent','held') LIMIT 1`, [m.dedupeKey])
      .catch(() => ({ rows: [] as unknown[] }));
    if (rows[0]) return { status: 'duplicate' };
  }
  let allowed: boolean;
  let stop: NotifyStatus;
  if (isProduction()) {
    // existing：改版前正式站就在发的通知（例如新咨询发到 info@ 的邮件），只是换了内容；不受总闸影响，避免改版后反而收不到。
    allowed = opts.existing ? true : await notifyLive();
    stop = 'held';
  } else {
    allowed = await isTestIdentity(m.channel, m.to);
    stop = 'blocked';
  }
  if (!allowed) {
    await log(m, stop);
    return { status: stop };
  }
  try {
    await send();
    await log(m, 'sent');
    return { status: 'sent' };
  } catch (e) {
    await log(m, 'failed', e instanceof Error ? e.message : 'send failed');
    return { status: 'failed' };
  }
}
