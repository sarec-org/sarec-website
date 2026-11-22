/**
 * GET /api/v1/staff/followups?status=&source=&q=&cat= —— 待跟进任务列表（ops）；POST { name, contactText, need, owner, nextDate } —— 手动添加
 * 后台综合优化 B：每条带 会员身份（isMember）、准确的来源（sourceLabel）、分类（category：客户咨询 / 合作或推销 / 垃圾）、过期天数；
 * cat=customer 只看客户咨询，cat=junk 只看推销和垃圾。
 */
import { createManualFollowup, listFollowups } from '@/lib/crm/followups';
import { CATEGORY_LABEL, loadCards } from '@/lib/crm/followupKit';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const sp = new URL(req.url).searchParams;
  const r = await listFollowups({ status: sp.get('status'), source: sp.get('source'), q: sp.get('q') });
  const list = r.followups as { id: string }[];
  const cards = new Map((await loadCards({ ids: list.map((f) => f.id), limit: 500 })).map((c) => [c.id, c]));
  const cat = sp.get('cat');
  const followups = list
    .map((f) => {
      const c = cards.get(f.id);
      return { ...f, isMember: c?.isMember ?? false, sourceLabel: c?.sourceLabel ?? null, category: c?.category ?? 'customer', categoryLabel: CATEGORY_LABEL[c?.category ?? 'customer'], overdueDays: c?.overdueDays ?? 0 };
    })
    .filter((f) => (cat === 'customer' ? f.category === 'customer' : cat === 'junk' ? f.category !== 'customer' : true));
  return ok({ followups, counts: r.counts });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await createManualFollowup(actor(s), await body(req)));
});
