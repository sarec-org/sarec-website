/** 1.4.0 照片事后管理：GET 被禁止上传的人；POST { contactId, ban: boolean } 禁止 / 恢复某人上传（有记录） */
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaffAny } from '@/lib/crm/http';
import { photoBans, setPhotoBan } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaffAny(req, ['ops', 'checkin']);
  return ok({ bans: await photoBans() });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaffAny(req, ['ops', 'checkin']);
  const b = await body<{ contactId?: string; ban?: boolean }>(req);
  return ok({ bans: await setPhotoBan(actor(s), String(b.contactId ?? ''), b.ban !== false) });
});
