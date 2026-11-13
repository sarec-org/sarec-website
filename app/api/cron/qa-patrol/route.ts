/**
 * 线上只读巡检（定时任务）：每天一次（Vercel cron）+ 每次正式站部署成功后一次（GitHub Actions 触发）。
 * 鉴权：Authorization: Bearer <CRON_SECRET 或 REMINDER_CRON_SECRET>，常量时间比对；不入 URL、不打日志。
 * 巡检对象是本站自己（正式站巡正式站，预览站巡预览站）。只发 GET，不写业务数据，只记一条巡检结果。
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { siteUrl } from '@/lib/crm/http';
import { patrolAndRecord } from '@/lib/qa/patrolRun';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function matches(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  return timingSafeEqual(createHash('sha256').update(provided).digest(), createHash('sha256').update(expected).digest());
}
async function run(req: Request) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m || !(matches(m[1], process.env.CRON_SECRET) || matches(m[1], process.env.REMINDER_CRON_SECRET))) return NextResponse.json({ ok: false }, { status: 401 });
  const t = new URL(req.url).searchParams.get('trigger');
  const trigger = t === 'deploy' || t === 'manual' ? t : 'daily';
  const r = await patrolAndRecord(siteUrl(req), trigger);
  return NextResponse.json({ ok: true, total: r.total, failed: r.failed, emailed: r.emailed, bad: r.results.filter((x) => !x.ok).map((x) => `${x.name}：${x.detail}`) });
}
export const GET = run;
export const POST = run;
