/** 1.5.0 后台商会风采（运营）：GET 全部（含已下架）+ 首页入口开关；POST 保存一家 / { homeEntry: boolean } */
import { getPool } from '@/lib/db/client';
import { getSetting, setSetting } from '@/lib/crm/orders';
import { listShowcase, saveShowcase } from '@/lib/crm/ugc';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ orgs: await listShowcase(true), homeEntry: (await getSetting<boolean>(getPool(), 'showcase_home_entry', true)) === true });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<Record<string, unknown>>(req);
  if (typeof b.homeEntry === 'boolean') {
    await setSetting(getPool(), 'showcase_home_entry', b.homeEntry, s.name);
    return ok({ message: b.homeEntry ? '小程序首页已显示「商会风采」入口' : '小程序首页已收起「商会风采」入口' });
  }
  return ok(await saveShowcase(s, b));
});
