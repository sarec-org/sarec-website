/** POST /api/v1/staff/poster-templates/upload（multipart: file, category, name, box?, ink?）—— 上传新模板，服务器裁成 1080×1620 大图 + 300×450 小图存 Blob */
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { uploadNew } from '@/lib/org/posterTemplates';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选模板图片');
  return ok(await uploadNew(s, {
    category: String(form?.get('category') ?? ''), name: String(form?.get('name') ?? ''), file: Buffer.from(await f.arrayBuffer()),
    box: form?.get('box') ?? null, ink: form?.get('ink') ?? null,
    // 0054：祝福分类的模板可以带落款位（JSON 数组 [x0,y0,x1,y1]）；活动分类忽略
    sigBox: form?.get('sig_box') ?? null
  }));
});
