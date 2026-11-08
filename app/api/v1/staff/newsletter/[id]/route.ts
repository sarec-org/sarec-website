/** 邮件通讯 · 某一期
 *  GET    —— 内容、发送闸门状态、收件人数、个性化预览样本、统计、额度（ops）
 *  PATCH  { subject?, body?, filters? } —— 改草稿（ops）
 *  DELETE —— 删草稿（ops）
 *  POST   { action: 'ai' }            —— AI 根据本周文章和活动起草（ops；必须经东哥审核）
 *         { action: 'test' }          —— 发测试邮件到东哥的邮箱（ops）
 *         { action: 'review' }        —— 东哥审核过 AI 草稿（admin）
 *         { action: 'confirm' }       —— 确认群发（只有 admin；必须先发过这一版的测试邮件）
 *         { action: 'resume' }        —— 接着发队列里剩下的（admin）
 *         { action: 'testTo', email } —— 改测试收件邮箱（admin） */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { aiDraft, confirmSend, deleteIssue, getIssue, markAiReviewed, processQueue, sendTest, setTestRecipient, updateIssue } from '@/lib/crm/newsletter';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
type P = { params: { id: string } };
export const GET = handler(async (req: Request, { params }: P) => {
  await requireStaff(req, 'ops');
  return ok(await getIssue(Number(params.id)));
});
export const PATCH = handler(async (req: Request, { params }: P) => {
  await requireStaff(req, 'ops');
  return ok(await updateIssue(Number(params.id), await body(req)));
});
export const DELETE = handler(async (req: Request, { params }: P) => {
  await requireStaff(req, 'ops');
  return ok(await deleteIssue(Number(params.id)));
});
export const POST = handler(async (req: Request, { params }: P) => {
  const s = await requireStaff(req, 'ops');
  const id = Number(params.id);
  const b = await body<{ action?: string; email?: string }>(req);
  switch (b.action) {
    case 'ai': return ok(await aiDraft(s, id));
    case 'test': return ok(await sendTest(s, id));
    case 'review': return ok(await markAiReviewed(s, id));
    case 'confirm': return ok(await confirmSend(s, id));
    case 'resume': {
      if (!s.roles.includes('admin')) throw new CrmError('forbidden', '只有管理员可以继续群发');
      return ok(await processQueue(id));
    }
    case 'testTo': return ok(await setTestRecipient(s, String(b.email ?? '')));
    default: throw new CrmError('bad_request', '不支持的操作');
  }
});
