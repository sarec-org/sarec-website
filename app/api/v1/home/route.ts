/** GET /api/v1/home —— 1.2 首页服务台（小程序首页、网站手机版共用）：状态卡、近期活动、上一场回顾、研究与动态、相册通知 */
import { homeData } from '@/lib/crm/growth';
import { handler, isMp12, isMp131, isMp14, mp131Safe, ok, optionalContact, siteUrl } from '@/lib/crm/http';
import { noMoneySummaries } from '@/lib/noMoney';
import { homeEntriesOrder } from '@/lib/crm/features';
import { contentResearchList, setContentVisibility, type Visibility } from '@/lib/mpContent';
import { getSetting } from '@/lib/crm/orders';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await optionalContact(req);
  const sp = new URL(req.url).searchParams;
  const data = await homeData(me, { base: siteUrl(req), withQr: sp.get('qr') !== '0' });
  // 研究与动态：小程序版显示范围（与 /api/v1/content/research 同一套过滤）
  setContentVisibility(await getSetting<Visibility>(getPool(), 'content_visibility', {}).catch(() => ({})));
  const research = sp.get('client') === 'web' ? [] : contentResearchList().items.slice(0, 6);
  // 小程序 1.2：状态卡、近期活动、上一场回顾的简介里不带金额
  // 1.3 L：首页入口顺序（后台“功能排行”页调整，立即生效）
  const out: Record<string, unknown> = { ...data, research, entriesOrder: await homeEntriesOrder() };
  // 1.3.1 G：新首页（轮播、待办卡、近期活动、外地公告、照片墙、会员企业、知识与工具）；1.3.0 不带 v=131，不受影响
  if (sp.get('v') === '131') {
    const { home131 } = await import('@/lib/crm/home131');
    out.h131 = await home131(me, { region: sp.get('region'), client14: isMp14(req) });
  }
  const safe = (await isMp12(req)) ? noMoneySummaries(out) : out;
  return ok(isMp131(req) ? mp131Safe(safe) : safe);
});
