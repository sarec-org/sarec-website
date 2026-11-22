/**
 * 网站后台：“在小程序里用工作台”的一次性绑定码（10 分钟有效），用自己的微信扫一下即绑定。
 * POST —— 出码：{ code, expiresAt, qr（小程序码，微信扫一扫直接打开小程序绑定页；没配微信密钥时为 null）,
 *                 qrPlain（普通二维码，内容 "sarec-bind:<码>"，在小程序「工作人员绑定码」页点「扫码绑定」扫它；任何环境都有） }
 * GET  —— 1.5.0 体验1（第三部分 2）：我绑定了没有 { bound, boundAt }；带 ?code=<码> 时再给这个码用掉了没有 { used, usedAt }，
 *         网站页面出码后每几秒问一次，扫完自动显示"已绑定好"。
 */
import QRCode from 'qrcode';
import { getPool } from '@/lib/db/client';
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
import { BIND_QR_PREFIX, createBindCode } from '@/lib/crm/workbench';
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
  const qrPlain = await QRCode.toDataURL(BIND_QR_PREFIX + code, { margin: 1, width: 300, color: { dark: '#06111E', light: '#FFFFFF' } }).catch(() => null);
  return ok({ code, expiresAt, qr, qrPlain });
});
export const GET = handler(async (req: Request) => {
  const s = await requireStaffAny(req, ['checkin', 'ops', 'finance']);
  const pool = getPool();
  const { rows } = await pool.query<{ bound: boolean; at: Date | null }>(`SELECT mp_contact_id IS NOT NULL AS bound, mp_bound_at AS at FROM staff_roles WHERE lower(email) = lower($1)`, [s.email]);
  const out: Record<string, unknown> = { bound: !!rows[0]?.bound, boundAt: rows[0]?.at ?? null };
  const code = (new URL(req.url).searchParams.get('code') ?? '').trim().toUpperCase();
  if (/^[A-Z0-9]{8}$/.test(code)) {
    const { rows: c } = await pool.query<{ used_at: Date | null }>(`SELECT used_at FROM staff_bind_codes WHERE code = $1 AND lower(staff_email) = lower($2)`, [code, s.email]);
    out.used = !!c[0]?.used_at;
    out.usedAt = c[0]?.used_at ?? null;
  }
  return ok(out);
});
