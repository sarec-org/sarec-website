/** POST /api/v1/meetups/:id { action: join|leave|cancel|edit, reason? } —— 1.5.0 我参加 / 不去了 / 发起人取消 / 负责人下架；1.6.1 发起人修改（edit 带 title/startsAt/location/address/capacity/note）
 *  GET /api/v1/meetups/:id —— 1.6.1 组局详情（转发卡片打开的页面）：成员看得到组局 + canEdit；不是成员 / 没登录只给俱乐部名字和加入引导（locked） */
import { cancelMeetup, editMeetup, joinMeetup, meetupDetail, clubShareOn } from '@/lib/crm/clubs';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, optionalContact, requireContact } from '@/lib/crm/http';
import { committeeProfile } from '@/lib/crm/staff12';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await optionalContact(req);
  const d = await meetupDetail(me, params.id);
  // 和俱乐部页一样带 profile { hasName, hasPhone }：不是成员点「加入」前，缺姓名手机号先弹补填
  const p = await committeeProfile(me);
  return ok({ ...d, profile: { hasName: !!p.name, hasPhone: !!p.phone }, shareOn: await clubShareOn() });
});
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireContact(req);
  const b = await body<Record<string, unknown> & { action?: string; reason?: string }>(req);
  if (b.action === 'join' || b.action === 'leave') return ok(await joinMeetup(me, params.id, b.action === 'join'));
  if (b.action === 'cancel') return ok(await cancelMeetup(me, params.id, b.reason ?? null));
  if (b.action === 'edit') return ok(await editMeetup(me, params.id, b));
  throw new CrmError('bad_request', '不支持的操作');
});
