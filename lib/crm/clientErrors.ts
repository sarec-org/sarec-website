/**
 * 小程序报错上报（东哥 11/12 定）：小程序里任何接口报错时上报一行（页面、接口、状态码、版本号），不带个人信息。
 * 只存按天汇总的次数；接口路径里的活动名、编号、令牌一律换成 :p；不存 IP、不存登录身份。
 */
import { createHash } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { laToday } from '@/lib/laDate';

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
/** 接口路径只留“哪一类接口”：/api/v1/events/2026-11-13-xxx/album → /api/v1/events/:p/album；去掉查询参数 */
export function normalizeApi(raw: string): string {
  const path = raw.split('?')[0].replace(/^https?:\/\/[^/]+/, '');
  if (!path.startsWith('/api/')) return ':other';
  return path
    .split('/')
    .map((seg, i) => (i <= 2 || seg === '' || (/^[a-z][a-z-]{0,23}$/.test(seg) && !/\d/.test(seg) && seg.split('-').length <= 2) ? seg : ':p'))
    .join('/')
    .slice(0, 120);
}
export function normalizePage(raw: string): string {
  const p = clip(raw, 80).replace(/^\//, '').split('?')[0];
  return /^pages\/[a-z0-9_/-]{1,60}$/.test(p) ? p : ':unknown';
}

export async function recordClientError(b: Record<string, unknown>) {
  const page = normalizePage(String(b.page ?? ''));
  const api = normalizeApi(String(b.api ?? ''));
  const status = Math.max(0, Math.min(999, Math.floor(Number(b.status) || 0)));
  const code = clip(b.code, 40).replace(/[^\w.-]/g, '');
  const version = clip(b.version, 24).replace(/[^\w.-]/g, '');
  const sig = createHash('sha256').update([page, api, status, code].join('|')).digest('hex').slice(0, 16);
  await getPool().query(
    `INSERT INTO client_errors (day, sig, page, api, status, code, version, n) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
     ON CONFLICT (day, sig, version) DO UPDATE SET n = client_errors.n + 1, last_at = now()`,
    [laToday(), sig, page, api, status, code, version]
  );
}

/** 后台：最近 N 天按天汇总；“新出现”= 这一类错误在这一天之前从来没有过 */
export async function clientErrorSummary(days = 14) {
  const { rows } = await getPool().query<{ day: string; sig: string; page: string; api: string; status: number; code: string; versions: string[]; n: number; first_day: string }>(
    `SELECT e.day::text, e.sig, e.page, e.api, e.status, e.code, array_agg(DISTINCT e.version) AS versions, sum(e.n)::int AS n,
            (SELECT min(x.day) FROM client_errors x WHERE x.sig = e.sig)::text AS first_day
       FROM client_errors e
      WHERE e.day >= (current_date - $1::int)
      GROUP BY e.day, e.sig, e.page, e.api, e.status, e.code
      ORDER BY e.day DESC, n DESC`,
    [days]
  );
  return rows.map((r) => ({ ...r, isNew: r.first_day === r.day }));
}
