/**
 * 1.3 N 手机工作台（小程序里，只有工作人员能看到）。
 * - 工作人员身份用后台已有的工作人员表：在网站后台点“在小程序里用工作台”生成一次性绑定码，用自己的微信扫一下即绑定；换人在后台解绑。
 * - 东哥（admin）全部权限；助理（ops）运营权限；现场签到（checkin）只看签到相关。
 * - 小程序工作台不返回任何金额、订单、付款信息（合规红线不因工作台例外）；收款、会费在网站后台看。
 */
import { randomBytes } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { reviewEmail, staffFor, type Staff } from './auth';
import { CrmError } from './events';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function createBindCode(s: Staff): Promise<{ code: string; expiresAt: Date }> {
  const code = Array.from(randomBytes(8)).map((b) => ALPHA[b % ALPHA.length]).join('');
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await getPool().query(`INSERT INTO staff_bind_codes (code, staff_email, expires_at) VALUES ($1, $2, $3)`, [code, s.email, expiresAt]);
  return { code, expiresAt };
}

/** 小程序：用绑定码把当前微信账号绑到工作人员 */
export async function claimBindCode(contactId: string, rawCode: string) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) throw new CrmError('bad_request', '绑定码不对，请在网站后台重新生成');
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ staff_email: string; expires_at: Date; used_at: Date | null }>(`SELECT staff_email, expires_at, used_at FROM staff_bind_codes WHERE code = $1 FOR UPDATE`, [code]);
    const r = rows[0];
    if (!r || r.used_at) throw new CrmError('bad_request', '这个绑定码已经用过或不存在，请在网站后台重新生成');
    if (r.expires_at.getTime() < Date.now()) throw new CrmError('bad_request', '绑定码已过期，请让管理员在“团队”页重新生成');
    if (r.staff_email.toLowerCase() === reviewEmail()) throw new CrmError('forbidden', '这个账号不能绑定工作台');
    const { rows: st } = await db.query<{ name: string; is_active: boolean }>(`SELECT name, is_active FROM staff_roles WHERE email = $1`, [r.staff_email]);
    if (!st[0]?.is_active) throw new CrmError('forbidden', '这位工作人员已停用，请联系管理员');
    // 一个微信只绑一位工作人员：先清掉这个微信之前的绑定
    await db.query(`UPDATE staff_roles SET mp_contact_id = NULL, mp_bound_at = NULL WHERE mp_contact_id = $1`, [contactId]);
    await db.query(`UPDATE staff_roles SET mp_contact_id = $2, mp_bound_at = now(), updated_at = now() WHERE email = $1`, [r.staff_email, contactId]);
    await db.query(`UPDATE staff_bind_codes SET used_at = now(), used_by = $2 WHERE code = $1`, [code, contactId]);
    return { name: st[0].name };
  });
}

export async function unbindStaff(email: string) {
  await getPool().query(`UPDATE staff_roles SET mp_contact_id = NULL, mp_bound_at = NULL, updated_at = now() WHERE email = $1`, [email]);
  return { ok: true };
}

/** 小程序“我的”页：要不要显示“工作台”入口 */
export async function workbenchAccess(contactId: string | null) {
  if (!contactId) return null;
  const s = await staffFor(contactId);
  if (!s) return null;
  // 1.4.0：只有财务角色的人用不了工作台（工作台要签到 / 运营 / 管理员），不给他显示「工作台」入口，免得点进去说没权限
  if (!['admin', 'ops', 'checkin'].some((r) => s.roles.includes(r as Staff['roles'][number]))) return null;
  return { name: s.name, roles: s.roles };
}

const has = (s: Staff, r: string) => s.roles.includes('admin') || s.roles.includes(r as Staff['roles'][number]);

