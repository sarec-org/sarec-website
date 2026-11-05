/** GET /api/v1/codes/card/:token.png —— 电子名片小程序码 */
import { cardCodePng } from '@/lib/crm/cards';
import { CrmError } from '@/lib/crm/events';
import { handler } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (_req: Request, { params }: { params: { token: string } }) => {
  const t = String(params.token).replace(/\.png$/, '');
  if (!/^[a-f0-9]{8,32}$/.test(t)) throw new CrmError('not_found', '链接有误');
  const png = await cardCodePng(t);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } });
});
