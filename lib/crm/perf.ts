/**
 * 真机计时上报（指令 31 第二部分，11/22）：体验版 / 开发版小程序把冷启动各阶段、进页面耗时、每个请求耗时、机型和网络报上来，
 * 后台「真机速度」页看东哥那台手机到底慢在哪一段。
 * - 只在测试站（VERCEL_ENV !== 'production'）入库；正式站接口直接丢弃（不读内容、不碰数据库）。
 * - 不存个人信息：不存 openid、手机、姓名、IP、登录令牌；会话号是小程序每次打开随机生成的。
 * - 接口路径里的活动名、编号、令牌一律换成 :p（和线上报错同一套）。
 */
import { getPool } from '@/lib/db/client';
import { normalizeApi, normalizePage } from '@/lib/crm/clientErrors';

export const perfEnabled = () => process.env.VERCEL_ENV !== 'production';

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max).replace(/[^\w .,:/()+-]/g, '') : '');
const int = (v: unknown, lo: number, hi: number): number | null => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null;
};
const KINDS = new Set(['launch', 'page', 'req', 'wx']);
/** 分段名：只允许字母数字和 . _ - */
const stage = (v: unknown) => (typeof v === 'string' ? v.slice(0, 60).replace(/[^\w.-]/g, '') : '');

type Mark = { kind?: unknown; name?: unknown; t?: unknown; ms?: unknown; status?: unknown; extra?: unknown };
export async function recordPerf(b: Record<string, unknown>): Promise<number> {
  const sid = typeof b.sid === 'string' && /^[a-z0-9]{8,40}$/.test(b.sid) ? b.sid : '';
  if (!sid) return 0;
  const d = (b.device && typeof b.device === 'object' ? b.device : {}) as Record<string, unknown>;
  const marks = (Array.isArray(b.marks) ? b.marks : []).slice(0, 120) as Mark[];
  const rows: unknown[][] = [];
  for (const m of marks) {
    const kind = String(m.kind ?? '');
    if (!KINDS.has(kind)) continue;
    const ms = int(m.ms, 0, 600000);
    if (ms === null) continue;
    const raw = String(m.name ?? '');
    const name = kind === 'req' ? normalizeApi(raw) : kind === 'page' ? normalizePage(raw) : stage(raw);
    if (!name) continue;
    rows.push([kind, name, int(m.t, 0, 3600000), ms, m.status == null ? null : int(m.status, 0, 999), typeof m.extra === 'string' ? m.extra.slice(0, 60).replace(/[^\w.,:/=-]/g, '') : '']);
  }
  const pool = getPool();
  await pool.query(
    `INSERT INTO perf_sessions (sid, version, env, brand, model, platform, system, wx_version, sdk, bench, net, scene, cold)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (sid) DO UPDATE SET last_at = now(),
       net = CASE WHEN EXCLUDED.net <> '' THEN EXCLUDED.net ELSE perf_sessions.net END`,
    [sid, clip(b.version, 24), clip(b.env, 12), clip(d.brand, 40), clip(d.model, 60), clip(d.platform, 16), clip(d.system, 40),
      clip(d.wxVersion, 20), clip(d.sdk, 20), int(d.bench, -2, 100), clip(b.net, 12), int(b.scene, 0, 99999), b.cold === true ? true : b.cold === false ? false : null]
  );
  if (rows.length) {
    const vals: unknown[] = [];
    const ph = rows.map((r, i) => {
      vals.push(sid, ...r);
      const o = i * 7;
      return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7})`;
    });
    await pool.query(`INSERT INTO perf_marks (sid, kind, name, t, ms, status, extra) VALUES ${ph.join(', ')}`, vals);
  }
  // 只留 30 天：大约每 50 次写入顺手删一次旧的
  if (Math.random() < 0.02) await pool.query(`DELETE FROM perf_sessions WHERE last_at < now() - interval '30 days'`).catch(() => null);
  return rows.length;
}

export type PerfSession = {
  sid: string; first_at: string; last_at: string; version: string; env: string; brand: string; model: string; platform: string;
  system: string; wx_version: string; sdk: string; bench: number | null; net: string; scene: number | null; cold: boolean | null;
  marks: { kind: string; name: string; t: number | null; ms: number; status: number | null; extra: string }[];
};

/** 后台：最近 N 个会话（每个带全部分段，按时间排）；慢请求排行；进页面排行 */
export async function perfSummary(opts: { days: number; limit: number; model?: string }) {
  const pool = getPool();
  const { rows: sessions } = await pool.query<Omit<PerfSession, 'marks'>>(
    `SELECT sid, first_at::text, last_at::text, version, env, brand, model, platform, system, wx_version, sdk, bench, net, scene, cold
       FROM perf_sessions
      WHERE last_at >= now() - ($1::int * interval '1 day') AND ($3::text = '' OR model = $3)
      ORDER BY first_at DESC LIMIT $2`,
    [opts.days, opts.limit, opts.model ?? '']
  );
  const sids = sessions.map((s) => s.sid);
  const { rows: marks } = sids.length
    ? await pool.query<PerfSession['marks'][number] & { sid: string }>(
      `SELECT sid, kind, name, t, ms, status, extra FROM perf_marks WHERE sid = ANY($1) ORDER BY sid, coalesce(t, 0), id`, [sids])
    : { rows: [] as (PerfSession['marks'][number] & { sid: string })[] };
  const by = new Map<string, PerfSession['marks']>();
  for (const m of marks) {
    const { sid, ...rest } = m;
    by.set(sid, [...(by.get(sid) ?? []), rest]);
  }
  const agg = (kind: string) => pool.query<{ name: string; n: number; p50: number; p90: number; max: number; fails: number; models: string[] }>(
    `SELECT m.name, count(*)::int AS n,
            percentile_disc(0.5) WITHIN GROUP (ORDER BY m.ms)::int AS p50,
            percentile_disc(0.9) WITHIN GROUP (ORDER BY m.ms)::int AS p90,
            max(m.ms)::int AS max,
            count(*) FILTER (WHERE m.status IS NOT NULL AND (m.status = 0 OR m.status >= 500))::int AS fails,
            array_agg(DISTINCT s.model) AS models
       FROM perf_marks m JOIN perf_sessions s ON s.sid = m.sid
      WHERE m.kind = $1 AND m.at >= now() - ($2::int * interval '1 day') AND ($3::text = '' OR s.model = $3)
      GROUP BY m.name ORDER BY p90 DESC LIMIT 40`,
    [kind, opts.days, opts.model ?? '']
  ).then((r) => r.rows);
  const [reqs, pages, models] = await Promise.all([
    agg('req'),
    agg('page'),
    pool.query<{ model: string; n: number }>(
      `SELECT model, count(*)::int AS n FROM perf_sessions WHERE last_at >= now() - ($1::int * interval '1 day') GROUP BY model ORDER BY n DESC LIMIT 20`,
      [opts.days]
    ).then((r) => r.rows)
  ]);
  return {
    sessions: sessions.map((s) => ({ ...s, marks: by.get(s.sid) ?? [] })),
    reqs, pages, models
  };
}
