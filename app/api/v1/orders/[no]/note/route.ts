/** POST /api/v1/orders/:no/note { note, payerName? } —— 从银行 App 回来提交 Zelle 付款说明 → 待核款（会费：立即生效） */
import { submitOrderNote, STATUS_LABEL } from '@/lib/crm/orders';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { no: string } }) => {
  const me = await requireContact(req);
  const b = await body<{ note?: string; payerName?: string }>(req);
  const o = await submitOrderNote(params.no, me, String(b.note ?? '').trim() || '已通过 Zelle 付款', b.payerName ?? null);
  return ok({ status: o.status, statusLabel: STATUS_LABEL[o.status] });
});
