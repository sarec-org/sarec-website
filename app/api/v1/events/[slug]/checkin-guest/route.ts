/** POST /api/v1/events/:slug/checkin-guest { k, name, phone, cc?: '+1' | '+86' } —— 网页签到（1.3 零指导）
 *
 * 用在：有人用微信扫到了“网页签到码”，或用手机相机扫码在浏览器里打开。网页认不出微信身份，
 * 以前要收验证码再补姓名、行业（11/6 现场就卡在这一步）。现在只填姓名、手机两项：
 *  - 手机号对得上已有报名：直接给那份报名签到；
 *  - 对不上：按这个手机号建一份档案（或用已有档案），现场报名并签到。
 * 不创建登录状态（没验证过手机号，不能凭它登录别人的账号）；页面问候只用对方刚填的名字，不回显库里的资料。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError, checkIn, normalizePhone } from '@/lib/crm/events';
import { register, requireEvent } from '@/lib/crm/flow';
import { body, handler, ok, siteUrl } from '@/lib/crm/http';
import { checkinKeyOk } from '@/lib/crm/wechat';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const b = await body<{ k?: string; name?: string; phone?: string; cc?: string }>(req);
  const name = (b.name ?? '').trim().slice(0, 60);
  const phone = normalizePhone(String(b.phone ?? ''), b.cc === '+86' ? '+86' : '+1');
  if (!name) throw new CrmError('bad_request', '请填写您的姓名');
  if (!phone) throw new CrmError('bad_phone', '手机号好像不对，请检查一下（美国号码 10 位，中国号码 11 位）');
  const pool = getPool();
  const ev = await withTransaction((db) => requireEvent(db, params.slug));
  const { rows: sec } = await pool.query<{ checkin_secret: string }>('SELECT checkin_secret FROM events WHERE id = $1', [ev.id]);
  if (!checkinKeyOk(b.k, sec[0]?.checkin_secret)) throw new CrmError('wrong_code', '这不是本场活动门口的签到码。请找门口贴的签到码，再扫一次。');

  // 1) 这个手机号有没有这场活动的报名（档案手机号或联系方式里的手机号）
  const { rows: hit } = await pool.query<{ contact_id: string }>(
    `SELECT r.contact_id FROM registrations r JOIN contacts c ON c.id = r.contact_id
      WHERE r.event_id = $1 AND r.status <> 'cancelled'
        AND (c.phone_e164 = $2 OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.value = $2))
      ORDER BY r.created_at LIMIT 1`,
    [ev.id, phone]
  );
  let contactId = hit[0]?.contact_id ?? null;
  if (!contactId) {
    // 2) 没有报名：用这个手机号的已有档案，没有就新建一份（现场登记）
    const { rows: c } = await pool.query<{ id: string }>(
      `SELECT c.id FROM contacts c WHERE c.phone_e164 = $1
          OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.value = $1 AND m.is_current)
        ORDER BY c.created_at LIMIT 1`,
      [phone]
    );
    contactId = c[0]?.id ?? null;
    if (!contactId) {
      const { rows: ins } = await pool.query<{ id: string }>(
        `INSERT INTO contacts (name, acquisition_source) VALUES ($1, 'onsite_web') RETURNING id`,
        [name]
      );
      contactId = ins[0].id;
    }
    await register(params.slug, contactId, { name, phone, channel: 'onsite', oneStep: true, allowNoRole: true }, { base: siteUrl(req) });
  }
  const result = await withTransaction(async (db) => checkIn(db, await requireEvent(db, params.slug), contactId!));
  if (result.kind === 'checked_in') return ok({ result: { kind: 'checked_in', message: `${name}，欢迎！已签到` } });
  if (result.kind === 'already') return ok({ result: { kind: 'already', message: '您已签到，祝您愉快' } });
  if (result.kind === 'pending_payment') return ok({ result: { kind: 'pending_payment', message: '本场为收费活动，请到门口找工作人员确认，确认后就能入场。' } });
  if (result.kind === 'waitlisted') return ok({ result: { kind: 'waitlisted', message: '本场名额已满，您在候补名单里。请到门口找工作人员，有空位会马上为您安排。' } });
  return ok({ result: { kind: 'rejected', message: result.message } });
});
