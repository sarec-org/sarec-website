/** POST /api/v1/staff/events/:id/ai-poster/upload（multipart: file, ai=1|0）—— 上传自己的图当主视觉（不花钱、不占每场上限），走同一套排字 */
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { uploadMainImage } from '@/lib/poster/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选择一张图片');
  if (f.size > 4_200_000) throw new CrmError('bad_request', '图片太大了（超过 4MB），请换一张或先压缩一下');
  // 东哥 11/12 定：必须明确说是不是 AI 生成，不给默认值
  const aiRaw = String(form?.get('ai') ?? '');
  if (aiRaw !== '1' && aiRaw !== '0') throw new CrmError('bad_request', '请先选：这张图是不是 AI 生成的');
  const ai = aiRaw === '1';
  return ok({ state: await uploadMainImage(s, params.id, Buffer.from(await f.arrayBuffer()), ai) });
});
