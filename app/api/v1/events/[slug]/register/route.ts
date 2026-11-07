/** POST /api/v1/events/:slug/register —— 报名（首次：name + roleSub；再次：answers 必答题；phone + email 必填）。重复提交回到原报名。
 *  1.3：小程序报名收费活动（私企面对面等）后，自动给本人发邮件 / 短信附网站付款链接（小程序里不出现金额和付款方式）。 */
import { getPool } from '@/lib/db/client';
import { register, type RegisterInput } from '@/lib/crm/flow';
import { sendPayLinkOnce } from '@/lib/crm/payLinks';
import { body, handler, isMp12, ok, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  const out = await register(params.slug, me, await body<RegisterInput>(req), { base: siteUrl(req) });
  if (out.orderNo && (await isMp12(req))) {
    const { rows } = await getPool().query<{ id: string }>(
      `SELECT r.id FROM registrations r JOIN events e ON e.id = r.event_id WHERE e.slug = $1 AND r.contact_id = $2 AND r.status = 'registered'`,
      [params.slug, me]
    );
    if (rows[0]) await sendPayLinkOnce(rows[0].id).catch(() => undefined);
  }
  return ok(out);
});
