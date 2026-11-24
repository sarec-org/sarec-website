/** POST 取消报名 / 撤回接龙 */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { cancelReg } from '@/lib/org/service';
export const POST = handler(async (req: Request, { params }: { params: { code: string } }) => ok(await cancelReg(params.code, await requireContact(req))));