/** 工作台首页：今日数据、活动实时人数、待办数（不含任何金额） */
export async function workbenchHome(s: Staff) {
  const pool = getPool();
  const { rows: events } = await pool.query<{ id: string; slug: string; title: string; starts_at: Date; ends_at: Date | null; registered: number; checked_in: number; waitlisted: number; location_name: string | null }>(
    `SELECT e.id, e.slug, e.title, e.starts_at, e.ends_at, e.location_name,
            count(r.*) FILTER (WHERE r.status = 'registered')::int AS registered,
            count(r.*) FILTER (WHERE r.arrival_status = 'checked_in')::int AS checked_in,
            count(r.*) FILTER (WHERE r.status = 'waitlisted')::int AS waitlisted
       FROM events e LEFT JOIN registrations r ON r.event_id = e.id
      WHERE e.event_status <> 'cancelled' AND coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '2 days'
        AND ($1::text[] IS NULL OR e.region = ANY($1::text[]))
      GROUP BY e.id
      ORDER BY CASE WHEN coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now() THEN 2
                    WHEN e.starts_at <= now() + interval '18 hours' THEN 0 ELSE 1 END,
               CASE WHEN coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now() THEN -extract(epoch FROM e.starts_at) ELSE extract(epoch FROM e.starts_at) END
      LIMIT 10`,
    [!s.roles.includes('admin') && s.regions?.length ? s.regions : null] // 1.3.1 F：地区管理员只看自己地区
  );
  const out: Record<string, unknown> = {
    staff: { name: s.name, roles: s.roles },
    can: { checkin: has(s, 'checkin'), ops: has(s, 'ops'), admin: s.roles.includes('admin') },
    events: events.map((e) => ({ ...e, not_arrived: Math.max(0, e.registered - e.checked_in) }))
  };
  if (has(s, 'ops')) {
    const { dailyResults } = await import('./postEvent');
    const yesterday = await dailyResults().catch(() => null);
    const { rows: pend } = await pool.query<{ todo: number; cards: number; photos: number; recaps: number }>(
      `SELECT (SELECT count(*)::int FROM followups WHERE status = 'todo') AS todo,
              (SELECT count(*)::int FROM member_cards WHERE hidden_at IS NULL AND content_updated_at IS NOT NULL AND (reviewed_at IS NULL OR reviewed_at < content_updated_at)) AS cards,
              (SELECT count(*)::int FROM event_photos WHERE review_status = 'review' AND visibility = 'album' AND variant_of IS NULL AND NOT is_hidden) AS photos,
              (SELECT count(*)::int FROM event_recaps WHERE status = 'drafted') AS recaps`
    );
    // 四个结果都是人数 / 次数（“缴费入会”是人数，不是金额）
    out.results = { yesterday, pending: pend[0] };
    const { featureRanking } = await import('./features');
    const fr = await featureRanking({ days: 7 }).catch(() => null);
    out.features = fr
      ? { sampleTooSmall: fr.sampleTooSmall, top: [...fr.rows].sort((a, b) => b.times - a.times).slice(0, 3).map((x) => ({ label: x.label, times: x.times, people: x.people, registered: x.brings?.registered ?? null })) }
      : null;
    const { rows: prep } = await pool.query<{ event_id: string; title: string; total: number; done: number; overdue: number }>(
      `SELECT p.event_id, e.title,
              (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = p.event_id) AS total,
              (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = p.event_id AND i.done_at IS NOT NULL) AS done,
              (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = p.event_id AND i.done_at IS NULL AND i.due_at < now()) AS overdue
         FROM event_prep p JOIN events e ON e.id = p.event_id
        WHERE coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '3 days' ORDER BY e.starts_at LIMIT 5`
    ).catch(() => ({ rows: [] as { event_id: string; title: string; total: number; done: number; overdue: number }[] }));
    out.prep = prep;
  }
  return out;
}

