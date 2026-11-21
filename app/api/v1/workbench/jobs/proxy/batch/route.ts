/** POST /api/v1/workbench/jobs/proxy/batch { text, mode:'preview'|'save', confirm?:true, sendSms? } —— 一次贴一张表：先预览每行，确认后写入能写的行 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { proxyBatch } from '@/lib/jobs/proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await proxyBatch(s, await body(req)));
});
