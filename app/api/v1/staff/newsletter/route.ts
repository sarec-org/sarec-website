/** 邮件通讯（ops 起草；群发只有管理员能确认）
 *  GET  —— 各期列表（含送达 / 打开 / 点击 / 退订统计）、额度、筛选项、测试收件邮箱
 *  POST { subject?, body?, filters? } —— 新建一期（草稿） */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { createIssue, filterOptions, listIssues, quotaState } from '@/lib/crm/newsletter';
import { getSetting } from '@/lib/crm/orders';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({
    issues: await listIssues(),
    quota: await quotaState(),
    options: await filterOptions(),
    testTo: ((await getSetting<string>(getPool(), 'newsletter_test_to', '')) || process.env.SAREC_ADMIN_EMAIL || '').replace(/^(.{2}).*(@.*)$/, '$1***$2') || null
  });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await createIssue(s, await body(req)));
});
