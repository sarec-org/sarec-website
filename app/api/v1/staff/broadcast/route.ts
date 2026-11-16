/**
 * 1.5.0 后台群发（运营选人、写内容；只有管理员能确认）。这一版一律演练：只记录“本来会发给谁”，不调用任何发送接口。
 * GET：条件目录、常用人群、群发记录、是不是演练
 * POST { action: audience|estimate|save_audience|create|preview|confirm|recipients, ... }
 */
import { broadcastRecipients, conditionCatalog, confirmBroadcast, createBroadcast, isDryRun, listAudiences, listBroadcasts, previewAudience, previewToOwner, saveAudience, smsEstimate, type Filters } from '@/lib/crm/broadcast';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ catalog: await conditionCatalog(), audiences: await listAudiences(), broadcasts: await listBroadcasts(), dryRun: await isDryRun() });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ action?: string; filters?: Filters; excluded?: string[]; name?: string; text?: string; channels?: string[]; content?: Record<string, string>; id?: string }>(req);
  const f: Filters = { conds: Array.isArray(b.filters?.conds) ? b.filters!.conds : [] };
  switch (b.action) {
    case 'audience': return ok(await previewAudience(f, b.excluded ?? []));
    case 'estimate': return ok(await smsEstimate(f, b.excluded ?? [], String(b.text ?? '')));
    case 'save_audience': return ok(await saveAudience(s, String(b.name ?? ''), f));
    case 'create': return ok(await createBroadcast(s, { filters: f, excluded: b.excluded, channels: b.channels ?? [], content: b.content ?? {} }));
    case 'preview': return ok(await previewToOwner(s, String(b.id ?? '')));
    case 'confirm': return ok(await confirmBroadcast(s, String(b.id ?? '')));
    case 'recipients': return ok({ rows: await broadcastRecipients(String(b.id ?? '')) });
    default: throw new CrmError('bad_request', '不支持的操作');
  }
});
