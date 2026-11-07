/**
 * 1.3 F：渠道码 + 统一的“带来了多少”统计口径（L 功能排行也用这一套）。
 *
 * 口径（沿用 1.2 推荐统计）：带来源的访问 → 报名 → 到场 → 入会 → 有效咨询。
 * 归因：报名记录上的 channel_code 是“最后一次带来这个人的渠道 / 功能”；contacts.first_channel 是首次来源（只写一次），另列一栏。
 * - 访问：track_events.name = 'visit' 且 channel 命中（同一人同一目标一天只记一次，见 growth.track）。
 * - 报名 / 到场：registrations.channel_code 命中（或同行人 source = 'companion'），不含已取消。
 * - 入会：这些报名的人里，报名之后开始会籍的人数。
 * - 有效咨询：inquiries.channel_code 命中，或这些人报名之后提交的咨询（对应的待跟进没有标“暂不跟进”）。
 */
import QRCode from 'qrcode';
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from './events';
import type { Db } from './profile';
import { wxConfigured } from './wechat';

export const CHANNEL_RE = /^c-[a-z0-9]{3,16}$/;
export const CHANNEL_KIND: Record<string, string> = { merchant: '合作商家', org: '合作机构', vp_unit: '副会长单位', partner: '战略伙伴', other: '其他' };

export type Window = { days?: number | null; eventId?: string | null };
export type Funnel = { visits: number; registered: number; arrived: number; joined: number; inquiries: number; firstTouch: number };

/** 某一组渠道值 / 同行人带来的漏斗数字 */
export async function funnel(db: Db, match: { channels?: string[]; companion?: boolean }, w: Window = {}): Promise<Funnel> {
  const chans = (match.channels ?? []).filter(Boolean);
  const days = w.days && w.days > 0 ? Math.floor(w.days) : null;
  const ev = w.eventId ?? null;
  const { rows } = await db.query<Funnel>(
    `WITH regs AS (
       SELECT r.contact_id, r.created_at, r.arrival_status FROM registrations r
        WHERE r.status <> 'cancelled'
          AND (r.channel_code = ANY($1::text[]) OR ($2::boolean AND r.source = 'companion'))
          AND ($3::int IS NULL OR r.created_at > now() - make_interval(days => $3))
          AND ($4::uuid IS NULL OR r.event_id = $4)
     ), people AS (SELECT contact_id, min(created_at) AS first_at FROM regs GROUP BY contact_id)
     SELECT
       (SELECT count(*)::int FROM track_events t
         WHERE t.name = 'visit' AND t.channel = ANY($1::text[])
           AND ($3::int IS NULL OR t.created_at > now() - make_interval(days => $3))
           AND ($4::uuid IS NULL OR t.target = (SELECT slug FROM events WHERE id = $4))) AS visits,
       (SELECT count(DISTINCT contact_id)::int FROM regs) AS registered,
       (SELECT count(DISTINCT contact_id)::int FROM regs WHERE arrival_status = 'checked_in') AS arrived,
       (SELECT count(DISTINCT a.contact_id)::int FROM applications a JOIN people p ON p.contact_id = a.contact_id
         WHERE a.membership_start_date IS NOT NULL AND a.created_at >= p.first_at) AS joined,
       (SELECT count(*)::int FROM inquiries i
         WHERE (i.channel_code = ANY($1::text[]) OR EXISTS (SELECT 1 FROM people p WHERE p.contact_id = i.contact_id AND i.created_at >= p.first_at))
           AND ($3::int IS NULL OR i.created_at > now() - make_interval(days => $3))
           AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.inquiry_id = i.id AND f.status = 'dropped')) AS inquiries,
       (SELECT count(*)::int FROM contacts c WHERE c.first_channel = ANY($1::text[])
           AND ($3::int IS NULL OR c.created_at > now() - make_interval(days => $3))) AS "firstTouch"`,
    [chans, !!match.companion, days, ev]
  );
  return rows[0];
}

export type ChannelRow = { id: number; code: string; name: string; kind: string; note: string | null; active: boolean; created_at: string };

export async function listChannels(w: Window = {}) {
  const pool = getPool();
  const { rows } = await pool.query<ChannelRow>(`SELECT id, code, name, kind, note, active, created_at FROM channels ORDER BY active DESC, created_at DESC`);
  const out = [];
  for (const c of rows) out.push({ ...c, kindLabel: CHANNEL_KIND[c.kind] ?? c.kind, stats: await funnel(pool, { channels: [c.code] }, w) });
  return out;
}

function newCode(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 8);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `c-${(base || 'ch') + rnd}`.slice(0, 18);
}

export async function createChannel(actor: string, b: { name?: unknown; kind?: unknown; note?: unknown }) {
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 60) : '';
  if (!name) throw new CrmError('bad_request', '请填写渠道名称，例如“XX 地产”');
  const kind = typeof b.kind === 'string' && CHANNEL_KIND[b.kind] ? b.kind : 'merchant';
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 200) || null : null;
  return withTransaction(async (db) => {
    for (let i = 0; i < 5; i++) {
      const code = newCode(name);
      const { rows } = await db.query<ChannelRow>(
        `INSERT INTO channels (code, name, kind, note, created_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING RETURNING *`,
        [code, name, kind, note, actor]
      );
      if (rows[0]) return rows[0];
    }
    throw new CrmError('conflict', '生成渠道码失败，请再点一次');
  });
}

export async function updateChannel(id: number, b: { active?: unknown; name?: unknown; note?: unknown }) {
  await getPool().query(
    `UPDATE channels SET active = COALESCE($2, active), name = COALESCE(NULLIF($3, ''), name), note = COALESCE($4, note) WHERE id = $1`,
    [id, typeof b.active === 'boolean' ? b.active : null, typeof b.name === 'string' ? b.name.trim().slice(0, 60) : null, typeof b.note === 'string' ? b.note.slice(0, 200) : null]
  );
  return { ok: true };
}

/** 渠道小程序码：带 ?channel=c-xxxx；有活动时进活动页，没有进首页。“|”不能放进 scene，统一用带路径的码 */
export async function channelCodePng(code: string, slug: string | null): Promise<Buffer> {
  if (!CHANNEL_RE.test(code)) throw new CrmError('bad_request', '渠道码不对');
  const path = slug ? `pages/event/event?slug=${encodeURIComponent(slug)}&channel=${code}` : `pages/home/home?channel=${code}`;
  if (!wxConfigured()) return QRCode.toBuffer(`SAREC-TEST:${path}`, { margin: 1, width: 900 });
  const { miniProgramPathCode } = await import('./wechat');
  return miniProgramPathCode(path, `channel ${code}`);
}
