/** GET /api/v1/staff/followups/:id/card —— 单条处理页：这是什么、建议、原话、会员身份、分类、联系按钮（草稿按谁联系）、处理记录、团队名单（ops） */
import { CrmError } from '@/lib/crm/events';
import { CATEGORY_LABEL, contactActions, draftFor, loadCards, teamMembers, voiceFor } from '@/lib/crm/followupKit';
import { headline } from '@/lib/crm/followupMail';
import { followupLog } from '@/lib/crm/followups';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) throw new CrmError('not_found', '找不到这条跟进');
  const c = (await loadCards({ ids: [params.id] }))[0];
  if (!c) throw new CrmError('not_found', '找不到这条跟进');
  const team = await teamMembers();
  const v = voiceFor(team, c.owner || s.name);
  const draft = draftFor(c, v);
  return ok({
    card: { ...c, categoryLabel: CATEGORY_LABEL[c.category], ...headline(c) },
    draft,
    draftVoice: v.voice === 'president' ? '会长口气' : '工作人员口气',
    actions: contactActions(c, draft),
    log: await followupLog(c.id),
    team: team.map((m) => ({ name: m.name, president: m.president, assistant: m.assistant })),
    me: s.name
  });
});
