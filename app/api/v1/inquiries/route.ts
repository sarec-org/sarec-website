/** POST /api/v1/inquiries —— 咨询（网站表单不需要微信、不需要登录；小程序“联系商会”）。生成待跟进任务并邮件通知 info@ */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, optionalContact, siteUrl } from '@/lib/crm/http';
import { createInquiry } from '@/lib/crm/inquiries';
import { ipHash } from '@/lib/agent/guard';
import { laDay } from '@/lib/agent/text';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<Record<string, unknown>>(req);
  if (typeof b.website === 'string' && b.website) return ok({ received: true }); // 机器人陷阱字段
  const me = await optionalContact(req);
  // 同一来源 10 分钟内最多 5 条，防刷
  // IP 只存按天加盐的哈希（和 AI 助手一致），不存原始 IP
  const rawIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const ip = ipHash(rawIp || null, laDay(new Date())) ?? '-';
  const { rows } = await getPool().query<{ n: number }>(
    `SELECT count(*)::int AS n FROM inquiries WHERE created_at > now() - interval '10 minutes' AND fields->>'_ip' = $1`,
    [ip]
  );
  if (rows[0].n >= 5) throw new CrmError('too_soon', '提交太频繁，请稍后再试');
  const fields = typeof b.fields === 'object' && b.fields ? (b.fields as Record<string, unknown>) : {};
  const r = await createInquiry(
    {
      source: b.source === 'mp' ? 'mp' : 'web_form',
      intent: b.intent as string, name: b.name as string, phone: b.phone as string, email: b.email as string,
      wechat: b.wechat as string, message: b.message as string, fields: { ...fields, _ip: ip },
      contactId: me, ref: typeof b.ref === 'string' || typeof b.ref === 'number' ? String(b.ref) : null
    },
    siteUrl(req)
  );
  return ok({ received: true, id: r.inquiryId });
});
