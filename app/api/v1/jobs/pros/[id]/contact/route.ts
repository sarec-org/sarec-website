/**
 * POST /api/v1/jobs/pros/:id/contact —— 找工人的人点“联系”：给电话（和微信号）。
 * 指令 7 · D17：不用登录、不用验证手机（小程序、网站游客都能点）；每次点击都记录（登录的记档案，游客记 IP 哈希）。
 * 频率限制：同一身份（游客按同一 IP）1 小时最多 20 个不同的接活人、24 小时最多 60 个；超了 429 too_many_attempts「查看太频繁了，请稍后再试，或加商会微信」。
 */
import { handler, ok } from '@/lib/crm/http';
import { requireSide, viewer } from '@/lib/jobs/access';
import { clickIpHash, contactPro } from '@/lib/jobs/pros';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const v = await viewer(req);
  requireSide(v, 'find');
  return ok(await contactPro(params.id, v, clickIpHash(req)));
});
