/**
 * POST /api/v1/perf { sid, version, env, net, scene, cold, device, marks: [{ kind, name, t, ms, status?, extra? }] }
 * —— 体验版 / 开发版小程序的真机计时上报（指令 31）。不用登录、不带个人信息。
 * 正式站（VERCEL_ENV=production）直接丢弃：不读内容、不碰数据库。测试站入库，只留 30 天。
 * 限流：同一个 IP 10 分钟最多 120 次（计数在函数实例内），每次最多 120 条。
 */
import { body, handler, ok } from '@/lib/crm/http';
import { perfEnabled, recordPerf } from '@/lib/crm/perf';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hits = new Map<string, { n: number; at: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.at > 10 * 60_000) { hits.set(ip, { n: 1, at: now }); return false; }
  h.n += 1;
  return h.n > 120;
}
export const POST = handler(async (req: Request) => {
  if (!perfEnabled()) return ok({ dropped: true });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return ok({ dropped: true });
  const n = await recordPerf(await body<Record<string, unknown>>(req)).catch((e) => { console.log('[perf] record failed', (e as Error).message); return 0; });
  return ok({ n });
});