/** 某场活动的实时名单（可搜索）：姓名、手机（一键拨号）、报名 / 签到状态、同行人；不含付款信息 */
export async function workbenchEvent(eventId: string, q: string) {
  const pool = getPool();
  const { rows: ev } = await pool.query<{ id: string; slug: string; title: string; starts_at: Date; ends_at: Date | null }>(`SELECT id, slug, title, starts_at, ends_at FROM events WHERE id = $1`, [eventId]);
  if (!ev[0]) throw new CrmError('not_found', '找不到这场活动');
  const query = q.trim();
  const digits = query.replace(/\D/g, '');
  const { rows } = await pool.query<{ reg_id: string; contact_id: string; name: string; phone: string | null; status: string; arrival_status: string; checked_in_at: Date | null; source: string; companion_of_name: string | null; companion_name: string | null; member_no: number }>(
    `SELECT r.id AS reg_id, c.id AS contact_id, COALESCE(r.companion_name, c.name) AS name, COALESCE(r.companion_phone, c.phone_e164) AS phone, c.member_no::int AS member_no,
            r.status, r.arrival_status, r.checked_in_at, r.source, r.companion_name,
            (SELECT oc.name FROM registrations o JOIN contacts oc ON oc.id = o.contact_id WHERE o.id = r.companion_of) AS companion_of_name
       FROM registrations r JOIN contacts c ON c.id = r.contact_id
      WHERE r.event_id = $1 AND r.status <> 'cancelled'
        AND ($2 = '' OR COALESCE(r.companion_name, c.name) ILIKE '%' || $2 || '%' OR ($3 <> '' AND COALESCE(r.companion_phone, c.phone_e164, '') LIKE '%' || $3 || '%') OR c.member_no::text = $2)
      ORDER BY (r.arrival_status = 'checked_in'), lower(COALESCE(r.companion_name, c.name))
      LIMIT 300`,
    [eventId, query, digits.length >= 3 ? digits : '']
  );
  const { rows: cnt } = await pool.query<{ registered: number; checked_in: number; waitlisted: number }>(
    `SELECT count(*) FILTER (WHERE status = 'registered')::int AS registered, count(*) FILTER (WHERE arrival_status = 'checked_in')::int AS checked_in,
            count(*) FILTER (WHERE status = 'waitlisted')::int AS waitlisted FROM registrations WHERE event_id = $1`,
    [eventId]
  );
  // 1.4.1 到场名单（东哥已点头）：每人一行——行业、公司、是不是第一次来、谁邀请的、会员还是注册用户；顶上 已到 / 已报名 / 新人
  const ids = Array.from(new Set(rows.map((r) => r.contact_id)));
  const extra = new Map<string, { company: string | null; industry: string | null; first: boolean; inviter: string | null; isMember: boolean; followup: boolean }>();
  if (ids.length) {
    const { rows: ex } = await pool.query<{ id: string; company: string | null; industry: string | null; prior: number; inviter: string | null; followup: boolean }>(
      `SELECT c.id,
              COALESCE(m.company, (SELECT co.name FROM contact_companies cc JOIN companies co ON co.id = cc.company_id WHERE cc.contact_id = c.id ORDER BY cc.is_primary DESC LIMIT 1)) AS company,
              COALESCE(NULLIF(m.industry, ''), (SELECT a.value->>'choice' FROM profile_answers a WHERE a.contact_id = c.id AND a.item_code = 'CK:profession' AND a.status = 'current' LIMIT 1)) AS industry,
              (SELECT count(*)::int FROM registrations o WHERE o.contact_id = c.id AND o.event_id <> $2 AND o.arrival_status = 'checked_in') AS prior,
              (SELECT NULLIF(ic.name, '微信用户') FROM registrations rr JOIN contacts ic ON ic.id = rr.ref_contact_id WHERE rr.event_id = $2 AND rr.contact_id = c.id
                UNION ALL SELECT NULLIF(ic2.name, '微信用户') FROM contacts ic2 WHERE ic2.id = c.referred_by LIMIT 1) AS inviter,
              EXISTS (SELECT 1 FROM followups f WHERE f.contact_id = c.id AND f.status = 'todo') AS followup
         FROM contacts c LEFT JOIN member_cards m ON m.contact_id = c.id
        WHERE c.id = ANY($1::uuid[])`,
      [ids, eventId]
    );
    const { memberStatus } = await import('./membership');
    for (const e of ex) {
      extra.set(e.id, { company: e.company, industry: e.industry, first: e.prior === 0, inviter: e.inviter, isMember: (await memberStatus(pool, e.id)).isMember, followup: e.followup });
    }
  }
  const people = rows.map((r) => {
    const x = extra.get(r.contact_id);
    const companion = !!r.companion_name;
    return {
      regId: r.reg_id, contactId: r.contact_id, name: r.name || 'SAREC 用户', phone: r.phone, memberNo: r.member_no,
      status: r.status, arrived: r.arrival_status === 'checked_in', checkedInAt: r.checked_in_at,
      note: r.companion_of_name ? `由 ${r.companion_of_name} 代报名` : r.source === 'onsite' ? '现场登记' : r.source === 'staff' ? '工作人员代报' : '',
      // 代报的朋友（companion）资料是朋友本人的，档案里的公司 / 行业属于报名人，不显示
      company: companion ? null : x?.company ?? null,
      industry: companion ? null : x?.industry ?? null,
      firstTime: companion ? true : x?.first ?? true,
      inviter: companion ? r.companion_of_name : x?.inviter ?? null,
      isMember: companion ? false : x?.isMember ?? false,
      followup: x?.followup ?? false
    };
  });
  const arrivedNew = people.filter((p) => p.arrived && p.firstTime).length;
  const ended = new Date(ev[0].ends_at ?? new Date(new Date(ev[0].starts_at).getTime() + 3 * 3600e3)).getTime() < Date.now();
  return {
    event: ev[0],
    counts: { ...cnt[0], not_arrived: Math.max(0, cnt[0].registered - cnt[0].checked_in), new_arrived: arrivedNew },
    // 活动结束后自动出一页总结
    summary: ended
      ? {
          arrived: cnt[0].checked_in,
          registered: cnt[0].registered,
          newcomers: people.filter((p) => p.arrived && p.firstTime).map((p) => p.name),
          members: people.filter((p) => p.arrived && p.isMember).length,
          noShow: people.filter((p) => !p.arrived && p.status === 'registered').length,
          followups: people.filter((p) => p.followup).map((p) => p.name)
        }
      : null,
    people
  };
}

