/**
 * 定时任务（每天早上一次）：生成待跟进任务（活动后希望了解、30 天内到期会员）+ AI 助手昨日汇总邮件。
 * 只查数据库、用模板写草稿，不调用任何 AI。鉴权同其他 cron：Authorization: Bearer <CRON_SECRET>。
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { recordException, scanFollowups } from '@/lib/crm/followups';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function matches(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

// AI 助手昨日汇总（lib/agent/digest.ts 合入后接上）
async function agentDigest(_now: Date): Promise<unknown> {
  return 'not_configured';
}

async function run(req: Request) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m || !(matches(m[1], process.env.CRON_SECRET) || matches(m[1], process.env.REMINDER_CRON_SECRET))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const out: Record<string, unknown> = {};
  try {
    out.followups = await scanFollowups();
  } catch (e) {
    await recordException('followup_scan', `followup_scan:${new Date().toISOString().slice(0, 10)}`, null, e instanceof Error ? e.message : 'error');
    out.followups = 'error';
  }
  try {
    out.agentDigest = await agentDigest(new Date());
  } catch (e) {
    await recordException('agent_digest', `agent_digest:${new Date().toISOString().slice(0, 10)}`, null, e instanceof Error ? e.message : 'error');
    out.agentDigest = 'error';
  }
  return NextResponse.json({ ok: true, ...out });
}
export const GET = run;
export const POST = run;
