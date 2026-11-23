/** 1.5.0 某个俱乐部：GET 详情（加入后才有成员、群二维码、组局板）；POST { action: join|leave|remove_member|set_qr }
 *  join 可带 name / phone：没有姓名手机号时返回 400 need_name_phone（1.5.0 体验1 第三部分 5，和专委会意向同一规矩） */
import { clubDetail, joinClub, leaderRemoveMember, leaveClub, setGroupQr } from '@/lib/crm/clubs';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, optionalContact, requireContact } from '@/lib/crm/http';
import { committeeProfile } from '@/lib/crm/staff12';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { key: string } }) => {
  const me = await optionalContact(req);
  const d = await clubDetail(me, decodeURIComponent(params.key));
  // 1.5.0 体验1（第三部分 5）：profile { hasName, hasPhone }——缺的话小程序点「加入」前先弹补填
  const p = await committeeProfile(me);
  return ok({ ...(d as Record<string, unknown>), profile: { hasName: !!p.name, hasPhone: !!p.phone } });
});
export const POST = handler(async (req: Request, { params }: { params: { key: string } }) => {
  const me = await requireContact(req);
  const key = decodeURIComponent(params.key);
  const b = await body<{ action?: string; memberId?: string; url?: string; expires?: string; name?: string; phone?: string }>(req);
  if (b.action === 'join') return ok(await joinClub(me, key, { name: b.name, phone: b.phone }));
  if (b.action === 'leave') return ok(await leaveClub(me, key));
  if (b.action === 'remove_member') return ok(await leaderRemoveMember(me, key, String(b.memberId ?? '')));
  if (b.action === 'set_qr') return ok(await setGroupQr('leader:' + me, key, String(b.url ?? ''), b.expires ?? null, me));
  throw new CrmError('bad_request', '不支持的操作');
});
