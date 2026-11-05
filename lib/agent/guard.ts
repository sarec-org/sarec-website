/**
 * AI 助手 —— 区分刷屏和真实访客。
 *   普通访客：每天 30 条（cookie 与 IP 哈希分别计数）。会员 / 已报名 / 已登录：不限条数。
 *   可疑（秒级连发、重复、无意义、超长粘贴）：降速（429 + retryAfter）+ Cloudflare Turnstile 人机验证（已配置时）。
 *   确认机器人（爬虫 UA、蜜罐字段、人机验证反复失败）：直接拦截，不调模型。
 */
import { getPool } from '@/lib/db/client';
import { LIMITS, ipSalt, turnstileConfigured } from './config';
import { laDay, sha256 } from './text';

export type RateRow = {
  key: string;
  count: number;
  last_at: Date | null;
  burst_start: Date | null;
  burst_count: number;
  last_hash: string | null;
  repeat_count: number;
  strikes: number;
  verified_until: Date | null;
  turnstile_fails: number;
  blocked: boolean;
};

export type Suspicion = 'burst' | 'interval' | 'repeat' | 'meaningless' | 'long';

export function emptyRow(key: string): RateRow {
  return { key, count: 0, last_at: null, burst_start: null, burst_count: 0, last_hash: null, repeat_count: 0, strikes: 0, verified_until: null, turnstile_fails: 0, blocked: false };
}

/** 纯函数：根据这条消息更新计数，并给出可疑原因。 */
export function assess(row: RateRow, now: Date, msgHash: string, flags: { meaningless: boolean; long: boolean }): { row: RateRow; reasons: Suspicion[] } {
  const r = { ...row };
  const reasons: Suspicion[] = [];
  const t = now.getTime();
  if (r.last_at && t - new Date(r.last_at).getTime() < LIMITS.minIntervalMs) reasons.push('interval');
  if (!r.burst_start || t - new Date(r.burst_start).getTime() > LIMITS.burstWindowSec * 1000) {
    r.burst_start = now;
    r.burst_count = 1;
  } else {
    r.burst_count += 1;
    if (r.burst_count > LIMITS.burstMax) reasons.push('burst');
  }
  if (r.last_hash === msgHash) {
    r.repeat_count += 1;
    if (r.repeat_count >= 2) reasons.push('repeat');
  } else r.repeat_count = 0;
  r.last_hash = msgHash;
  r.last_at = now;
  if (flags.meaningless) reasons.push('meaningless');
  if (flags.long) reasons.push('long');
  return { row: r, reasons };
}

export const isVerified = (r: RateRow, now: Date) => !!r.verified_until && new Date(r.verified_until).getTime() > now.getTime();

export function clientIp(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
}

/** IP 只存加盐哈希，且按天换盐（跨天无法关联）。 */
export function ipHash(ip: string | null, day: string): string | null {
  return ip ? sha256(`${ipSalt()}|${day}|${ip}`).slice(0, 32) : null;
}

export async function loadRows(keys: string[], day: string): Promise<RateRow[]> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO agent_rate (key, day) SELECT k, $2::date FROM unnest($1::text[]) AS k ON CONFLICT (key, day) DO NOTHING`,
    [keys, day]
  );
  const { rows } = await pool.query<RateRow>(
    `SELECT key, count, last_at, burst_start, burst_count, last_hash, repeat_count, strikes, verified_until, turnstile_fails, blocked
       FROM agent_rate WHERE day = $2::date AND key = ANY($1::text[])`,
    [keys, day]
  );
  return keys.map((k) => rows.find((r) => r.key === k) ?? emptyRow(k));
}

export async function saveRow(r: RateRow, day: string): Promise<void> {
  await getPool().query(
    `UPDATE agent_rate SET count = $3, last_at = $4, burst_start = $5, burst_count = $6, last_hash = $7, repeat_count = $8,
            strikes = $9, verified_until = $10, turnstile_fails = $11, blocked = $12
      WHERE key = $1 AND day = $2::date`,
    [r.key, day, r.count, r.last_at, r.burst_start, r.burst_count, r.last_hash, r.repeat_count, r.strikes, r.verified_until, r.turnstile_fails, r.blocked]
  );
}

export async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  if (!turnstileConfigured() || !token) return false;
  try {
    const form = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY as string, response: token.slice(0, 2048) });
    if (ip) form.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, cache: 'no-store' });
    const j = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return j?.success === true;
  } catch {
    return false;
  }
}

export const today = () => laDay();
