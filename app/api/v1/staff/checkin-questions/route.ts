/** 1.3.1 A3：签到选择题题库（后台维护）。GET → 全部题；PUT { questions: [{ key, prompt, options[], sort, isActive, allowText }] } → 新增 / 修改（不删，停用即可） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { audit } from '@/lib/crm/staff';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const { rows } = await getPool().query(
    `SELECT key, prompt, options, sort, is_active AS "isActive", allow_text AS "allowText",
            (SELECT count(DISTINCT contact_id)::int FROM profile_answers a WHERE a.item_code = 'CK:' || q.key AND a.status = 'current') AS answered
       FROM checkin_questions q ORDER BY sort, key`
  );
  return ok({ questions: rows });
});
type Q = { key?: string; prompt?: string; options?: string[]; sort?: number; isActive?: boolean; allowText?: boolean };
export const PUT = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ questions?: Q[] }>(req);
  const list = Array.isArray(b.questions) ? b.questions : [];
  const pool = getPool();
  for (const q of list) {
    const key = String(q.key ?? '').trim();
    const prompt = String(q.prompt ?? '').trim().slice(0, 60);
    const options = (Array.isArray(q.options) ? q.options : []).map((o) => String(o).trim().slice(0, 20)).filter(Boolean).slice(0, 8);
    if (!/^[a-z][a-z0-9_]{1,30}$/.test(key)) throw new CrmError('bad_request', '题目编号只能用小写字母、数字、下划线');
    if (!prompt) throw new CrmError('bad_request', '请填写题目');
    if (options.length < 2) throw new CrmError('bad_request', `“${prompt}”至少要两个选项（签到题都是选择题）`);
    await pool.query(
      `INSERT INTO checkin_questions (key, prompt, options, sort, is_active, allow_text) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE SET prompt = $2, options = $3, sort = $4, is_active = $5, allow_text = $6, updated_at = now()`,
      [key, prompt, options, Number(q.sort) || 100, q.isActive !== false, q.allowText !== false]
    );
  }
  await audit(pool as never, s, 'checkin_questions_update', 'setting', 'checkin_questions', { after: list.map((q) => q.key) });
  return ok({ saved: list.length });
});
