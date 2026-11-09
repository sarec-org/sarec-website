/** 1.3.1 D：POST（multipart: file）—— “地产项目”名片模板的项目照片（上传后名片进入待审核） */
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
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选择项目照片');
  if (f.size > 6 * 1024 * 1024) throw new CrmError('bad_request', '图片太大了，请换一张');
  const url = await uploadImage('card', Buffer.from(await f.arrayBuffer()), { maxSide: 1200 });
  await getPool().query(`INSERT INTO member_cards (contact_id) VALUES ($1) ON CONFLICT (contact_id) DO NOTHING`, [me]);
  await getPool().query(`UPDATE member_cards SET project_photo_url = $2, updated_at = now() WHERE contact_id = $1`, [me, url]);
  await markCardContentChanged(me);
  return ok({ projectPhotoUrl: url });
});
