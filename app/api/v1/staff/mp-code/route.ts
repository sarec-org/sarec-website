/**
 * 指令 89-B.1：后台「设置」页最上面「常用」一排用的小程序首页码 + 小程序链接。
 * - GET /api/v1/staff/mp-code            → 小程序首页码 PNG（扫码进 pages/home/home），直接下载。
 *   用现有的 miniProgramPathCode（wxacode.get）；它生成成功后永久存一份到 Blob（lib/crm/wechat.ts storeCode），
 *   以后同一个码直接用存好的，不再调微信、不占总量。
 *   服务器没配小程序密钥（本机 / 没配的预览）时，和渠道码一样给一张写着 SAREC-TEST:路径 的测试码（不是小程序码，只用来走通流程）。
 * - GET /api/v1/staff/mp-code?info=1     → { appid, path, name, test }：「复制小程序路径（给技术 / 公众号配菜单用）」用（原名「复制小程序链接」，验收 P2-3 改名）。
 *   现在服务器没有生成短链接 / URL Link 的能力（要调新的微信接口，按总则第六条先要东哥点头），
 *   所以复制的是“小程序 AppID + 首页路径”——公众号文章、菜单、视频号挂小程序时就是填这两项。AppID 是公开信息，不是密钥。
 * 所有工作人员都能用（签到员、财务也可能要发码）。
 */
import QRCode from 'qrcode';
import { handler, requireStaffAny } from '@/lib/crm/http';
import { wxConfigured } from '@/lib/crm/wechat';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOME = 'pages/home/home';

export const GET = handler(async (req: Request) => {
  await requireStaffAny(req, ['admin', 'ops', 'checkin', 'finance']);
  const test = !wxConfigured();
  if (new URL(req.url).searchParams.get('info')) {
    return Response.json({ ok: true, appid: process.env.WX_APPID || 'wx344abd2e9dd60794', path: HOME, name: '中美房地产商会 SAREC', test });
  }
  let png: Buffer;
  if (test) {
    png = await QRCode.toBuffer(`SAREC-TEST:${HOME}`, { margin: 1, width: 900 });
  } else {
    const { miniProgramPathCode } = await import('@/lib/crm/wechat');
    png = await miniProgramPathCode(HOME, 'staff home code');
  }
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `attachment; filename="sarec-miniprogram${test ? '-TEST' : ''}.png"`
    }
  });
});
