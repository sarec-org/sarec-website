/**
 * POST /api/v1/staff/docs/chunk?up=<上传编号>&i=<第几段，从 0 起> —— 小程序「传课件」分块上传（指令 103-B1）。
 * 函数请求体最多 4.5MB，PDF 常常更大：小程序按 3MB 一段传，body 就是这一段的原始字节（application/octet-stream）。
 * 全部传完再 POST /api/v1/staff/events/<id>/slides { up, parts, name } 拼起来加工。运营能用。
 */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { putChunk } from '@/lib/docs/slides';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const q = new URL(req.url).searchParams;
  await putChunk(String(q.get('up') ?? ''), Number(q.get('i')), Buffer.from(await req.arrayBuffer()));
  return ok({});
});
