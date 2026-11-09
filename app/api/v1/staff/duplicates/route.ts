/** 1.3.1 A4：合并重复档案。GET → 疑似重复 + 最近合并记录；
 *  POST { action: 'merge', keptId, mergedId, reason? } | { action: 'undo', mergeId } | { action: 'not_dup', a, b } */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { duplicateSuggestions, markNotDuplicate, mergeContacts, recentMerges, undoMerge } from '@/lib/crm/dupMerge';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ pairs: await duplicateSuggestions(), merges: await recentMerges() });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ action?: string; keptId?: string; mergedId?: string; reason?: string; mergeId?: string; a?: string; b?: string }>(req);
  if (b.action === 'merge' && b.keptId && b.mergedId) return ok(await mergeContacts(s, b.keptId, b.mergedId, b.reason));
  if (b.action === 'undo' && b.mergeId) return ok(await undoMerge(s, b.mergeId));
  if (b.action === 'not_dup' && b.a && b.b) return ok(await markNotDuplicate(s, b.a, b.b));
  throw new CrmError('bad_request', '操作不对，请刷新后再试');
});
