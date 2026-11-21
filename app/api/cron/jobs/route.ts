/**
 * 找工人 · 接活 定时任务（Authorization: Bearer <CRON_SECRET 或 REMINDER_CRON_SECRET>；测试站（VERCEL_ENV=preview）另认 JOBS_CRON_TEST_SECRET，正式环境不认）
 * ?task=dispatch —— 漏发的第一批 + 24 小时没人联系发第二批并提醒工作人员（排队的 CSLB 比对 D20 起交给 GitHub runner）（.github/workflows/jobs-dispatch.yml：每 15 分钟；daily 每天、weekly 每周二）
 * ?task=daily    —— 14 天到期下架、第 12 天提醒续期、第 7 天回访、90 天复核、执照到期下架
 * ?task=weekly   —— 指令 7 · D20 起不再在这里下载 CSLB 总表：每周比对改由 .github/workflows/jobs-cslb-weekly.yml 在 GitHub runner 上下载，
 *                    把对得上的行交给 /api/cron/jobs/cslb-ingest。这里只回一句说明（旧的调用不报错）。
 * 发消息全部经过 lib/jobs/notify.ts 的保险：正式环境开关都开才发；其它环境只发测试身份。
 */
import { NextResponse } from 'next/server';
import { recordException } from '@/lib/crm/followups';
import { laToday } from '@/lib/laDate';
import { runDispatch, runExpiry, runFollowups } from '@/lib/jobs/notify';
import { runVerification } from '@/lib/jobs/verify';
import { jobsCronAuthorized } from '@/lib/jobs/cronAuth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function step(out: Record<string, unknown>, name: string, fn: () => Promise<unknown>) {
  try {
    out[name] = await fn();
  } catch (e) {
    await recordException(`jobs_cron_${name}`, `jobs_cron_${name}:${laToday()}`, null, e instanceof Error ? e.message : 'error');
    out[name] = 'error';
  }
}

async function run(req: Request) {
  // D14：测试站专用密钥只在 Preview 认（见 lib/jobs/cronAuth.ts）
  if (!jobsCronAuthorized(req)) {
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
    out.verify = 'moved_to_github_runner'; // D20：见 .github/workflows/jobs-cslb-weekly.yml
  } else {
    return NextResponse.json({ ok: false, error: { code: 'bad_request', message: 'task 只能是 dispatch、daily、weekly' } }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...out }, { headers: { 'Cache-Control': 'no-store' } });
}
export const GET = run;
export const POST = run;
