/**
 * POST /api/v1/staff/events/:id/ai-poster/speaker（multipart: file）—— 主讲人真实照片（AI 海报只用上传的真实照片，不让 AI 画人）
 * DELETE —— 去掉照片
 */
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { setSpeakerPhoto } from '@/lib/poster/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选择照片');
  if (f.size > 12 * 1024 * 1024) throw new CrmError('bad_request', '照片太大了（最大 12MB）');
  return ok({ state: await setSpeakerPhoto(s, params.id, Buffer.from(await f.arrayBuffer())) });
});

export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  return ok({ state: await setSpeakerPhoto(s, params.id, null) });
});
