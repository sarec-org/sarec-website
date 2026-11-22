/**
 * 后台综合优化 五.7：手机通知设置（「设置与团队 → 手机通知」）。
 * GET —— 我的（管理员：所有人的）渠道和收哪几类、规则说明、总闸状态、最近的通知；管理员另带“本该发什么”的记录（收件人打码）。
 * POST { staffKey?, channel?, categories?, wecomUserid?, owner?, reset? } —— 改自己的（管理员可改所有人、指定谁是负责人）。
 * POST { action: 'live', on } —— 管理员开关通知总闸（打开要东哥点头）。
 */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaffAny } from '@/lib/crm/http';
import { notifySettings, recentNotices, saveNotifyPrefs } from '@/lib/crm/staffNotify';
import { recentNotifyLog, setNotifyLive } from '@/lib/crm/notifySend';
import { actor } from '@/lib/crm/staff';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await requireStaffAny(req, ['ops', 'checkin', 'finance']);
  const isAdmin = s.roles.includes('admin');
  return ok({
    ...(await notifySettings(s.email, isAdmin)),
    isAdmin,
    notices: await recentNotices(s.email, isAdmin, 30),
    log: isAdmin ? await recentNotifyLog(50) : []
  });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaffAny(req, ['ops', 'checkin', 'finance']);
  const isAdmin = s.roles.includes('admin');
  const b = await body<{ action?: string; on?: boolean; staffKey?: string; channel?: string; categories?: unknown; wecomUserid?: string | null; owner?: boolean; reset?: boolean }>(req);
  if (b.action === 'live') {
    if (!isAdmin) throw new CrmError('forbidden', '只有管理员能开关通知总闸');
    await setNotifyLive(b.on === true, actor(s));
    return ok({ ok: true, live: b.on === true });
  }
  return ok(await saveNotifyPrefs({ key: s.email, name: s.name, isAdmin }, b));
});
