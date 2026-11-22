/**
 * GET 某场活动的回顾初稿（统计、精选照片、回顾 / 分享 / 推文 / 感谢、需求、下一场推荐）；POST 审核通过并发布
 * 1.5.0 体验1（第三部分 4）：小程序工作台来的 GET 只给预览要用的（标题、状态、回顾文章、分享语、感谢语、精选照片、发布时间），
 * 不给统计（里面可能有收款数字）和推文初稿；一键发布用 POST /api/v1/staff/recaps/:eventId/publish。
 */
import { getRecap, publishRecap } from '@/lib/crm/postEvent';
import { actor } from '@/lib/crm/staff';
import { body, handler, isMiniProgramRequest, ok, requireStaff } from '@/lib/crm/http';
import { PAY_WORDS } from '@/lib/crm/today/mp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { eventId: string } }) => {
  await requireStaff(req, 'ops');
  const r = (await getRecap(params.eventId)) as Record<string, unknown> | null;
  if (r && (await isMiniProgramRequest(req))) {
    const t = (v: unknown) => (typeof v === 'string' && !PAY_WORDS.test(v) ? v : null);
    return ok({
      recap: {
        event_id: r.event_id, title: r.title, slug: r.slug, status: r.status, drafted_at: r.drafted_at, published_at: r.published_at,
        recap_draft: t(r.recap_draft), share_draft: t(r.share_draft), thanks_draft: t(r.thanks_draft),
        pickPhotos: r.pickPhotos, canPublish: r.status !== 'published' && !!String(r.recap_draft ?? '').trim()
      }
    });
  }
  return ok({ recap: r });
});
export const POST = handler(async (req: Request, { params }: { params: { eventId: string } }) => {
  const s = await requireStaff(req, 'ops');
  return ok(await publishRecap(actor(s), params.eventId, await body(req)));
});
