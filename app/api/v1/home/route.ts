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
  const sp = new URL(req.url).searchParams;
  // 指令 25 性能：认人和研究与动态的显示范围先同时查；之后旧首页数据、入口顺序、新首页、商会风采、1.2 合规标记再同时查
  // （以前一句等一句；返回内容完全一样。显示范围必须在 home131 读研究与动态之前设好，所以放第一轮）
  const [me, vis] = await Promise.all([
    optionalContact(req),
    getSetting<Visibility>(getPool(), 'content_visibility', {}).catch(() => ({}))
  ]);
  // 研究与动态：小程序版显示范围（与 /api/v1/content/research 同一套过滤）
  setContentVisibility(vis);
  const v131 = sp.get('v') === '131';
  const [data, entriesOrder, h131, showcaseEntry, mp12] = await Promise.all([
    homeData(me, { base: siteUrl(req), withQr: sp.get('qr') !== '0' }),
    // 1.3 L：首页入口顺序（后台“功能排行”页调整，立即生效）
    homeEntriesOrder(),
    // 1.3.1 G：新首页（轮播、待办卡、近期活动、外地公告、照片墙、会员企业、知识与工具）；1.3.0 不带 v=131，不受影响
    v131 ? import('@/lib/crm/home131').then(({ home131 }) => home131(me, { region: sp.get('region'), client14: isMp14(req) })) : Promise.resolve(undefined),
    // 1.5.0：首页「商会风采」入口（东哥 11/14 10:55 点头）——后台开关默认开；还没有一家可展示的单位时不显示（免得点进去是空页）
    v131
      ? Promise.all([
          getSetting<boolean>(getPool(), 'showcase_home_entry', true),
          getPool().query(`SELECT 1 FROM showcase_orgs WHERE NOT hidden LIMIT 1`)
        ]).then(([on, r]) => on === true && (r.rowCount ?? 0) > 0)
      : Promise.resolve(undefined),
    isMp12(req)
  ]);
  const research = sp.get('client') === 'web' ? [] : contentResearchList().items.slice(0, 6);
  // 小程序 1.2：状态卡、近期活动、上一场回顾的简介里不带金额
  const out: Record<string, unknown> = { ...data, research, entriesOrder };
  if (v131) {
    out.h131 = h131;
    out.showcaseEntry = showcaseEntry;
  }
  const safe = mp12 ? noMoneySummaries(out) : out;
  return ok(isMp131(req) ? mp131Safe(safe) : safe);
});
