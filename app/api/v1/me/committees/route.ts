/** GET /api/v1/me/committees —— 专委会与俱乐部（已成立 / 筹备中）+ 我的意向
 *  后台综合优化 一.4：另带 profile { hasName, hasPhone, needsFill }——needsFill = 有“待补填”的老意向，小程序下次打开时提示补填。
 *  POST { key, on, name?, phone? } —— 表达 / 取消意向。表达意向必须已有姓名和手机号：缺了返回 400 need_name_phone（小程序弹出补填后带 name / phone 再提交）。
 *  旧版小程序（1.4.3 及以前，不会补填）：照常记下并标“待补填”。 */
import { body, handler, isMpOlderThan, ok, optionalContact, requireContact } from '@/lib/crm/http';
import { committeeProfile, committees, setCommitteeInterest } from '@/lib/crm/staff12';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await optionalContact(req);
  const p = await committeeProfile(me);
  return ok({ committees: await committees(me), profile: { hasName: !!p.name, hasPhone: !!p.phone, needsFill: p.needsFill } });
});
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ key?: string; on?: boolean; name?: string; phone?: string }>(req);
  const legacy = isMpOlderThan(req, [1, 4, 4]) && b.name === undefined && b.phone === undefined;
  const list = await setCommitteeInterest(me, String(b.key ?? ''), b.on !== false, { name: b.name, phone: b.phone, legacy });
  const p = await committeeProfile(me);
  return ok({ committees: list, profile: { hasName: !!p.name, hasPhone: !!p.phone, needsFill: p.needsFill } });
});
