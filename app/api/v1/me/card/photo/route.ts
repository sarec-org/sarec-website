/** 1.3.1 D：POST（multipart: file）—— “地产项目”名片模板的项目照片；?kind=logo（1.3.2 名片模板库）—— 公司 logo。上传后名片进入待审核 */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireContact } from '@/lib/crm/http';
import { uploadImage } from '@/lib/crm/photos';
import { markCardContentChanged } from '@/lib/crm/cards';
import { CHECKING_SLOT_NOTE, gateSlot } from '@/lib/crm/imageGate';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  const logo = new URL(req.url).searchParams.get('kind') === 'logo';
  if (!f || typeof f === 'string') throw new CrmError('bad_request', logo ? '请选择公司 logo 图片' : '请选择项目照片');
  if (f.size > 6 * 1024 * 1024) throw new CrmError('bad_request', '图片太大了，请换一张');
  const url = await uploadImage('card', Buffer.from(await f.arrayBuffer()), { maxSide: logo ? 600 : 1200 });
  await getPool().query(`INSERT INTO member_cards (contact_id) VALUES ($1) ON CONFLICT (contact_id) DO NOTHING`, [me]);
  // 指令 36：新图检测完才对别人显示（原来那张先不换）；本人看到新图。老字段不变，新加 checking / message
  const g = await gateSlot(logo ? 'logo' : 'card_photo', me, url, me);
  const extra = g.checking ? { checking: true, message: CHECKING_SLOT_NOTE } : {};
  if (logo) {
    if (!g.checking) await getPool().query(`UPDATE member_cards SET logo_url = $2, updated_at = now() WHERE contact_id = $1`, [me, url]);
    await markCardContentChanged(me);
    return ok({ logoUrl: url, ...extra });
  }
  if (!g.checking) await getPool().query(`UPDATE member_cards SET project_photo_url = $2, updated_at = now() WHERE contact_id = $1`, [me, url]);
  await markCardContentChanged(me);
  return ok({ projectPhotoUrl: url, ...extra });
});
