/** 1.3 L 功能排行（ops）
 *  GET  /api/v1/staff/features?days=7|30&eventId= —— 每个功能：用了多少次 / 多少人；带来访问 → 报名 → 到场 → 入会 → 有效咨询
 *  GET  /api/v1/staff/features?report=1 —— 预览本月功能月报（不发送）
 *  POST —— 1.4.0 起停用（东哥已点头：首页顺序按冻结清单固定，后台不再调，只看点击数据） */
import { HOME_ENTRIES, buildFeatureReport, featureRanking, homeEntriesOrder } from '@/lib/crm/features';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const sp = new URL(req.url).searchParams;
  if (sp.get('report') === '1') return ok({ report: await buildFeatureReport() });
  const ev = sp.get('eventId');
  const w = { days: ev ? null : Number(sp.get('days') ?? 30) || null, eventId: ev && /^[0-9a-f-]{36}$/.test(ev) ? ev : null };
  return ok({ ...(await featureRanking(w)), homeEntries: HOME_ENTRIES, homeOrder: await homeEntriesOrder() });
});
export const POST = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  throw new CrmError('bad_request', '小程序首页入口顺序已按冻结清单固定，后台不能再调。要改请先请东哥同意，再改 docs/HOME_ENTRIES.md。');
});
