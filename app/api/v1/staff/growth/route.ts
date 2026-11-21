/** GET /api/v1/staff/growth?days=30 —— 点击统计 + 推荐排行 + 专委会意向（ops）
 *  ?only=settings 只要配置（设置与团队）；?only=stats 只要统计（数据）
 *  POST { key, value } —— 1.2 配置（商会微信二维码、视频号 ID、专委会、内容显示范围、会议室说明 / 地址）；multipart file —— 上传商会微信二维码 */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { referralLeaderboard, trackStats } from '@/lib/crm/growth';
import { uploadImage } from '@/lib/crm/photos';
import { committeeInterestStats, growthSettings, updateGrowthSetting } from '@/lib/crm/staff12';
import { wecomStatus } from '@/lib/wecom';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const sp = new URL(req.url).searchParams;
  // 后台综合优化 11/21：「设置与团队」只要配置（不算统计）；「数据」页只要统计
  if (sp.get('only') === 'settings') return ok({ committees: await committeeInterestStats(), settings: await growthSettings(), wecom: await wecomStatus() });
  const days = Math.min(365, Math.max(1, Number(sp.get('days')) || 30));
  if (sp.get('only') === 'stats') return ok({ track: await trackStats(days), referrals: await referralLeaderboard(days) });
  return ok({ track: await trackStats(days), referrals: await referralLeaderboard(days), committees: await committeeInterestStats(), settings: await growthSettings(), wecom: await wecomStatus() });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
    const f = (await req.formData()).get('file');
    if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选择二维码图片');
    const url = await uploadImage('qr', Buffer.from(await f.arrayBuffer()), { maxSide: 800, png: true });
    await updateGrowthSetting(s, 'wechat_qr_url', url);
    return ok({ url });
  }
  const b = await body<{ key?: string; value?: unknown }>(req);
  return ok(await updateGrowthSetting(s, String(b.key ?? ''), b.value));
});
