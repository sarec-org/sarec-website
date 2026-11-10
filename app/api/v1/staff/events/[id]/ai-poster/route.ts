/**
 * AI 海报（东哥 11/10），只在网站后台用，ops 权限：
 *   GET  → 当前状态（候选图、已选、文案、上限、花费、当前画图服务）
 *   POST { action: 'generate', type, style, subject? }   一批 4 张候选主视觉（“再来一批”同一个动作）
 *        { action: 'copy', type }                          文字模型给 5 组片名 + 宣传语
 *        { action: 'save', genId?, style?, filmTitle, tagline, host, speaker, coHost, imageCap? }
 *        { action: 'default_cap', value }                  全站默认每场上限（admin）
 */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { staffCan } from '@/lib/crm/auth';
import { copyIdeas, generateBatch, posterState, savePoster, setDefaultCap } from '@/lib/poster/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  return ok({ state: await posterState(params.id) });
});

export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<Record<string, unknown>>(req);
  const str = (k: string) => (typeof b[k] === 'string' ? (b[k] as string) : undefined);
  switch (b.action) {
    case 'generate':
      return ok({ state: await generateBatch(s, params.id, { type: str('type'), style: str('style'), subject: str('subject') }) });
    case 'copy':
      return ok(await copyIdeas(s, params.id, str('type')));
    case 'save':
      return ok({ state: await savePoster(s, params.id, b) });
    case 'default_cap':
      if (!staffCan(s, 'admin')) throw new CrmError('forbidden', '全站默认上限只有管理员能改');
      await setDefaultCap(s, b.value);
      return ok({ state: await posterState(params.id) });
    default:
      throw new CrmError('bad_request', '不认识的操作');
  }
});
