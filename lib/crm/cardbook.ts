/**
 * 1.3.1 D：交换名片与名片夹。
 * - 扫对方名片码 → 一键“存入名片夹并回递我的名片”→ 对方收到请求，同意后双方互存（双方同意才互存）。
 * - 名片夹按“在哪场活动认识”分组：请求里带了活动就用它；没带就用两人同一天都签到的那场。
 * - 可写一句备注（只有自己看得到）；可搜姓名、公司、行业。
 * - 交换成功双方各记 2 积分（只记账不兑换；同一对人只记一次）。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { msgSecCheck } from '@/lib/crm/contentSec';
import { memberStatus } from '@/lib/crm/membership';

export const CARD_POINTS = 2;
export const TEMPLATES = [
  { key: 'navy', name: '深蓝金商务' },
  { key: 'white', name: '简约白' },
  { key: 'bilingual', name: '中英双语' },
  { key: 'estate', name: '地产项目' }
] as const;

async function cardOwner(token: string): Promise<string> {
  if (!/^[a-f0-9]{8,32}$/.test(token)) throw new CrmError('not_found', '名片不存在');
  const { rows } = await getPool().query<{ contact_id: string; hidden_at: Date | null }>(`SELECT contact_id, hidden_at FROM member_cards WHERE token = $1`, [token]);
  if (!rows[0] || rows[0].hidden_at) throw new CrmError('not_found', '名片不存在或已下架');
  return rows[0].contact_id;
}

/** 两人在同一场活动都签到过（最近一场） */
async function metAt(a: string, b: string): Promise<string | null> {
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT e.id FROM events e
      WHERE EXISTS (SELECT 1 FROM registrations r WHERE r.event_id = e.id AND r.contact_id = $1 AND r.arrival_status = 'checked_in')
        AND EXISTS (SELECT 1 FROM registrations r WHERE r.event_id = e.id AND r.contact_id = $2 AND r.arrival_status = 'checked_in')
      ORDER BY e.starts_at DESC LIMIT 1`,
    [a, b]
  );
  return rows[0]?.id ?? null;
}

/** 扫码后：“存入名片夹并回递我的名片” */
export async function requestExchange(me: string, token: string, slug?: string | null) {
  const target = await cardOwner(token);
  if (target === me) throw new CrmError('bad_request', '这是您自己的名片');
  const { rows: mine } = await getPool().query(`SELECT 1 FROM contacts WHERE id = $1 AND NULLIF(name, '微信用户') IS NOT NULL`, [me]);
  if (!mine[0]) throw new CrmError('need_card', '先做一张自己的名片（30 秒），才能回递给对方');
  return withTransaction(async (db) => {
    const { rows: ex } = await db.query<{ id: string; status: string; requester_id: string }>(
      `SELECT id, status, requester_id FROM card_exchanges WHERE LEAST(requester_id, target_id) = LEAST($1::uuid, $2::uuid) AND GREATEST(requester_id, target_id) = GREATEST($1::uuid, $2::uuid) AND status <> 'declined' FOR UPDATE`,
      [me, target]
    );
    if (ex[0]?.status === 'accepted') return { status: 'accepted', message: '已经在您的名片夹里了' };
    // 对方先扫过我、我现在扫对方 = 双方都同意
    if (ex[0] && ex[0].requester_id === target) return accept(db, me, ex[0].id);
    if (ex[0]) return { status: 'pending', message: '已发给对方，对方同意后双方互存' };
    let eventId: string | null = null;
    if (slug) {
      const { rows } = await db.query<{ id: string }>(`SELECT id FROM events WHERE slug = $1`, [slug]);
      eventId = rows[0]?.id ?? null;
    }
    eventId = eventId ?? (await metAt(me, target));
    await db.query(`INSERT INTO card_exchanges (requester_id, target_id, event_id) VALUES ($1, $2, $3)`, [me, target, eventId]);
    return { status: 'pending', message: '已发给对方，对方同意后双方互存' };
  });
}

async function accept(db: { query: ReturnType<typeof getPool>['query'] }, me: string, id: string) {
  const { rows } = await db.query<{ requester_id: string; target_id: string }>(
    `UPDATE card_exchanges SET status = 'accepted', decided_at = now() WHERE id = $1 AND target_id = $2 AND status = 'pending' RETURNING requester_id, target_id`,
    [id, me]
  );
  if (!rows[0]) throw new CrmError('not_found', '这个交换请求已处理过了');
  for (const c of [rows[0].requester_id, rows[0].target_id]) {
    await db.query(
      `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, related_id, rule_version)
       VALUES ($1, 'adjust', $2, $3, '交换名片', $4, 'v1.3.1') ON CONFLICT (event_key) DO NOTHING`,
      [c, CARD_POINTS, `card:${id}:${c}`, id]
    );
  }
  return { status: 'accepted', message: '已互存名片' };
}

export async function respondExchange(me: string, id: string, yes: boolean) {
  return withTransaction(async (db) => {
    if (yes) return accept(db, me, id);
    const { rowCount } = await db.query(`UPDATE card_exchanges SET status = 'declined', decided_at = now() WHERE id = $1 AND target_id = $2 AND status = 'pending'`, [id, me]);
    if (!rowCount) throw new CrmError('not_found', '这个交换请求已处理过了');
    return { status: 'declined', message: '已忽略' };
  });
}

export async function noteExchange(me: string, id: string, note: string) {
  const text = String(note ?? '').trim().slice(0, 60);
  if (text) {
    const { rows: o } = await getPool().query<{ openid: string | null }>(`SELECT wechat_openid AS openid FROM contacts WHERE id = $1`, [me]);
    if ((await msgSecCheck(text, o[0]?.openid ?? null, 1)) === 'risky') throw new CrmError('content_risky', '备注没通过内容安全检查，请换个说法');
  }
  const { rowCount } = await getPool().query(
    `UPDATE card_exchanges SET requester_note = CASE WHEN requester_id = $2 THEN $3 ELSE requester_note END,
                               target_note = CASE WHEN target_id = $2 THEN $3 ELSE target_note END
      WHERE id = $1 AND (requester_id = $2 OR target_id = $2)`,
    [id, me, text || null]
  );
  if (!rowCount) throw new CrmError('not_found', '找不到这张名片');
  return { ok: true };
}

/** 名片夹：按活动分组；可搜姓名、公司、行业；待我同意的请求 */
export async function cardBook(me: string, q?: string | null) {
  const pool = getPool();
  const kw = String(q ?? '').trim().slice(0, 40);
  const { rows } = await pool.query<{
    id: string; other: string; name: string; company: string | null; title: string | null; industry: string | null; token: string | null; avatar_url: string | null;
    note: string | null; event_title: string | null; event_starts: Date | null; decided_at: Date;
  }>(
    `SELECT x.id, o.id AS other, NULLIF(o.name, '微信用户') AS name, m.company, m.title, m.industry, m.token, o.avatar_url,
            CASE WHEN x.requester_id = $1 THEN x.requester_note ELSE x.target_note END AS note,
            e.title AS event_title, e.starts_at AS event_starts, x.decided_at
       FROM card_exchanges x
       JOIN contacts o ON o.id = CASE WHEN x.requester_id = $1 THEN x.target_id ELSE x.requester_id END
       LEFT JOIN member_cards m ON m.contact_id = o.id AND m.hidden_at IS NULL
       LEFT JOIN events e ON e.id = x.event_id
      WHERE x.status = 'accepted' AND (x.requester_id = $1 OR x.target_id = $1)
        AND ($2 = '' OR o.name ILIKE '%' || $2 || '%' OR m.company ILIKE '%' || $2 || '%' OR m.industry ILIKE '%' || $2 || '%' OR m.title ILIKE '%' || $2 || '%')
      ORDER BY e.starts_at DESC NULLS LAST, x.decided_at DESC`,
    [me, kw]
  );
  const groups: { event: string; cards: unknown[] }[] = [];
  for (const r of rows) {
    const label = r.event_title ?? '其他场合';
    let g = groups.find((x) => x.event === label);
    if (!g) groups.push((g = { event: label, cards: [] }));
    // 1.4.1：缴费会员名字旁有金色「会员」标
    const isMember = (await memberStatus(pool, r.other)).isMember;
    g.cards.push({ id: r.id, name: r.name ?? 'SAREC 用户', company: r.company, title: r.title, industry: r.industry, token: r.token, avatarUrl: r.avatar_url, note: r.note, isMember });
  }
  const { rows: inc } = await pool.query<{ id: string; name: string; company: string | null; title: string | null; token: string | null; created_at: Date }>(
    `SELECT x.id, NULLIF(o.name, '微信用户') AS name, m.company, m.title, m.token, x.created_at
       FROM card_exchanges x JOIN contacts o ON o.id = x.requester_id LEFT JOIN member_cards m ON m.contact_id = o.id
      WHERE x.target_id = $1 AND x.status = 'pending' AND m.hidden_at IS NULL ORDER BY x.created_at DESC`,
    [me]
  );
  return { total: rows.length, groups, incoming: inc };
}

/**
 * 1.4.1 找人（东哥已点头）：只搜打开了“让商会里的人能搜到我”的人；按姓名、公司、行业、城市（常住地区 / 名片地址）搜。
 * 搜到的是对方的公开名片（联系方式显示与否由对方自己设）；想联系走“交换名片”。不返回手机、邮箱。
 */
export async function searchPeople(me: string, q: string) {
  const kw = String(q ?? '').trim().slice(0, 40);
  if (kw.length < 1) return { people: [] };
  const pool = getPool();
  const { rows } = await pool.query<{ contact_id: string; name: string | null; company: string | null; title: string | null; industry: string | null; region: string | null; token: string; avatar_url: string | null; exchanged: string | null }>(
    `SELECT m.contact_id, NULLIF(c.name, '微信用户') AS name, m.company, m.title, m.industry, c.region_self AS region, m.token, c.avatar_url,
            (SELECT x.status FROM card_exchanges x WHERE (x.requester_id = $1 AND x.target_id = c.id) OR (x.target_id = $1 AND x.requester_id = c.id) ORDER BY x.created_at DESC LIMIT 1) AS exchanged
       FROM member_cards m JOIN contacts c ON c.id = m.contact_id
      WHERE m.searchable IS TRUE AND m.hidden_at IS NULL AND c.id <> $1 AND c.merged_into IS NULL AND NULLIF(c.name, '微信用户') IS NOT NULL
        AND (c.name ILIKE '%' || $2 || '%' OR m.company ILIKE '%' || $2 || '%' OR m.industry ILIKE '%' || $2 || '%' OR m.title ILIKE '%' || $2 || '%'
             OR c.region_self ILIKE '%' || $2 || '%' OR (m.show_address AND m.address ILIKE '%' || $2 || '%'))
      ORDER BY c.name LIMIT 30`,
    [me, kw]
  );
  const people = [];
  for (const r of rows) {
    people.push({ name: r.name, company: r.company, title: r.title, industry: r.industry, region: r.region, token: r.token, avatarUrl: r.avatar_url, exchanged: r.exchanged, isMember: (await memberStatus(pool, r.contact_id)).isMember });
  }
  return { people };
}
