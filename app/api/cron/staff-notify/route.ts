/**
 * 后台综合优化 五、六、八：每 15 分钟跑一次（GitHub Actions staff-notify.yml 触发；Vercel 免费版定时任务一天一次不够用）。
 * - 早 8 点以后：把夜里攒的通知合成一条发出去；
 * - 洛杉矶 8:30 以后：每日汇总（每人每天一条；没有待办不发）；
 * - 活动结束自动变“已结束”；审核演示 / 测试账号自动打标记。
 * 所有发送都过通知总闸（关着只记录）。鉴权同其他 cron：Authorization: Bearer <CRON_SECRET 或 REMINDER_CRON_SECRET>。
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { flushHeld, runDigest } from '@/lib/crm/staffNotify';
import { autoCompleteEvents } from '@/lib/crm/eventFlow';
import { syncAccountKinds } from '@/lib/crm/accountKind';
import { recordException } from '@/lib/crm/followups';
import { laToday } from '@/lib/laDate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function matches(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

async function step<T>(name: string, fn: () => Promise<T>): Promise<T | 'error'> {
  try {
    return await fn();
  } catch (e) {
    await recordException('staff_notify', `staff_notify:${name}:${laToday()}`, null, e instanceof Error ? e.message : 'error');
    return 'error';
  }
}

async function run(req: Request) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m || !(matches(m[1], process.env.CRON_SECRET) || matches(m[1], process.env.REMINDER_CRON_SECRET))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const now = new Date();
  return NextResponse.json({
    ok: true,
    accountKinds: await step('accounts', () => syncAccountKinds()),
    events: await step('events', () => autoCompleteEvents(now)),
    held: await step('held', () => flushHeld(now)),
    digest: await step('digest', () => runDigest(now))
  });
}
export const GET = run;
export const POST = run;
