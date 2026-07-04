/**
 * 每日 Cron：会员到期 / semiAnnual 第二期付款提醒（Gate 2 · M7）。
 * ------------------------------------------------------------------
 * 鉴权：Authorization: Bearer <CRON_SECRET>，常量时间比对；
 *   token 只从 env 读、不入 URL query、不入库、不打日志。
 * 触发：vercel.json crons（每日 America/Los_Angeles 上午一次，见 vercel.json）。
 * 幂等：由 lib/membership/reminders 内 reminder_log claim-before-send 保证；
 *   同一天重复触发不重复发信。
 * 只发提醒，不做任何自动扣款 / 自动续费 / 自动取消 / 自动退款。
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { runMembershipReminders } from '@/lib/membership/reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 常量时间比对：两侧各取 sha256 再 timingSafeEqual（等长，不泄露长度）。 */
function tokenMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function authorize(req: Request): { ok: true } | { ok: false; status: number } {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // 未配置 → 拒绝，绝不裸奔开放。
    return { ok: false, status: 401 };
  }
  const header = req.headers.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return { ok: false, status: 401 };
  }
  if (!tokenMatches(m[1], expected)) {
    return { ok: false, status: 403 };
  }
  return { ok: true };
}

export async function GET(req: Request): Promise<NextResponse> {
  const auth = authorize(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
  }
  try {
    const summary = await runMembershipReminders();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    // 不外泄内部细节；不打 token。
    return NextResponse.json({ error: 'reminder_run_failed' }, { status: 500 });
  }
}

// Vercel Cron 以 GET 触发；显式拒绝其它方法。
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
}
