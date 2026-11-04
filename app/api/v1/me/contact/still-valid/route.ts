/** POST /api/v1/me/contact/still-valid —— “您的联系方式还是这些吗？”点“没变”：记下确认时间 */
import { getPool } from '@/lib/db/client';
import { confirmStillValid, getContactInfo } from '@/lib/crm/contactInfo';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  await confirmStillValid(me);
  return ok({ contactInfo: await getContactInfo(getPool(), me), message: '已确认，谢谢' });
});
