/**
 * 定时任务：活动提醒（微信订阅消息，开课前 1 天 / 前 2 小时）。
 * 鉴权：Authorization: Bearer <REMINDER_CRON_SECRET 或 CRON_SECRET>，常量时间比对；不入 URL、不打日志。
 * 触发：GitHub Actions 每 15 分钟一次（.github/workflows/event-reminders.yml）。重复触发不会重复推送。
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { runEventReminders } from '@/lib/crm/reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function matches(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

async function run(req: Request) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m || !(matches(m[1], process.env.REMINDER_CRON_SECRET) || matches(m[1], process.env.CRON_SECRET))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runEventReminders()) });
  } catch (e) {
    console.error('[cron/event-reminders]', e instanceof Error ? e.message : 'error');
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
export const GET = run;
export const POST = run;
