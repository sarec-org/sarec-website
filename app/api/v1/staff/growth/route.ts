/** GET /api/v1/staff/growth?days=30 —— 点击统计 + 推荐排行 + 专委会意向（ops）
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
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30));
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
