/** 1.3.1 G3：后台“首页轮播”。GET ?region= → 当前手动设置 + 新人 / 会员 / 已报名分别看到什么；
 *  POST { action: 'pin'|'hide'|'edit'|'add', target?, title?, eyebrow?, meta?, imageUrl?, buttonText?, link?, audience?, region?, expiresAt }（必须有截止时间）
 *  DELETE ?id= → 撤掉一条手动设置 */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { actor, audit } from '@/lib/crm/staff';
import { previewCarousel, slideCandidates } from '@/lib/crm/home131';
import { isRegion } from '@/lib/crm/regions';
import { hasMoney } from '@/lib/noMoney';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const region = new URL(req.url).searchParams.get('region') ?? undefined;
  const { rows } = await getPool().query(
    `SELECT id, action, target, kind, title, eyebrow, meta, image_url, button_text, link, audience, region, expires_at, created_by, created_at
       FROM home_slides WHERE removed_at IS NULL AND expires_at > now() ORDER BY created_at DESC`
  );
  return ok({ overrides: rows, preview: await previewCarousel(region), candidates: await slideCandidates() });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ action?: string; target?: string; title?: string; eyebrow?: string; meta?: string; imageUrl?: string; buttonText?: string; link?: string; audience?: string; region?: string; expiresAt?: string }>(req);
  if (!['pin', 'hide', 'edit', 'add'].includes(String(b.action))) throw new CrmError('bad_request', '请选择操作');
  const exp = new Date(String(b.expiresAt ?? ''));
  if (Number.isNaN(exp.getTime()) || exp.getTime() <= Date.now()) throw new CrmError('bad_request', '手动设置必须填截止时间（以后的时间）');
  if (exp.getTime() > Date.now() + 90 * 86400_000) throw new CrmError('bad_request', '截止时间最长 90 天');
  if (b.action !== 'add' && !b.target) throw new CrmError('bad_request', '请选择要设置的那一张');
  if (b.action === 'add' && !b.title) throw new CrmError('bad_request', '请填写标题');
  const txt = (v?: string, n = 60) => (v ? String(v).trim().slice(0, n) : null);
  // 轮播上不出现金额、付款字样和“已报 N 人”
  for (const t of [b.title, b.eyebrow, b.meta, b.buttonText]) {
    if (t && (hasMoney(String(t)) || /付款|缴费|付费|价格|收费/.test(String(t)) || /已报\s*\d+\s*人/.test(String(t)))) throw new CrmError('bad_request', '轮播文案里不能有金额、付款字样或“已报 N 人”');
  }
  if (b.link && !/^\/pages\/[a-z0-9/_-]+(\?[\w=&%.-]*)?$/i.test(b.link)) throw new CrmError('bad_request', '链接只能是小程序页面（/pages/…）');
  const audience = ['all', 'new', 'member', 'registered'].includes(String(b.audience)) ? b.audience : 'all';
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO home_slides (action, target, kind, title, eyebrow, meta, image_url, button_text, link, audience, region, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [b.action, b.target ?? null, b.action === 'add' ? 'notice' : 'event', txt(b.title, 40), txt(b.eyebrow, 30), txt(b.meta, 60), txt(b.imageUrl, 500), txt(b.buttonText, 8), b.link ?? null, audience, isRegion(b.region) ? b.region : null, exp, actor(s)]
  );
  await audit(getPool() as never, s, 'home_slide', 'home_slide', rows[0].id, { after: { action: b.action, target: b.target, expiresAt: exp } });
  return ok({ id: rows[0].id });
});
export const DELETE = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new CrmError('bad_request', '请选择要撤掉的设置');
  await getPool().query(`UPDATE home_slides SET removed_at = now() WHERE id = $1`, [id]);
  await audit(getPool() as never, s, 'home_slide_remove', 'home_slide', id, {});
  return ok({ ok: true });
});
