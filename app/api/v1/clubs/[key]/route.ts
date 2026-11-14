/** 1.5.0 某个俱乐部：GET 详情（加入后才有成员、群二维码、组局板）；POST { action: join|leave|remove_member|set_qr } */
import { clubDetail, joinClub, leaderRemoveMember, leaveClub, setGroupQr } from '@/lib/crm/clubs';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, optionalContact, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { key: string } }) => ok(await clubDetail(await optionalContact(req), decodeURIComponent(params.key))));
export const POST = handler(async (req: Request, { params }: { params: { key: string } }) => {
  const me = await requireContact(req);
  const key = decodeURIComponent(params.key);
  const b = await body<{ action?: string; memberId?: string; url?: string; expires?: string }>(req);
  if (b.action === 'join') return ok(await joinClub(me, key));
  if (b.action === 'leave') return ok(await leaveClub(me, key));
  if (b.action === 'remove_member') return ok(await leaderRemoveMember(me, key, String(b.memberId ?? '')));
  if (b.action === 'set_qr') return ok(await setGroupQr('leader:' + me, key, String(b.url ?? ''), b.expires ?? null, me));
  throw new CrmError('bad_request', '不支持的操作');
});
