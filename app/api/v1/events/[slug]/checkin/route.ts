/** POST /api/v1/events/:slug/checkin { k, name?, roleSub? } —— 扫码签到（所有路径统一走 checkIn 入场判断） */
import { withTransaction } from '@/lib/db/client';
import { CrmError, checkIn } from '@/lib/crm/events';
import { register, requireEvent } from '@/lib/crm/flow';
import { loadProfile } from '@/lib/crm/profile';
import { body, handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
import { checkinKeyOk } from '@/lib/crm/wechat';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  const b = await body<{ k?: string; name?: string; roleSub?: string; phone?: string; email?: string; v?: number }>(req);
  const ev = await withTransaction((db) => requireEvent(db, params.slug));
  const { rows } = await (await import('@/lib/db/client')).getPool().query<{ checkin_secret: string }>(
    'SELECT checkin_secret FROM events WHERE id = $1',
    [ev.id]
  );
  if (!checkinKeyOk(b.k, rows[0]?.checkin_secret)) {
    throw new CrmError('wrong_code', '这不是本场活动的签到码，请扫门口的签到码');
  }
  // 现场新客：先最少登记三项（姓名、联系方式=已验证身份、主要角色）
  const { answered } = await loadProfile((await import('@/lib/db/client')).getPool(), me);
  if (!answered.has('Q03')) {
    if (!b.name || !b.roleSub) return ok({ result: { kind: 'need_profile', message: '第一次来，请先填姓名和主要行业，10 秒完成' } });
    const contact = b.phone !== undefined || b.email !== undefined ? { phone: b.phone ?? '', email: b.email ?? '' } : {};
    await register(params.slug, me, { name: b.name, roleSub: b.roleSub, channel: 'onsite', oneStep: b.v === 2, ...contact }, { base: siteUrl(req) });
  }
  const result = await withTransaction(async (db) => checkIn(db, await requireEvent(db, params.slug), me));
  // 1.2 小程序（v = 2）：不返回金额、订单号，收费未确认只提示“工作人员确认”
  if (b.v === 2 && result.kind === 'pending_payment') {
    return ok({ result: { kind: 'pending_payment', message: '本场为收费活动，工作人员会在门口为您确认，请稍候' } });
  }
  return ok({ result });
});
