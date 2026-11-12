/** GET /api/v1/staff/events/:id/ai-poster/cover?pos=0..1 —— 活动封面预览（官方海报主视觉横版取景；不保存） */
import { handler, requireStaff } from '@/lib/crm/http';
import { previewCover } from '@/lib/poster/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  const p = new URL(req.url).searchParams.get('pos');
  const pos = p === null || p === '' ? null : Number(p);
  const jpg = await previewCover(params.id, pos !== null && Number.isFinite(pos) ? pos : null);
  return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
});
