/** GET 下载导出的名单（xlsx）。地址 10 分钟有效、只能下载一次（不用再带登录：地址本身就是一次性的凭证，只有刚点导出的负责人拿到） */
import { handler } from '@/lib/crm/http';
import { downloadExport } from '@/lib/org/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (_req: Request, { params }: { params: { token: string } }) => {
  const { xlsx, name } = await downloadExport(params.token);
  return new Response(new Uint8Array(xlsx), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}` }
  });
});
