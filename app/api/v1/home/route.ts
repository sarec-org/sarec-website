/** GET /api/v1/home —— 1.2 首页服务台（小程序首页、网站手机版共用）：状态卡、近期活动、上一场回顾、研究与动态、相册通知 */
import { homeData } from '@/lib/crm/growth';
import { handler, isMp12, ok, optionalContact, siteUrl } from '@/lib/crm/http';
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
  const out = { ...data, research, entriesOrder: await homeEntriesOrder() };
  return ok((await isMp12(req)) ? noMoneySummaries(out) : out);
});
