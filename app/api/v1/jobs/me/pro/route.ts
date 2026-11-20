/**
 * 我的接活
 * GET   —— { pro|null, prefill（现有会员资料自动带入）, rules, subscribeTemplate }
 * POST  —— 新建或更新登记（agree=true 必填）；服务器决定状态、排队自动查 CSLB → { pro, autoCheck }
 * PATCH —— { availableNow } 只改“现在有空”，不用重新同意规则
 */
import { body, handler, ok } from '@/lib/crm/http';
import { CrmError } from '@/lib/crm/events';
import { getPool } from '@/lib/db/client';
import { requireLogin, requireSide, viewer } from '@/lib/jobs/access';
import { RULES } from '@/lib/jobs/constants';
import { jobsTemplate } from '@/lib/jobs/notify';
import { prefillFor, proByContact, proSelf, refreshPro, saveMyPro, setAvailable } from '@/lib/jobs/pros';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const v = await viewer(req);
  requireSide(v, 'work');
  const me = requireLogin(v);
  const pool = getPool();
  const p0 = await proByContact(pool, me);
  const p = p0 ? await refreshPro(pool, p0.id) : null;
  return ok({ pro: p ? await proSelf(pool, p) : null, prefill: await prefillFor(pool, me), rules: RULES, subscribeTemplate: jobsTemplate()?.id ?? null });
});
export const POST = handler(async (req: Request) => {
  const v = await viewer(req);
  requireSide(v, 'work');
  const me = requireLogin(v);
  return ok(await saveMyPro(v, me, await body(req)));
});
export const PATCH = handler(async (req: Request) => {
  const v = await viewer(req);
  requireSide(v, 'work');
  const me = requireLogin(v);
  const b = await body<{ availableNow?: unknown }>(req);
  if (typeof b.availableNow !== 'boolean') throw new CrmError('bad_request', '请告诉我们现在有没有空');
  return ok({ pro: await setAvailable(me, b.availableNow) });
});
