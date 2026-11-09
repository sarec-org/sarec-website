/**
 * 定时任务：活动提醒（微信订阅消息，开课前 1 天 / 前 2 小时）。
 * 鉴权：Authorization: Bearer <REMINDER_CRON_SECRET 或 CRON_SECRET>，常量时间比对；不入 URL、不打日志。
 * 触发：外部定时服务每 5 分钟一次；GitHub Actions 每 15 分钟、Vercel Cron 每天 20:00/22:00 UTC 兜底。重复触发不会重复推送。
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { runEventReminders } from '@/lib/crm/reminders';
import { checkTwilioBalanceDaily } from '@/lib/crm/twilioBalance';
import { runConfirmTimeline } from '@/lib/crm/seats';

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
    // 1.3.1 B：活动前确认时间线（东哥在后台打开前什么都不做）；先跑，用掉的订阅授权不再拿来发普通提醒
    const confirm = await runConfirmTimeline().catch((e) => ({ error: e instanceof Error ? e.message.slice(0, 60) : 'error' }));
    const reminders = await runEventReminders();
    // 每天一次：Twilio 余额低于 $10 发邮件提醒
    const twilio = await checkTwilioBalanceDaily().catch(() => ({ status: 'error' as const }));
    return NextResponse.json({ ok: true, ...reminders, confirm, twilio: twilio.status });
  } catch (e) {
    console.error('[cron/event-reminders]', e instanceof Error ? e.message : 'error');
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
export const GET = run;
export const POST = run;
