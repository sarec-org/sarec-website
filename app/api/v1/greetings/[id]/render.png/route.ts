/**
 * GET /api/v1/greetings/<模板 id>/render.png?style=plain|company|personal&line=<落款，可选>（登录）
 * —— 1.7.0 节日祝福成品图 1080×1620 PNG（排法见 lib/org/greetings.tsx）。
 * line 最多 30 字、过禁用词和微信文本检测，不通过 400 中文提示；模板不是上架的祝福图 404；出图失败 500（小程序提示重试）。
 */
import { CrmError } from '@/lib/crm/events';
import { fail, handler, requireContact } from '@/lib/crm/http';
import { greetingPng } from '@/lib/org/greetings';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireContact(req);
  const q = new URL(req.url).searchParams;
  let png: Buffer;
  try {
    png = await greetingPng(me, params.id, q.get('style'), q.get('line'));
  } catch (e) {
    if (e instanceof CrmError) throw e;
    console.error('[greetings render.png]', e instanceof Error ? e.message : 'unknown');
    return fail('greeting_failed', '祝福图暂时出不来，请稍后再试', 500);
  }
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Content-Length': String(png.length), 'Cache-Control': 'private, max-age=600' } });
});
