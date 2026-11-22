/**
 * 指令 7 · D20：每周牌照比对改到 GitHub（.github/workflows/jobs-cslb-weekly.yml + scripts/jobs-cslb-runner.mjs）。
 * 鉴权同 /api/cron/jobs（REMINDER_CRON_SECRET；测试站另认 JOBS_CRON_TEST_SECRET）。
 * GET  ?mode=queued|weekly —— 要在 CSLB 总表里找的牌照号 { numbers:[...] }（只有号码）
 * POST { failed:true, error } —— runner 下载失败：记一条待跟进给工作人员，不动任何人
 * POST { mode, header, lines:[...], scanned } —— runner 只送对得上的那几行原文 + 一共读了多少行；
 *       服务器比对状态 / 到期 / 类别 / 工伤保险 / 保证金，过期或被停自动下架并通知（总表读到不足 5 万行 = 没下完整，整批不认）。
 */
import { NextResponse } from 'next/server';
import { recordException } from '@/lib/crm/followups';
import { CrmError } from '@/lib/crm/events';
import { laToday } from '@/lib/laDate';
import { jobsCronAuthorized } from '@/lib/jobs/cronAuth';
import { cslbNumbers, ingestCslb } from '@/lib/jobs/verify';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(req: Request) {
  if (!jobsCronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const mode = new URL(req.url).searchParams.get('mode') === 'weekly' ? 'weekly' : 'queued';
  return NextResponse.json({ ok: true, mode, numbers: await cslbNumbers(mode) }, noStore);
}

export async function POST(req: Request) {
  if (!jobsCronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (b?.failed) {
    // runner 下载总表失败：转工作人员人工核对（不动任何人的状态）
    const why = String(b.error ?? 'error').slice(0, 120);
    await recordException('jobs_cslb', `jobs_cslb:${laToday()}`, null, `CSLB 官方名单在 GitHub 上下载失败（${why}），请在「接活人核验」里一键打开详情页人工核对`, {});
    return NextResponse.json({ ok: true, recorded: true }, noStore);
  }
  try {
    return NextResponse.json({ ok: true, ...(await ingestCslb(b ?? {})) }, noStore);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    if (e instanceof CrmError) {
      await recordException('jobs_cslb', `jobs_cslb:${laToday()}`, null, `CSLB 每周比对没做成（${msg.slice(0, 120)}），请在「接活人核验」里一键打开详情页人工核对`, {}).catch(() => undefined);
      return NextResponse.json({ ok: false, error: { code: e.code, message: msg } }, { status: 400 });
    }
    throw e;
  }
}
