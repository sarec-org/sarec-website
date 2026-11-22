/** POST /api/v1/workbench/jobs/proxy/sms { ids:[接活人 id] } 或 { pending:true } —— 发（重发）确认短信；走发消息总闸，总闸关着只记录不发 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { sendConfirmMany } from '@/lib/jobs/proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await sendConfirmMany(s, await body(req)));
});