/**
 * 1.4.1 到场名单 → 点开一个人：完整档案（来过几次、填过的资料、备注、标签、待跟进）。不含金额。
 */
export async function workbenchPerson(contactId: string) {
  if (!/^[0-9a-f-]{36}$/.test(contactId)) throw new CrmError('not_found', '找不到这个人');
  const pool = getPool();
  const { rows: c } = await pool.query<{ id: string; name: string; phone: string | null; email: string | null; member_no: number; region: string | null; created_at: Date; first_channel: string | null; referred: string | null }>(
    `SELECT c.id, NULLIF(c.name, '微信用户') AS name, c.phone_e164 AS phone, c.email, c.member_no::int AS member_no, c.region_self AS region, c.created_at, c.first_channel,
            (SELECT NULLIF(r.name, '微信用户') FROM contacts r WHERE r.id = c.referred_by) AS referred
       FROM contacts c WHERE c.id = $1`,
    [contactId]
  );
  if (!c[0]) throw new CrmError('not_found', '找不到这个人');
  const { memberStatus } = await import('./membership');
  const ms = await memberStatus(pool, contactId);
  const { rows: card } = await pool.query<{ company: string | null; title: string | null; industry: string | null; intro: string | null }>(
    `SELECT company, title, industry, intro FROM member_cards WHERE contact_id = $1`, [contactId]
  );
  const { rows: events } = await pool.query<{ title: string; starts_at: Date; arrived: boolean; status: string }>(
    `SELECT e.title, e.starts_at, r.arrival_status = 'checked_in' AS arrived, r.status FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE r.contact_id = $1 AND r.status <> 'cancelled' ORDER BY e.starts_at DESC LIMIT 20`,
    [contactId]
  );
  const { rows: answers } = await pool.query<{ code: string; value: Record<string, unknown> }>(
    `SELECT item_code AS code, value FROM profile_answers WHERE contact_id = $1 AND status = 'current' ORDER BY created_at DESC LIMIT 30`,
    [contactId]
  ).catch(() => ({ rows: [] as { code: string; value: Record<string, unknown> }[] }));
  const { rows: tags } = await pool.query<{ tag: string }>(`SELECT tag FROM contact_tags WHERE contact_id = $1 ORDER BY created_at`, [contactId]);
  const { rows: notes } = await pool.query<{ body: string; created_by: string; created_at: Date }>(
    `SELECT body, created_by, created_at FROM contact_staff_notes WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 30`, [contactId]
  ).catch(() => ({ rows: [] as { body: string; created_by: string; created_at: Date }[] }));
  const { rows: fu } = await pool.query<{ id: string; need: string | null; status: string }>(
    `SELECT id, need, status FROM followups WHERE contact_id = $1 AND status = 'todo' ORDER BY created_at DESC LIMIT 5`, [contactId]
  );
  const answerText = (v: Record<string, unknown>) => String(v.text ?? v.choice ?? v.label ?? (Array.isArray(v.choices) ? (v.choices as string[]).join('、') : '') ?? '').slice(0, 120);
  return {
    person: {
      id: c[0].id, name: c[0].name ?? 'SAREC 用户', phone: c[0].phone, email: c[0].email, memberNo: c[0].member_no, region: c[0].region,
      isMember: ms.isMember, since: c[0].created_at, referredBy: c[0].referred, channel: c[0].first_channel,
      company: card[0]?.company ?? null, title: card[0]?.title ?? null, industry: card[0]?.industry ?? null, intro: card[0]?.intro ?? null
    },
    visits: events.filter((e) => e.arrived).length,
    events: events.map((e) => ({ title: e.title, startsAt: e.starts_at, arrived: e.arrived })),
    answers: answers.map((a) => ({ code: a.code, text: answerText(a.value || {}) })).filter((a) => a.text),
    tags: tags.map((t) => t.tag),
    notes,
    followups: fu
  };
}

