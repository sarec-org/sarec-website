/** GET /api/v1/events/:slug —— 活动详情 + 本人报名状态 + 本次需回答的必答题（预览，不写数据） */
import { previewRegistration } from '@/lib/crm/flow';
import { handler, isMp12, ok, optionalContact } from '@/lib/crm/http';
import { noMoney } from '@/lib/noMoney';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const data = await previewRegistration(params.slug, await optionalContact(req));
  if (await isMp12(req)) {
    const d = data as { event?: { summary?: string | null } };
    if (d.event && 'summary' in d.event) d.event.summary = noMoney(d.event.summary);
  }
  return ok(data);
});
