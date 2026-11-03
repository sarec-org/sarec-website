/** GET /api/v1/events/:slug —— 活动详情 + 本人报名状态 + 本次需回答的必答题（预览，不写数据） */
import { previewRegistration } from '@/lib/crm/flow';
import { handler, ok, optionalContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) =>
  ok(await previewRegistration(params.slug, await optionalContact(req)))
);
