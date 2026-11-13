/**
 * POST /api/v1/client-errors { page, api, status, code?, version } —— 小程序报错上报（不用登录、不带个人信息）。
 * 限流：同一个 IP 10 分钟最多 60 条（计数在函数实例内）；只存按天汇总的次数。
 */
import { body, handler, ok } from '@/lib/crm/http';
import { recordClientError } from '@/lib/crm/clientErrors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hits = new Map<string, { n: number; at: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.at > 10 * 60_000) { hits.set(ip, { n: 1, at: now }); return false; }
  h.n += 1;
  return h.n > 60;
}
export const POST = handler(async (req: Request) => {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return ok({ dropped: true });
  await recordClientError(await body<Record<string, unknown>>(req)).catch((e) => console.log('[client-errors] record failed', (e as Error).message));
  return ok({});
});