/** 1.4.1 工作台当场操作：写备注、打标签、标“要跟进” */
export async function workbenchPersonAction(s: Staff, contactId: string, b: { action?: string; text?: string; eventId?: string | null }) {
  if (!/^[0-9a-f-]{36}$/.test(contactId)) throw new CrmError('not_found', '找不到这个人');
  const pool = getPool();
  const text = String(b.text ?? '').trim().slice(0, 500);
  const eventId = b.eventId && /^[0-9a-f-]{36}$/.test(b.eventId) ? b.eventId : null;
  const who = s.name || s.email;
  if (b.action === 'note') {
    if (!text) throw new CrmError('bad_request', '备注没写内容');
    await pool.query(`INSERT INTO contact_staff_notes (contact_id, event_id, body, created_by) VALUES ($1, $2, $3, $4)`, [contactId, eventId, text, who]);
    return { done: '备注已保存' };
  }
  if (b.action === 'tag') {
    const tag = text.slice(0, 30);
    if (!tag) throw new CrmError('bad_request', '标签没写内容');
    await pool.query(`INSERT INTO contact_tags (contact_id, tag, source) VALUES ($1, $2, 'staff') ON CONFLICT DO NOTHING`, [contactId, tag]);
    return { done: `已打标签「${tag}」` };
  }
  if (b.action === 'followup') {
    const { rows } = await pool.query<{ name: string | null; phone: string | null }>(`SELECT NULLIF(name, '微信用户') AS name, phone_e164 AS phone FROM contacts WHERE id = $1`, [contactId]);
    const { upsertFollowup } = await import('./followups');
    const r = await upsertFollowup(pool, {
      source: 'manual', dedupeKey: `wb_followup:${contactId}:${eventId ?? 'none'}`, contactId, name: rows[0]?.name ?? null, contactText: rows[0]?.phone ?? null,
      need: text || `${who} 在工作台标记要跟进`, eventId
    });
    return { done: r.created ? '已标“要跟进”，在后台「待跟进」里能看到' : '这个人这一场已经标过“要跟进”了' };
  }
  throw new CrmError('bad_request', '不支持的操作');
}

/** 给小程序工作台的返回值再过一遍：去掉金额 / 订单 / 付款相关字段，文字里带金额的句子去掉 */
export function mpSafe<T>(v: T): T {
  const BAD_KEY = /(cents|amount|price|order|payment|paid|fee|zelle|stripe|pay_link|money)/i;
  const walk = (x: unknown): unknown => {
    if (typeof x === 'string') return noMoneyText(x);
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype) {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(x as Record<string, unknown>)) if (!BAD_KEY.test(k)) out[k] = walk(val);
      return out;
    }
    return x;
  };
  return walk(v) as T;
}
function noMoneyText(s: string): string {
  // 签到台“到场待核款”之类的提示：小程序里只说“请到签到台确认”，不出现金额和付款方式
  if (/付款|缴费|zelle|stripe|核款/i.test(s)) return '这位还需要在签到台确认费用，收款请在网站后台处理';
  return noMoneyImpl(s) ?? '';
}
import { noMoney as noMoneyImpl } from '@/lib/noMoney';

/** 工作台待办：待跟进（不含 AI 起草的联系草稿——小程序里不展示 AI 内容）、待审名片、待审照片 */
export async function workbenchTodo() {
  const pool = getPool();
  const { rows: followups } = await pool.query<{ id: string; name: string; contact_text: string | null; need: string | null; source: string; next_date: string | null }>(
    `SELECT id, name, contact_text, need, source, next_date::text AS next_date FROM followups WHERE status = 'todo' ORDER BY next_date NULLS LAST, created_at DESC LIMIT 50`
  );
  const { listCardsForReview } = await import('./cardReview');
  const cards = await listCardsForReview('pending', null).catch(() => null);
  const { listPhotosForReview } = await import('./customerPhotos');
  const photos = await listPhotosForReview('review').catch(() => null);
  return {
    followups: followups.map((f) => ({ id: f.id, name: f.name, contact: f.contact_text, need: f.need, source: f.source, nextDate: f.next_date })),
    cards: (cards?.cards ?? []).filter((c) => c.pending).slice(0, 50)
      .map((c) => ({ contactId: c.contact_id, name: c.name, company: c.company, title: c.title, intro: c.intro, avatarUrl: c.avatar_url })),
    photos: (photos?.photos ?? []).slice(0, 60).map((p) => ({ id: p.id, thumb: p.thumb_url ?? p.url, event: p.event_title, uploader: p.uploader }))
  };
}
