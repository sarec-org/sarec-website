/**
 * Postgres 连接（Vercel Postgres / Neon）—— 服务端专用。
 * ------------------------------------------------------------------
 * - 连接串只从 process.env.DATABASE_URL 读取，绝不写死进代码。
 * - Pool 懒加载：仅在首次查询时创建，缺 DATABASE_URL 时抛错——
 *   这样 build / typecheck 阶段不需要真实连接串。
 * - 仅在 server（API route / server component）import；不进客户端 bundle。
 */
import { Pool, type PoolClient } from 'pg';

let pool: Pool | undefined;

/**
 * Vercel 预览部署（VERCEL_ENV=preview）只连独立测试库 CRMPREVIEW_DATABASE_URL，永远不读 DATABASE_URL——
 * 即使有人误把正式库配进 Preview 环境，预览网址也碰不到正式库。测试库没配时直接报错，不回退。
 */
export function databaseUrl(): string | undefined {
  if (process.env.VERCEL_ENV === 'preview') return process.env.CRMPREVIEW_DATABASE_URL;
  return process.env.DATABASE_URL;
}

export function getPool(): Pool {
  const connectionString = databaseUrl();
  if (!connectionString) {
    throw new Error(process.env.VERCEL_ENV === 'preview' ? 'CRMPREVIEW_DATABASE_URL is not set' : 'DATABASE_URL is not set');
  }
  if (!pool) {
    // max 保守：Serverless 环境避免连接爆炸；sslmode 由连接串自带（Neon 需 require）。
    // 偶发 500 的常见原因：函数实例空闲后，数据库那头已断开的旧连接被再次取用（Connection terminated）。
    // 空闲 10 秒就释放、开 keepAlive，池子出错时不让进程崩；读查询遇到断线自动重试一次。
    const p = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000, keepAlive: true });
    p.on('error', (e) => console.error('[db] idle client error', e.message));
    const raw = p.query.bind(p) as (...a: unknown[]) => Promise<unknown>;
    (p as unknown as { query: (...a: unknown[]) => Promise<unknown> }).query = async (...a: unknown[]) => {
      try {
        return await raw(...a);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        const text = typeof a[0] === 'string' ? a[0] : (a[0] as { text?: string } | undefined)?.text ?? '';
        // 只重试纯读查询，写操作不重试（避免重复写入）
        if (!/^\s*select\b/i.test(text) || typeof a[a.length - 1] === 'function' || !/terminated|ECONNRESET|Connection ended|timeout exceeded when trying to connect/i.test(msg)) throw e;
        console.error('[db] retry after', msg);
        return raw(...a);
      }
    };
    pool = p;
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await getPool().query(text, params as unknown[]);
  return res.rows as T[];
}

/** 事务包裹；回调抛错自动 ROLLBACK。 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    client.release();
  }
}
