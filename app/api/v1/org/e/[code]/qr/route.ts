/** GET 报名小程序码 PNG（海报用；只给已公开 / 等放行的活动） */
import { handler } from '@/lib/crm/http';
import { codePng } from '@/lib/org/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (_req: Request, { params }: { params: { code: string } }) => {
  const png = await codePng(params.code, 'register', null);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
});
