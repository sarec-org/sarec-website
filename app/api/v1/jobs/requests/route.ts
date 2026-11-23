/**
 * 1.5.1 指令 46：小程序里直接填「发布活儿」（请商会帮忙找师傅的预约，先进后台，工作人员看过才派）
 * GET  —— { mode:'in_app'|'sheet', phone（已验证的，没有就 null）, maxLen, receivedText, receivedSub }（不登录也能看 mode）
 * POST { trade, cityKey, description } —— 交上来 → { id, message, sub }；没验证手机 400 need_phone；开关关了 403 not_open
 * 小程序和网站都能调（这一条不是公开发帖，不受 D1"小程序不碰活儿"的限制）。
 */
import { body, handler, ok } from '@/lib/crm/http';
import { requireLogin, requireSide, viewer } from '@/lib/jobs/access';
import { createRequest, requestForm } from '@/lib/jobs/requests';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const v = await viewer(req);
  requireSide(v, 'find');
  return ok(await requestForm(v));
});
export const POST = handler(async (req: Request) => {
  const v = await viewer(req);
  requireSide(v, 'find');
  return ok(await createRequest(v, requireLogin(v), await body(req)));
});
