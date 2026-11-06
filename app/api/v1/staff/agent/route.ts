/** GET /api/v1/staff/agent?leads=1 —— AI 助手看板 + 预算 + 常见问题库 + 最近对话（ops）
 *  POST { kind: 'settings', monthlyUsd?, testPct? } | { kind: 'faq', id?, intent?, title, keywords, answerZh, answerEn?, priority?, isActive?, delete? } */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { agentDashboard, listFaqAll, recentConversations, updateAgentSettings, upsertFaq } from '@/lib/agent/staff';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const leadsOnly = new URL(req.url).searchParams.get('leads') === '1';
  const [dash, faqs, conversations] = await Promise.all([agentDashboard(14), listFaqAll(), recentConversations({ leadsOnly })]);
  return ok({ ...dash, faqs, conversations });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<Record<string, unknown>>(req);
  if (b.kind === 'settings') return ok(await updateAgentSettings(s.email, b));
  if (b.kind === 'faq') return ok(await upsertFaq(s.email, b as Parameters<typeof upsertFaq>[1]));
  throw new CrmError('bad_request', '未知操作');
});
