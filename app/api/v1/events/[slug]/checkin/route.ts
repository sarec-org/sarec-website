/** POST /api/v1/events/:slug/checkin { k, name?, roleSub?, phone?, v? } —— 扫码签到（所有路径统一走 checkIn 入场判断）
 *
 * v = 3（1.3 小程序，零指导）：
 *  - 已报名：直接签到，返回 greetName，页面显示“XX，欢迎！已签到”，不需要再点任何按钮；
 *  - 没报名：只要姓名、手机两项（不问行业），提交即现场报名并签到；
 *  - 已签到又扫：kind = already，“您已签到，祝您愉快”。
 * v = 4（1.3.1）：step = scan | sms | new | answers，见 lib/crm/checkin131.ts。
 * v = 2（1.2 小程序）/ 旧版：保持原来的行为（新人填姓名、行业）。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError, checkIn, checkinWindow } from '@/lib/crm/events';
import { register, requireEvent } from '@/lib/crm/flow';
import { loadProfile } from '@/lib/crm/profile';
import { body, handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
import { checkinKeyOk } from '@/lib/crm/wechat';
import { answer as ckAnswer, newcomer, scan, sendSms, wxPhoneStep } from '@/lib/crm/checkin131';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  k?: string; name?: string; roleSub?: string; phone?: string; email?: string; v?: number;
  // 1.3.1（v = 4）
  step?: 'scan' | 'sms' | 'wxphone' | 'new' | 'answers'; profession?: string; phoneCode?: string; phoneProof?: string; cc?: string; smsCode?: string;
  answers?: Record<string, { choice?: string; text?: string }>;
};

export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  const b = await body<Body>(req);
  const v = Number(b.v) || 1;
  const pool = getPool();
  const ev = await withTransaction((db) => requireEvent(db, params.slug));
  const { rows } = await pool.query<{ checkin_secret: string }>('SELECT checkin_secret FROM events WHERE id = $1', [ev.id]);
  if (!checkinKeyOk(b.k, rows[0]?.checkin_secret)) {
    throw new CrmError('wrong_code', v >= 3 ? '这不是本场活动门口的签到码。请找门口贴的签到码，再扫一次。' : '这不是本场活动的签到码，请扫门口的签到码');
  }

  // 1.3 P1：不在这场活动的签到时间里（别的日子的码），不签到、写清是哪天的活动
  const win = checkinWindow(ev);
  if (win.state !== 'open') {
    if (v >= 3) return ok({ result: { kind: 'wrong_day', message: win.message } });
    throw new CrmError('wrong_day', win.message);
  }
  // 1.3.1 A：注册 + 签到一体（新人一屏三项 / 来过的人 1–3 道选择题 / 资料齐了直接欢迎光临）
  if (v >= 4) {
    if (b.step === 'wxphone') return ok({ wxphone: await wxPhoneStep(me, String(b.phoneCode ?? '')) });
    if (b.step === 'sms') return ok({ sms: await sendSms(me, String(b.phone ?? ''), String(b.cc ?? '+1')) });
    if (b.step === 'new') {
      const r = await newcomer(params.slug, me, b);
      return ok({ result: r.step, ...(r.token ? { token: r.token } : {}) });
    }
    if (b.step === 'answers') return ok({ result: await ckAnswer(params.slug, me, b.answers ?? {}) });
    return ok({ result: await scan(params.slug, me) });
  }
  if (v >= 3) return ok({ result: await zeroGuideCheckin(params.slug, me, b, siteUrl(req)) });

  // 旧版：现场新客先最少登记三项（姓名、联系方式、主要角色）
  const { answered } = await loadProfile(pool, me);
  if (!answered.has('Q03')) {
    if (!b.name || !b.roleSub) return ok({ result: { kind: 'need_profile', message: '第一次来，请先填姓名和主要行业，10 秒完成' } });
    const contact = b.phone !== undefined || b.email !== undefined ? { phone: b.phone ?? '', email: b.email ?? '' } : {};
    await register(params.slug, me, { name: b.name, roleSub: b.roleSub, channel: 'onsite', oneStep: b.v === 2, ...contact }, { base: siteUrl(req) });
  }
  const result = await withTransaction(async (db) => checkIn(db, await requireEvent(db, params.slug), me));
  // 1.2 小程序（v = 2）：不返回金额、订单号，收费未确认只提示“工作人员确认”
  if (b.v === 2 && result.kind === 'pending_payment') {
    return ok({ result: { kind: 'pending_payment', message: '本场为收费活动，工作人员会在门口为您确认，请稍候' } });
  }
  return ok({ result });
});

/** 1.3：已报名直接签到；没报名只要姓名 + 手机 */
async function zeroGuideCheckin(slug: string, me: string, b: Body, base: string) {
  const pool = getPool();
  const { rows: regRows } = await pool.query<{ status: string }>(
    `SELECT r.status FROM registrations r JOIN events e ON e.id = r.event_id WHERE e.slug = $1 AND r.contact_id = $2`,
    [slug, me]
  );
  const registered = !!regRows[0] && regRows[0].status !== 'cancelled';
  if (!registered) {
    const { rows: c } = await pool.query<{ name: string | null; phone: string | null }>(
      `SELECT NULLIF(name, '微信用户') AS name,
              COALESCE(phone_e164, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.is_current)) AS phone
         FROM contacts c WHERE id = $1`,
      [me]
    );
    const haveName = !!(b.name?.trim() || c[0]?.name);
    const havePhone = !!(b.phone?.trim() || c[0]?.phone);
    if (!haveName || !havePhone) {
      return { kind: 'need_profile', message: '第一次来？填姓名和手机两项，马上签到。', need: { name: !c[0]?.name, phone: !c[0]?.phone } };
    }
    await register(
      slug,
      me,
      { name: b.name?.trim() || c[0]?.name || '', channel: 'onsite', oneStep: true, allowNoRole: true, ...(b.phone?.trim() ? { phone: b.phone.trim() } : {}) },
      { base }
    );
  }
  const result = await withTransaction(async (db) => checkIn(db, await requireEvent(db, slug), me));
  const { rows: nm } = await pool.query<{ name: string | null }>(`SELECT NULLIF(name, '微信用户') AS name FROM contacts WHERE id = $1`, [me]);
  const greetName = (nm[0]?.name || '').trim().slice(0, 20) || null;
  if (result.kind === 'checked_in') return { kind: 'checked_in', greetName, message: greetName ? `${greetName}，欢迎！已签到` : '欢迎！已签到' };
  if (result.kind === 'already') return { kind: 'already', greetName, message: '您已签到，祝您愉快' };
  if (result.kind === 'pending_payment') return { kind: 'pending_payment', message: '本场为收费活动，请到门口找工作人员确认，确认后就能入场。' };
  if (result.kind === 'waitlisted') return { kind: 'waitlisted', message: '本场名额已满，您在候补名单里。请到门口找工作人员，有空位会马上为您安排。' };
  return { kind: 'rejected', message: result.message };
}
