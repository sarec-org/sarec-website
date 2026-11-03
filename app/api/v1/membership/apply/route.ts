/** POST /api/v1/membership/apply —— 入会 / 续费申请（不需要登录；登录后续费可用积分抵扣）→ { orderNo } 进入付款页
 *  网站未登录提交时，按申请邮箱建档并写入短期会话，方便直接进入付款页。 */
import type { NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db/client';
import { createSession } from '@/lib/crm/auth';
import { applyMembership } from '@/lib/crm/membership';
import { body, handler, ok, optionalContact, withSessionCookie } from '@/lib/crm/http';
import type { CheckoutRequest } from '@/lib/membership/checkout';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<CheckoutRequest & { usePoints?: boolean }>(req);
  const me = await optionalContact(req);
  const ctx = {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null,
    userAgent: req.headers.get('user-agent') || null
  };
  const r = await applyMembership(b, ctx, me);
  const res = ok({ orderNo: r.orderNo, amountCents: r.amountCents, pointsRedeemed: r.pointsRedeemed, needLogin: !me && !r.newContact }) as NextResponse;
  // 只有本次新建的档案才直接给会话；已有档案必须用邮箱验证码登录，防止冒用他人邮箱
  if (!me && r.newContact) {
    const token = await withTransaction((db) => createSession(db, r.contactId, 'web'));
    return withSessionCookie(res, token);
  }
  return res;
});
