/**
 * 定时任务（每天早上一次）：生成待跟进任务（活动后希望了解、30 天内到期会员）+ AI 助手昨日汇总邮件。
 * 只查数据库、用模板写草稿，不调用任何 AI。鉴权同其他 cron：Authorization: Bearer <CRON_SECRET>。
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { recordException, scanFollowups } from '@/lib/crm/followups';
import { runAgentDigest } from '@/lib/agent/digest';
import { laToday } from '@/lib/laDate';
import { runFeatureReport } from '@/lib/crm/features';
import { runPostEvent } from '@/lib/crm/postEvent';
import { runPrepReminders } from '@/lib/crm/prep';
import { runPayReminders } from '@/lib/crm/payLinks';
import { inferRegions } from '@/lib/crm/regions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function matches(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

// AI 助手昨日汇总：只查数据库，不调 AI；每天最多发一次
const agentDigest = (now: Date) => runAgentDigest(now);

async function run(req: Request) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m || !(matches(m[1], process.env.CRON_SECRET) || matches(m[1], process.env.REMINDER_CRON_SECRET))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const out: Record<string, unknown> = {};
  // 1.3.1 E：没填常驻地区的人按报名过的活动地区推断（参加一次外地活动不改）
  out.regions = await inferRegions().catch(() => 'error');
  try {
    out.followups = await scanFollowups();
  } catch (e) {
    await recordException('followup_scan', `followup_scan:${laToday()}`, null, e instanceof Error ? e.message : 'error');
    out.followups = 'error';
  }
  try {
    out.agentDigest = await agentDigest(new Date());
  } catch (e) {
    await recordException('agent_digest', `agent_digest:${laToday()}`, null, e instanceof Error ? e.message : 'error');
    out.agentDigest = 'error';
  }
  // 1.3 M：筹备清单提醒（截止前一天给负责人；活动前 2 天给东哥汇总）、收费活动未付提醒（活动前 5 天）——按规则发，不调 AI
  try {
    out.prep = await runPrepReminders(new Date());
  } catch (e) {
    await recordException('prep_reminder', `prep_reminder:${laToday()}`, null, e instanceof Error ? e.message : 'error');
    out.prep = 'error';
  }
  try {
    out.payReminders = await runPayReminders(new Date());
  } catch (e) {
    await recordException('pay_reminder', `pay_reminder:${laToday()}`, null, e instanceof Error ? e.message : 'error');
    out.payReminders = 'error';
  }
  // 邮件通讯：接着发东哥已确认、前一天额度用完没发完的期数（没确认的期数一封都不发）；月额度过 80% 提醒
  try {
    const { runNewsletterQueue } = await import('@/lib/crm/newsletter');
    out.newsletter = await runNewsletterQueue();
  } catch (e) {
    await recordException('newsletter_queue', `newsletter_queue:${laToday()}`, null, e instanceof Error ? e.message : 'error');
    out.newsletter = 'error';
  }
  // 1.3 J：活动结束后的自动整理（每场一次；AI 只写初稿，计入月预算）
  try {
    out.postEvent = await runPostEvent();
  } catch (e) {
    await recordException('post_event', `post_event:${laToday()}`, null, e instanceof Error ? e.message : 'error');
    out.postEvent = 'error';
  }
  // 1.3 L：每月 1 号的功能月报（只查数据库，不调 AI；同月只发一次）
  try {
    out.featureReport = await runFeatureReport(new Date());
  } catch (e) {
    await recordException('feature_report', `feature_report:${laToday().slice(0, 7)}`, null, e instanceof Error ? e.message : 'error');
    out.featureReport = 'error';
  }
  return NextResponse.json({ ok: true, ...out });
}
export const GET = run;
export const POST = run;
