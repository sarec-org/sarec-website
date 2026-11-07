/**
 * 1.3 M：私企面对面会后“本场电子名册”。
 * - 只收本场到场（已签到）的人；每人：照片（头像）、一句话业务介绍、公司职位、本人在电子名片里选择公开的联系方式。
 * - 名片被工作人员下架的人不进名册。
 * - 会后自动生成，发给参与者（邮件里一个链接 /zh/roster/<编号>；小程序“我的报名”里也能看），每人可以一键打开对方的电子名片。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import { getContactInfo } from './contactInfo';

export type RosterEntry = { name: string; avatarUrl: string | null; company: string | null; title: string | null; intro: string | null; phone: string | null; email: string | null; wechatId: string | null; cardToken: string | null };

export async function buildRoster(eventId: string, opts: { send?: boolean } = {}) {
  const pool = getPool();
  const { rows } = await pool.query<{ contact_id: string; name: string; avatar_url: string | null; token: string | null; company: string | null; title: string | null; intro: string | null; wechat_id: string | null; show_phone: boolean | null; show_email: boolean | null; show_wechat: boolean | null; hidden_at: Date | null }>(
    `SELECT r.contact_id, c.name, c.avatar_url, m.token, m.company, m.title, m.intro, m.wechat_id, m.show_phone, m.show_email, m.show_wechat, m.hidden_at
       FROM registrations r JOIN contacts c ON c.id = r.contact_id LEFT JOIN member_cards m ON m.contact_id = r.contact_id
      WHERE r.event_id = $1 AND r.arrival_status = 'checked_in' AND NOT c.is_placeholder
      ORDER BY r.checked_in_at`,
    [eventId]
  );
  const entries: RosterEntry[] = [];
  for (const r of rows) {
    if (r.hidden_at) continue;
    const info = await getContactInfo(pool, r.contact_id);
    entries.push({
      name: r.name && r.name !== '微信用户' ? r.name : 'SAREC 用户',
      avatarUrl: r.avatar_url,
      company: r.company,
      title: r.title,
      intro: r.intro,
      phone: r.show_phone ? info.phone?.value ?? null : null,
      email: r.show_email ? info.email?.value ?? null : null,
      wechatId: r.show_wechat ? r.wechat_id : null,
      cardToken: r.token
    });
  }
  const { rows: up } = await pool.query<{ token: string; sent_at: Date | null }>(
    `INSERT INTO event_rosters (event_id, entries) VALUES ($1, $2)
     ON CONFLICT (event_id) DO UPDATE SET entries = EXCLUDED.entries RETURNING token, sent_at`,
    [eventId, JSON.stringify(entries)]
  );
  let sent = 0;
  if (opts.send && !up[0].sent_at) sent = await sendRoster(eventId, up[0].token);
  return { entries: entries.length, token: up[0].token, sent };
}

async function sendRoster(eventId: string, token: string): Promise<number> {
  const { getResend, getFromAddress, isEmailConfigured } = await import('@/lib/email/resend-client');
  if (!isEmailConfigured()) return 0;
  const pool = getPool();
  const { rows: ev } = await pool.query<{ title: string }>(`SELECT title FROM events WHERE id = $1`, [eventId]);
  const { rows: to } = await pool.query<{ name: string; email: string | null }>(
    `SELECT c.name, COALESCE(c.email, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'email' AND m.is_current LIMIT 1)) AS email
       FROM registrations r JOIN contacts c ON c.id = r.contact_id WHERE r.event_id = $1 AND r.arrival_status = 'checked_in' AND NOT c.is_placeholder`,
    [eventId]
  );
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');
  let sent = 0;
  for (const p of to) {
    if (!p.email) continue;
    const res = await getResend().emails.send({
      from: getFromAddress(), to: p.email,
      subject: `【SAREC】${ev[0]?.title ?? ''} 本场电子名册`,
      text: `${p.name || ''}您好，\n\n感谢参加「${ev[0]?.title ?? ''}」。这是本场的电子名册（每位参与者的照片、一句话业务介绍、本人同意公开的联系方式）：\n${base}/zh/roster/${token}\n\n名册只发给本场参与者，请勿外传。在商会小程序“我的报名”里也能打开，点每个人可以查看对方的电子名片。\n\n中美房地产商会 SAREC`
    });
    if (!res.error) sent++;
  }
  await pool.query(`UPDATE event_rosters SET sent_at = now() WHERE event_id = $1`, [eventId]);
  return sent;
}

/** 网站：凭名册编号查看（邮件里的链接） */
export async function rosterByToken(token: string) {
  if (!/^[a-f0-9]{24}$/.test(token)) throw new CrmError('not_found', '找不到这份名册');
  const { rows } = await getPool().query<{ entries: RosterEntry[]; title: string; starts_at: Date }>(
    `SELECT r.entries, e.title, e.starts_at FROM event_rosters r JOIN events e ON e.id = r.event_id WHERE r.token = $1`,
    [token]
  );
  if (!rows[0]) throw new CrmError('not_found', '找不到这份名册');
  return rows[0];
}

/** 小程序：本场到场的人才能看 */
export async function rosterForParticipant(slug: string, contactId: string) {
  const pool = getPool();
  const { rows } = await pool.query<{ entries: RosterEntry[]; title: string }>(
    `SELECT r.entries, e.title FROM event_rosters r JOIN events e ON e.id = r.event_id
      WHERE e.slug = $1 AND EXISTS (SELECT 1 FROM registrations x WHERE x.event_id = e.id AND x.contact_id = $2 AND x.arrival_status = 'checked_in')`,
    [slug, contactId]
  );
  if (!rows[0]) throw new CrmError('not_found', '名册只给本场到场的人看');
  return rows[0];
}
