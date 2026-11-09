/**
 * /api/v1/tools/saves —— 1.4 网站工具：把计算结果存到本人账户。
 * GET  ?tool=mortgage   本人最近 50 条
 * POST { tool, title, inputs }   服务器重新计算再存（不信任前端算的数）
 * DELETE ?id=123        只能删自己的
 * 未登录 → 401（页面上照样能算，只是不能存）。表还没建（迁移没跑）→ 大白话提示。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
import { calcMortgage, cleanMortgageInput } from '@/lib/tools/mortgage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PER_USER = 50;

const TOOLS: Record<string, { clean: (x: Record<string, unknown>) => object; calc: (x: Record<string, unknown>) => object }> = {
  mortgage: { clean: cleanMortgageInput, calc: calcMortgage }
};

function tableMissing(e: unknown): boolean {
  return (e as { code?: string })?.code === '42P01';
}
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (tableMissing(e)) throw new CrmError('unavailable', '保存功能还在开通中，请先截图或生成分享图保存结果');
    throw e;
  }
}

export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  const tool = new URL(req.url).searchParams.get('tool') ?? '';
  if (!TOOLS[tool]) throw new CrmError('bad_request', '工具名称不对');
  const { rows } = await guard(() =>
    getPool().query(
      `SELECT id::text, title, inputs, outputs, created_at FROM tool_saves WHERE contact_id = $1 AND tool = $2 ORDER BY created_at DESC LIMIT $3`,
      [me, tool, MAX_PER_USER]
    )
  );
  return ok({ items: rows });
});

export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ tool?: string; title?: string; inputs?: Record<string, unknown> }>(req);
  const t = TOOLS[b.tool ?? ''];
  if (!t) throw new CrmError('bad_request', '工具名称不对');
  const inputs = t.clean(b.inputs ?? {});
  const outputs = t.calc(inputs as Record<string, unknown>);
  const title = String(b.title ?? '').trim().slice(0, 80);
  const pool = getPool();
  const { rows } = await guard(async () => {
    const r = await pool.query<{ id: string; created_at: string }>(
      `INSERT INTO tool_saves (contact_id, tool, title, inputs, outputs) VALUES ($1, $2, $3, $4, $5) RETURNING id::text, created_at`,
      [me, b.tool, title, JSON.stringify(inputs), JSON.stringify(outputs)]
    );
    // 每人每个工具只留最近 50 条
    await pool.query(
      `DELETE FROM tool_saves WHERE contact_id = $1 AND tool = $2 AND id NOT IN (
         SELECT id FROM tool_saves WHERE contact_id = $1 AND tool = $2 ORDER BY created_at DESC LIMIT $3)`,
      [me, b.tool, MAX_PER_USER]
    );
    return r;
  });
  return ok({ id: rows[0].id, created_at: rows[0].created_at, title, inputs, outputs });
});

export const DELETE = handler(async (req: Request) => {
  const me = await requireContact(req);
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^\d+$/.test(id)) throw new CrmError('bad_request', '记录编号不对');
  const { rowCount } = await guard(() => getPool().query(`DELETE FROM tool_saves WHERE id = $1 AND contact_id = $2`, [id, me]));
  if (!rowCount) throw new CrmError('not_found', '没有找到这条记录');
  return ok();
});
