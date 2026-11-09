/** 1.3.1 D：POST { action: 'accept' | 'decline' } → 同意 / 忽略交换请求；{ action: 'note', note } → 写一句备注（只有自己看得到） */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
import { noteExchange, respondExchange } from '@/lib/crm/cardbook';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireContact(req);
  const b = await body<{ action?: string; note?: string }>(req);
  if (b.action === 'accept' || b.action === 'decline') return ok(await respondExchange(me, params.id, b.action === 'accept'));
  if (b.action === 'note') return ok(await noteExchange(me, params.id, String(b.note ?? '')));
  throw new CrmError('bad_request', '操作不对，请刷新后再试');
});
