/** GET 开通页要的东西：{ open（活动工具开着没有）, mode（'auto' 当场开通 / 'review' 老的申请制）, isOrganizer, organizer, me: { hasName, hasPhone, name },
 *      promise: { title, version, points（《主办方数据承诺》要点；全文看 /api/v1/org/promise） } }。不用登录（登录了才有 me / isOrganizer）。
 *  POST 指令 81：
 *   - mode = auto：{ orgName, logoUrl?, personName?, phone?, agree: true } → 当场开通 → { ok, auto: true, organizer: { id, name } }（已是主办方直接返回已有的）
 *   - mode = review：「我也要办活动」申请（和以前一样）：{ orgName, personName, phone, note, from } → { ok, message } */
import { body, handler, ok, optionalContact, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { apply, applyInfo, openMode, openNow } from '@/lib/org/service';
export const GET = handler(async (req: Request) => ok(await applyInfo(await optionalContact(req))));
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body(req);
  return ok((await openMode()) === 'auto' ? await openNow(me, b) : await apply(me, b));
});
