/** POST { kind: 'file' | 'copy' } —— 一键导出名单（只有负责人；每次记一笔；文件地址 10 分钟有效、只能下一次） */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { startExport } from '@/lib/org/service';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireContact(req);
  const b = await body<{ kind?: string }>(req);
  return ok(await startExport(me, params.id, b.kind === 'copy' ? 'copy' : 'file', siteUrl(req)));
});
