/** GET /api/v1/rooms/info —— 会议室展示信息（照片、容纳人数、设备、地址、会员优惠说明；不含任何价格） */
import { handler, ok } from '@/lib/crm/http';
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
import { roomsInfo } from '@/lib/crm/staff12';
import { aboutPage, site } from '@/lib/content';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  const info = await roomsInfo();
  return ok({ ...info, address: (await getSetting<string>(getPool(), 'room_address', '')) || `${aboutPage.contact.address}（${site.location}）`, phone: site.phone, phoneDial: site.phone.replace(/[^\d+]/g, ''), wechatQr: (await getSetting<string>(getPool(), 'wechat_qr_url', '')) || null });
});
