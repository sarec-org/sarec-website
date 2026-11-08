/** GET /api/v1/workbench/access —— 小程序“我的”页：当前微信账号是不是工作人员（不是就返回 null，不显示入口） */
import { handler, ok, optionalContact } from '@/lib/crm/http';
import { workbenchAccess } from '@/lib/crm/workbench';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok({ staff: await workbenchAccess(await optionalContact(req)) }));
