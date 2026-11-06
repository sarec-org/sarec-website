/** POST /api/v1/me/avatar（multipart: file）—— 上传本人头像（海报、名片用） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireContact } from '@/lib/crm/http';
import { uploadImage } from '@/lib/crm/photos';
import { markCardContentChanged } from '@/lib/crm/cards';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选择头像图片');
  if (f.size > 4 * 1024 * 1024) throw new CrmError('bad_request', '图片太大了，请换一张');
  const url = await uploadImage('avatar', Buffer.from(await f.arrayBuffer()), { maxSide: 480 });
  await getPool().query(`UPDATE contacts SET avatar_url = $2, updated_at = now() WHERE id = $1`, [me, url]);
  await markCardContentChanged(me); // 头像也是对外展示的内容，换了要重新审核
  return ok({ avatarUrl: url });
});
