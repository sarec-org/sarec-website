/** POST /api/v1/docs/:slug/track { kind: open|share|pdf, ref?, channel? } —— 记打开 / 转发 / 看 PDF 次数（不用登录；登录了记是谁，带推荐人） */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, optionalContact } from '@/lib/crm/http';
import { track } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const b = await body<{ kind?: string; ref?: string; channel?: string }>(req);
  if (b.kind !== 'open' && b.kind !== 'share' && b.kind !== 'pdf') throw new CrmError('bad_request', '不认识的操作');
  await track(decodeURIComponent(params.slug), b.kind, { contactId: await optionalContact(req).catch(() => null), ref: b.ref ? String(b.ref) : null, channel: b.channel ? String(b.channel) : null });
  return ok({});
});
