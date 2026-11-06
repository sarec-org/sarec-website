/** GET /api/v1/rooms/info —— 会议室展示信息（照片、容纳人数、设备、地址、会员优惠说明；不含任何价格） */
import { handler, ok } from '@/lib/crm/http';
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
import { roomsInfo } from '@/lib/crm/staff12';
import { noMoney } from '@/lib/noMoney';
import { aboutPage, site } from '@/lib/content';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 工作人员写的介绍 / 设备里带金额的句子不对外显示（这个接口给小程序和网站展示用，“不含任何价格”）
export const GET = handler(async () => {
  const raw = await roomsInfo();
  const info = { ...raw, rooms: raw.rooms.map((r) => ({ ...r, intro: noMoney(r.intro), equipment: noMoney(r.equipment) })) };
  return ok({ ...info, address: (await getSetting<string>(getPool(), 'room_address', '')) || `${aboutPage.contact.address}（${site.location}）`, phone: site.phone, phoneDial: site.phone.replace(/[^\d+]/g, ''), wechatQr: (await getSetting<string>(getPool(), 'wechat_qr_url', '')) || null });
});
