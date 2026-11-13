/** GET /api/v1/codes/invite/:slug/:memberNo.png —— 邀请海报专属小程序码（scene 带推荐码） */
import { inviteCodePng } from '@/lib/crm/cards';
import { CrmError } from '@/lib/crm/events';
import { handler } from '@/lib/crm/http';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/**
 * 东哥 11/12 定：暂不强制登录（线上 1.3.2 及更早版本直接用这个地址取码），先限流：
 * 只给真实存在的活动和会员号出码；同一个 IP 短时间内最多出 30 个（码出过一次就永久存着，重复取不调微信）。
 * 待办：旧版本淘汰后改成要登录、只能取自己的码。
 */
const hits = new Map<string, { n: number; at: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.at > 10 * 60_000) { hits.set(ip, { n: 1, at: now }); return false; }
  h.n += 1;
  return h.n > 30;
}
export const GET = handler(async (req: Request, { params }: { params: { slug: string; no: string } }) => {
  const no = Number(String(params.no).replace(/\.png$/, ''));
  if (!Number.isInteger(no) || no <= 0) throw new CrmError('not_found', '链接有误');
  const slug = decodeURIComponent(params.slug);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) throw new CrmError('too_soon', '请求太频繁，请稍后再试');
  const pool = getPool();
  const [{ rows: ev }, { rows: who }] = await Promise.all([
    pool.query(`SELECT 1 FROM events WHERE slug = $1`, [slug]),
    pool.query(`SELECT 1 FROM contacts WHERE member_no = $1`, [no])
  ]);
  if (!ev[0] || !who[0]) throw new CrmError('not_found', '链接有误');
  const png = await inviteCodePng(slug, no);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } });
});
