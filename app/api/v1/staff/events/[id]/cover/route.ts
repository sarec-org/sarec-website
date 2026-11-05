/** POST /api/v1/staff/events/:id/cover（multipart: file）—— 活动封面（分享卡片、邀请海报、首页大图卡片用） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { actor, audit } from '@/lib/crm/staff';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { uploadImage } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选择封面图片');
  const url = await uploadImage('cover', Buffer.from(await f.arrayBuffer()), { maxSide: 1600 });
  const pool = getPool();
  await pool.query(`UPDATE events SET cover_url = $2, updated_at = now() WHERE id = $1`, [params.id, url]);
  await audit(pool, s, 'event_cover', 'event', params.id, { after: { url } });
  void actor;
  return ok({ coverUrl: url });
});
