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

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!pool) {
    // max 保守：Serverless 环境避免连接爆炸；sslmode 由连接串自带（Neon 需 require）。
    pool = new Pool({ connectionString, max: 3 });
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
