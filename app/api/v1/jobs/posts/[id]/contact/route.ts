/**
 * POST /api/v1/jobs/posts/:id/contact —— 联系发布人：有资格 → { phone, wechat?, callName? } 并记录谁看过；没资格 → 403 not_eligible + 一句人话原因。
 * 小程序：只限 GET /jobs/me/matched 里的活儿（D10），其余一律 404。
 */
import { CrmError } from '@/lib/crm/events';
import { handler, ok } from '@/lib/crm/http';
import { requireLogin, viewer } from '@/lib/jobs/access';
import { contactPost, isMatchedFor } from '@/lib/jobs/posts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const v = await viewer(req);
  if (v.mp) {
    if (!v.contactId || !(v.switches.work || v.staff) || !(await isMatchedFor(v.contactId, params.id))) throw new CrmError('not_found', '活儿在商会网站发布和查看');
  }
  return ok(await contactPost(params.id, v, requireLogin(v)));
});
