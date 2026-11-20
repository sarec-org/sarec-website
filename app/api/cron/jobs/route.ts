/**
 * 找工人 · 接活 定时任务（Authorization: Bearer <CRON_SECRET 或 REMINDER_CRON_SECRET>；测试站（VERCEL_ENV=preview）另认 JOBS_CRON_TEST_SECRET，正式环境不认）
 * ?task=dispatch —— 漏发的第一批 + 24 小时没人联系发第二批并提醒工作人员 + 处理排队的 CSLB 比对（.github/workflows/jobs-dispatch.yml：每 15 分钟；daily 每天、weekly 每周二）
 * ?task=daily    —— 14 天到期下架、第 12 天提醒续期、第 7 天回访、90 天复核、执照到期下架
 * ?task=weekly   —— 全部已通过的 A 类接活人重新对一次 CSLB 官方总表
 * 发消息全部经过 lib/jobs/notify.ts 的保险：正式环境开关都开才发；其它环境只发测试身份。
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { recordException } from '@/lib/crm/followups';
import { laToday } from '@/lib/laDate';
import { runDispatch, runExpiry, runFollowups } from '@/lib/jobs/notify';
import { runVerification } from '@/lib/jobs/verify';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function matches(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  return timingSafeEqual(createHash('sha256').update(provided).digest(), createHash('sha256').update(expected).digest());
}

async function step(out: Record<string, unknown>, name: string, fn: () => Promise<unknown>) {
  try {
    out[name] = await fn();
  } catch (e) {
    await recordException(`jobs_cron_${name}`, `jobs_cron_${name}:${laToday()}`, null, e instanceof Error ? e.message : 'error');
    out[name] = 'error';
  }
}

async function run(req: Request) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  // D14：测试站专用密钥，只在 Preview 认（正式环境即使误配了也不认）
  const testSecret = process.env.VERCEL_ENV === 'preview' ? process.env.JOBS_CRON_TEST_SECRET : undefined;
  if (!m || !(matches(m[1], process.env.CRON_SECRET) || matches(m[1], process.env.REMINDER_CRON_SECRET) || matches(m[1], testSecret))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const task = new URL(req.url).searchParams.get('task') ?? 'dispatch';
  const out: Record<string, unknown> = { task };
  if (task === 'dispatch') {
    await step(out, 'dispatch', () => runDispatch());
    await step(out, 'verify', () => runVerification(new Date(), { onlyQueued: true }));
  } else if (task === 'daily') {
    await step(out, 'dispatch', () => runDispatch());
    await step(out, 'expiry', () => runExpiry());
    await step(out, 'followups', () => runFollowups());
    await step(out, 'verify', () => runVerification());
  } else if (task === 'weekly') {
    await step(out, 'verify', () => runVerification(new Date(), { weekly: true }));
  } else {
    return NextResponse.json({ ok: false, error: { code: 'bad_request', message: 'task 只能是 dispatch、daily、weekly' } }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...out }, { headers: { 'Cache-Control': 'no-store' } });
}
export const GET = run;
export const POST = run;
