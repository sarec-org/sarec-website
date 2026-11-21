/**
 * 代登记接活人（后台优化 D）
 * GET   —— 代登记的人列表（含确认短信状态）、设置（总闸、没确认前上不上列表）、贴表的列名和示例
 * POST  —— 单个代登记 { mode:'preview'|'save', row:{name,phone,role,trades[],cities[],years?,licenseNo?,businessRegNo?,businessRegUrl?,insuranceUrl?,licenseDocUrl?,intro?,wechat?}, sendSms? }
 * PATCH —— （管理员）{ listBeforeConfirm:boolean } 没本人确认前上不上公开列表
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { proxyList, proxyOne, setProxySettings } from '@/lib/jobs/proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await proxyList());
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await proxyOne(s, await body(req)));
});
export const PATCH = handler(async (req: Request) => {
  const s = await requireStaff(req, 'admin');
  return ok(await setProxySettings(s, await body(req)));
});
