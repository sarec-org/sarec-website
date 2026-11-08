/** POST /api/v1/staff/mp-bind —— 网站后台：生成“在小程序里用工作台”的一次性绑定码（10 分钟有效），用自己的微信扫一下即绑定 */
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
import { createBindCode } from '@/lib/crm/workbench';
import { staffBindCode, wxConfigured } from '@/lib/crm/wechat';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaffAny(req, ['checkin', 'ops', 'finance']);
  const { code, expiresAt } = await createBindCode(s);
  let qr: string | null = null;
  if (wxConfigured()) {
    const env = (process.env.WX_CODE_ENV_VERSION as 'release' | 'trial' | 'develop' | undefined) ?? 'release';
    qr = await staffBindCode(code, env).then((b) => `data:image/png;base64,${b.toString('base64')}`).catch(() => null);
  }
  return ok({ code, expiresAt, qr });
});
