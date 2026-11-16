/** GET /api/v1/events/:slug —— 活动详情 + 本人报名状态 + 本次需回答的必答题（预览，不写数据） */
import { previewRegistration } from '@/lib/crm/flow';
import { handler, isMp12, isMp131, mp131Safe, ok, optionalContact } from '@/lib/crm/http';
import { getPool } from '@/lib/db/client';
import { seatStatus, takenSeats } from '@/lib/crm/seats';
import { noMoney } from '@/lib/noMoney';
import { geocode } from '@/lib/crm/geo';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const data = await previewRegistration(params.slug, await optionalContact(req));
  if (await isMp12(req)) {
    const d = data as { event?: { summary?: string | null } };
    if (d.event && 'summary' in d.event) d.event.summary = noMoney(d.event.summary);
  }
  // 1.3.1 B：详情页也显示名额状态（名额充足 / 所剩不多 / 已满可候补）
  const d2 = data as { event?: { capacity?: number | null; seat?: unknown } };
  if (d2.event) {
    const { rows } = await getPool().query<{ id: string }>(`SELECT id FROM events WHERE slug = $1`, [params.slug]);
    if (rows[0]) {
      // 1.4.1：剩下的都是留给会员的座位时，对非会员显示“已满可候补”（不然页面说有名额、报名却进候补）
      const me = await optionalContact(req);
      const { reservedForMembersLeft } = await import('@/lib/crm/seats');
      const left = me ? await reservedForMembersLeft(getPool(), rows[0].id, me) : 0;
      const cap = d2.event.capacity ?? null;
      d2.event.seat = seatStatus(cap == null ? null : Math.max(0, cap - left), await takenSeats(getPool(), rows[0].id));
    }
    // 1.4.0：「导航」用的经纬度（按街道地址查一次存起来；查不到为 null，小程序退回复制地址）
    const d3 = data as { event?: { address?: string | null; geo?: unknown } };
    if (d3.event) d3.event.geo = await geocode(d3.event.address);
  }
  return ok(isMp131(req) ? mp131Safe(data) : data);
});
