/**
 * POST /api/v1/staff/followups/junk —— 推销 / 垃圾一键全部不跟进（ops）
 *  { ids?: [...] }：今天页上那一条（不给 ids = 所有待联系的推销和垃圾）
 *  { batch, token }：每日汇总邮件里的"全部不跟进"（只动那封邮件里列出的几条）
 */
import { CrmError } from '@/lib/crm/events';
import { batchIds, dropJunk, markBatchDone } from '@/lib/crm/followupKit';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ ids?: unknown; batch?: string; token?: string }>(req);
  let ids: string[] | null = null;
  if (b.batch) {
    ids = await batchIds(String(b.batch), b.token);
    if (!ids) throw new CrmError('bad_token', '邮件里的按钮已过期或不完整，请到「待跟进」里处理');
  } else if (Array.isArray(b.ids)) ids = b.ids.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x));
  const r = await dropJunk(actor(s), ids);
  if (b.batch) await markBatchDone(String(b.batch), s.name);
  return ok({ ...r, message: r.dropped ? `已把 ${r.dropped} 条标为不跟进` : '没有要处理的了（可能已经处理过）' });
});
