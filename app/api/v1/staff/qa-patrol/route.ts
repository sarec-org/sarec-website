/** GET /api/v1/staff/qa-patrol —— 最近一次线上巡检（后台首页红条用）；POST { action: 'run' } 手动巡检一次（管理员）；POST { action: 'email', on } 开关巡检邮件（管理员，默认关） */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff, requireStaffAny, siteUrl } from '@/lib/crm/http';
import { getSetting, setSetting } from '@/lib/crm/orders';
import { getPool } from '@/lib/db/client';
import { latestRun, patrolAndRecord } from '@/lib/qa/patrolRun';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function state() {
  const r = await latestRun();
  return {
    run: r ? { at: r.created_at, trigger: r.trigger, total: r.total, failed: r.failed, bad: r.results.filter((x) => !x.ok) } : null,
    email: { on: await getSetting<boolean>(getPool(), 'patrol_email_enabled', false), to: process.env.ALERT_EMAIL ? '已设置' : '没设置（Vercel 环境变量 ALERT_EMAIL）' }
  };
}
export const GET = handler(async (req: Request) => {
  await requireStaffAny(req, ['ops', 'checkin', 'finance', 'admin']);
  return ok(await state());
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'admin');
  const b = await body<{ action?: string; on?: boolean }>(req);
  if (b.action === 'run') { await patrolAndRecord(siteUrl(req), 'manual'); return ok(await state()); }
  if (b.action === 'email') { await setSetting(getPool(), 'patrol_email_enabled', b.on === true, s.email); return ok(await state()); }
  throw new CrmError('bad_request', '不认识的操作');
});
