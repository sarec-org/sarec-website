/** 1.3 L 功能排行（ops）
 *  GET  /api/v1/staff/features?days=7|30&eventId= —— 每个功能：用了多少次 / 多少人；带来访问 → 报名 → 到场 → 入会 → 有效咨询
 *  GET  /api/v1/staff/features?report=1 —— 预览本月功能月报（不发送）
 *  POST /api/v1/staff/features { homeOrder: string[] } —— 调整首页入口顺序（小程序立即生效） */
import { HOME_ENTRIES, buildFeatureReport, featureRanking, homeEntriesOrder, setHomeEntriesOrder } from '@/lib/crm/features';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
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
  const s = await requireStaff(req, 'ops');
  const b = await body<{ homeOrder?: unknown }>(req);
  return ok({ homeOrder: await setHomeEntriesOrder(b.homeOrder, actor(s)) });
});
