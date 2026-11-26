/** GET /api/v1/home —— 1.2 首页服务台（小程序首页、网站手机版共用）：状态卡、近期活动、上一场回顾、研究与动态、相册通知 */
import { homeData } from '@/lib/crm/growth';
import { handler, isMp12, isMp131, isMp14, mp131Safe, mpVersion, ok, optionalContact, siteUrl } from '@/lib/crm/http';
import { noMoneySummaries } from '@/lib/noMoney';
import { homeEntriesOrder } from '@/lib/crm/features';
import { contentResearchList, setContentVisibility, type Visibility } from '@/lib/mpContent';
import { getSetting } from '@/lib/crm/orders';
import { getPool } from '@/lib/db/client';
import { retryPendingSoon } from '@/lib/crm/imageGate';
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
  // 指令 55：本人打开小程序首页时，顺手把卡住的图重交微信检测（和下面的取数同时跑，2 分钟一次）
  const retry = me && mpVersion(req) ? retryPendingSoon(me) : Promise.resolve();
  const v131 = sp.get('v') === '131';
  const [data, entriesOrder, h131, showcaseEntry, mp12, launch] = await Promise.all([
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
    isMp12(req),
    // 1.7.0：首页「我来发起」四张大卡的文字（crm_settings.home_launch）；没有这条设置就不返回，小程序用包里的默认文字
    getSetting<unknown>(getPool(), 'home_launch', null).then(launchCards).catch(() => null)
  ]);
  const research = sp.get('client') === 'web' ? [] : contentResearchList().items.slice(0, 6);
  // 小程序 1.2：状态卡、近期活动、上一场回顾的简介里不带金额
  const out: Record<string, unknown> = { ...data, research, entriesOrder };
  if (launch) out.launch = launch;
  if (v131) {
    out.h131 = h131;
    out.showcaseEntry = showcaseEntry;
  }
  const safe = mp12 ? noMoneySummaries(out) : out;
  await retry;
  return ok(isMp131(req) ? mp131Safe(safe) : safe);
});

/** 「我来发起」大卡：只认这四个 key；每项要有 t / words（字符串），tag / foot / go 可选（go = 卡底那行字，不带小程序卡底那行就不显示，配置时要带上）；不合格的项丢掉，一项都不剩就当没设置 */
const LAUNCH_KEYS = ['l-event', 'l-meetup', 'l-card', 'l-invite'];
function launchCards(v: unknown) {
  if (!Array.isArray(v)) return null;
  const s = (x: unknown, n: number) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
  const out = v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && LAUNCH_KEYS.includes(String((x as Record<string, unknown>).key)))
    .map((x) => {
      const item: Record<string, string> = { key: String(x.key), t: s(x.t, 20), tag: s(x.tag, 20), words: s(x.words, 80) };
      if (s(x.foot, 40)) item.foot = s(x.foot, 40);
      if (s(x.go, 40)) item.go = s(x.go, 40); // 卡底那行字（例如「选模板，1 分钟发布 ›」）
      return item;
    })
    .filter((x) => x.t && x.words);
  return out.length ? out : null;
}
