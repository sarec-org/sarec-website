/** GET /api/v1/home —— 1.2 首页服务台（小程序首页、网站手机版共用）：状态卡、近期活动、上一场回顾、研究与动态、相册通知 */
import { homeData } from '@/lib/crm/growth';
import { handler, ok, optionalContact, siteUrl } from '@/lib/crm/http';
import { contentResearchList } from '@/lib/mpContent';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await optionalContact(req);
  const sp = new URL(req.url).searchParams;
  const data = await homeData(me, { base: siteUrl(req), withQr: sp.get('qr') !== '0' });
  // 研究与动态：小程序版显示范围（与 /api/v1/content/research 同一套过滤）
  const research = sp.get('client') === 'web' ? [] : (await contentResearchList()).items.slice(0, 6);
  return ok({ ...data, research });
});
