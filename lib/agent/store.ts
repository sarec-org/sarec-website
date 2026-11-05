/**
 * AI 助手 —— 数据库读写（对话、消息、每日用量、答案缓存、常见问题、近期活动、访客身份）。
 */
import { getPool } from '@/lib/db/client';
import { listEvents } from '@/lib/crm/flow';
import { memberStatus } from '@/lib/crm/membership';
import type { LeadInfo } from './intent';
import type { UpcomingEvent } from './knowledge';
import { LIMITS } from './config';
import { laDay } from './text';

export type Audience = 'visitor' | 'logged_in' | 'registered' | 'member';

export type Conversation = {
  id: string;
  visitor_id: string;
  contact_id: string | null;
  lang: 'zh' | 'en';
  audience: Audience;
  turns: number;
  summary: string | null;
  summarized_until: string;
  is_lead: boolean;
  lead_info: LeadInfo & { _pending?: string | null };
  followup_id: string | null;
  lead_at: Date | null;
  page: string | null;
  page_slug: string | null;
  page_title: string | null;
};

export type StoredMessage = { id: string; role: 'user' | 'assistant' | 'event'; content: string; tier: number | null; created_at: Date };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getConversation(id: string, visitorId: string): Promise<Conversation | null> {
  if (!UUID.test(id)) return null;
  const { rows } = await getPool().query<Conversation>(
    `SELECT id, visitor_id, contact_id, lang, audience, turns, summary, summarized_until::text, is_lead, lead_info, followup_id, lead_at, page, page_slug, page_title
       FROM agent_conversations WHERE id = $1 AND visitor_id = $2`,
    [id, visitorId]
  );
  return rows[0] ?? null;
}

export async function createConversation(c: {
  visitorId: string;
  contactId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  page: { page?: string; slug?: string; title?: string } | null;
  lang: 'zh' | 'en';
  audience: Audience;
}): Promise<Conversation> {
  const { rows } = await getPool().query<Conversation>(
    `INSERT INTO agent_conversations (visitor_id, contact_id, ip_hash, user_agent, page, page_slug, page_title, lang, audience)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, visitor_id, contact_id, lang, audience, turns, summary, summarized_until::text, is_lead, lead_info, followup_id, lead_at, page, page_slug, page_title`,
    [
      c.visitorId,
      c.contactId,
      c.ipHash,
      c.userAgent?.slice(0, 300) ?? null,
      c.page?.page?.slice(0, 20) ?? null,
      c.page?.slug?.slice(0, 200) ?? null,
      c.page?.title?.slice(0, 200) ?? null,
      c.lang,
      c.audience
    ]
  );
  return rows[0];
}

export async function updateConversation(
  id: string,
  p: { contactId?: string | null; audience?: Audience; lang?: 'zh' | 'en'; turnsDelta?: number; isLead?: boolean; leadInfo?: unknown; costDelta?: number; summary?: string; summarizedUntil?: string }
): Promise<void> {
  await getPool().query(
    `UPDATE agent_conversations SET
        contact_id = COALESCE($2, contact_id),
        audience = COALESCE($3, audience),
        lang = COALESCE($4, lang),
        turns = turns + $5,
        is_lead = is_lead OR $6,
        lead_info = COALESCE($7::jsonb, lead_info),
        cost_micros = cost_micros + $8,
        summary = COALESCE($9, summary),
        summarized_until = COALESCE($10::bigint, summarized_until),
        last_message_at = now()
      WHERE id = $1`,
    [
      id,
      p.contactId ?? null,
      p.audience ?? null,
      p.lang ?? null,
      p.turnsDelta ?? 0,
      p.isLead ?? false,
      p.leadInfo === undefined ? null : JSON.stringify(p.leadInfo),
      p.costDelta ?? 0,
      p.summary ?? null,
      p.summarizedUntil ?? null
    ]
  );
}

export async function messagesAfter(conversationId: string, afterId: string): Promise<StoredMessage[]> {
  const { rows } = await getPool().query<StoredMessage>(
    `SELECT id::text, role, content, tier, created_at FROM agent_messages
      WHERE conversation_id = $1 AND id > $2::bigint AND role IN ('user','assistant') ORDER BY id`,
    [conversationId, afterId]
  );
  return rows;
}

export type MessageRow = {
  conversationId: string;
  role: 'user' | 'assistant' | 'event';
  content: string;
  tier?: 0 | 1 | 2 | null;
  route?: string | null;
  model?: string | null;
  usage?: { input: number; output: number; cacheRead: number; cacheWrite: number } | null;
  costMicros?: number;
  cached?: boolean;
  faqId?: number | null;
  intent?: string | null;
  action?: unknown;
  flags?: string[];
};

export async function addMessage(m: MessageRow): Promise<string> {
  const u = m.usage ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO agent_messages (conversation_id, role, content, tier, route, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
                                 cost_micros, cached, faq_id, intent, action, flags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id::text`,
    [
      m.conversationId,
      m.role,
      m.content.slice(0, 8000),
      m.tier ?? null,
      m.route ?? null,
      m.model ?? null,
      u.input,
      u.output,
      u.cacheRead,
      u.cacheWrite,
      m.costMicros ?? 0,
      m.cached ?? false,
      m.faqId ?? null,
      m.intent ?? null,
      m.action === undefined || m.action === null ? null : JSON.stringify(m.action),
      m.flags ?? []
    ]
  );
  return rows[0].id;
}

export type DailyDelta = Partial<{
  calls: number;
  tier0: number;
  tier1: number;
  tier2: number;
  cache_hits: number;
  model_calls: number;
  blocked: number;
  slowed: number;
  limited: number;
  leads: number;
  input_tokens: number;
  output_tokens: number;
  cost_micros: number;
}>;

const DAILY_COLS = ['calls', 'tier0', 'tier1', 'tier2', 'cache_hits', 'model_calls', 'blocked', 'slowed', 'limited', 'leads', 'input_tokens', 'output_tokens', 'cost_micros'] as const;

export async function bumpDaily(d: DailyDelta, now = new Date()): Promise<void> {
  const vals = DAILY_COLS.map((c) => Math.round(d[c] ?? 0));
  if (vals.every((v) => v === 0)) return;
  const cols = DAILY_COLS.join(', ');
  const ph = DAILY_COLS.map((_, i) => `$${i + 2}`).join(', ');
  const set = DAILY_COLS.map((c) => `${c} = agent_daily.${c} + EXCLUDED.${c}`).join(', ');
  await getPool()
    .query(`INSERT INTO agent_daily (day, ${cols}) VALUES ($1::date, ${ph}) ON CONFLICT (day) DO UPDATE SET ${set}`, [laDay(now), ...vals])
    .catch((e) => console.error('[agent] daily', e instanceof Error ? e.message : 'error'));
}

// ── 24 小时答案缓存 ───────────────────────────────────────────────────

export async function cacheGet(key: string): Promise<{ reply: string; tier: number; model: string | null } | null> {
  const { rows } = await getPool().query<{ reply: string; tier: number; model: string | null }>(
    `UPDATE agent_answer_cache SET hits = hits + 1 WHERE key = $1 AND expires_at > now() RETURNING reply, tier, model`,
    [key]
  );
  return rows[0] ?? null;
}

export async function cacheSet(key: string, lang: string, question: string, reply: string, tier: number, model: string | null): Promise<void> {
  await getPool()
    .query(
      `INSERT INTO agent_answer_cache (key, lang, question, reply, tier, model, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() + make_interval(hours => $7))
       ON CONFLICT (key) DO UPDATE SET reply = EXCLUDED.reply, tier = EXCLUDED.tier, model = EXCLUDED.model, hits = 0,
         created_at = now(), expires_at = EXCLUDED.expires_at`,
      [key, lang, question.slice(0, 500), reply, tier, model, LIMITS.cacheHours]
    )
    .catch(() => undefined);
}

// ── 常见问题库 ────────────────────────────────────────────────────────

export type FaqRow = { id: number; intent: string; title: string; keywords: string[]; answer_zh: string; answer_en: string | null; priority: number; is_active: boolean; hits: number };

let faqCache: { at: number; rows: FaqRow[] } | null = null;

export async function activeFaqs(): Promise<FaqRow[]> {
  if (faqCache && Date.now() - faqCache.at < 60_000) return faqCache.rows;
  const { rows } = await getPool().query<FaqRow>(
    `SELECT id, intent, title, keywords, answer_zh, answer_en, priority, is_active, hits FROM agent_faq WHERE is_active ORDER BY priority DESC, id`
  );
  faqCache = { at: Date.now(), rows };
  return rows;
}
export function clearFaqCache() {
  faqCache = null;
}

export async function faqHit(id: number): Promise<void> {
  await getPool().query(`UPDATE agent_faq SET hits = hits + 1 WHERE id = $1`, [id]).catch(() => undefined);
}

// ── 近期活动（数据库，2 分钟缓存）────────────────────────────────────────

let evCache: { at: number; rows: UpcomingEvent[] } | null = null;

export async function upcomingEvents(): Promise<UpcomingEvent[]> {
  if (evCache && Date.now() - evCache.at < 120_000) return evCache.rows;
  try {
    const list = await listEvents(false);
    const now = Date.now();
    const rows: UpcomingEvent[] = list
      .filter((e) => e.status !== 'cancelled' && new Date((e.endsAt ?? e.startsAt) as unknown as string).getTime() > now - 3600_000)
      .slice(0, 6)
      .map((e) => ({
        slug: e.slug,
        title: e.title,
        summary: e.summary,
        startsAt: new Date(e.startsAt as unknown as string).toISOString(),
        timezone: e.timezone,
        locationName: e.locationName,
        address: e.address,
        registrationOpen: !!e.registrationOpen && e.status === 'scheduled',
        status: String(e.status)
      }));
    evCache = { at: Date.now(), rows };
    return rows;
  } catch (e) {
    console.error('[agent] events', e instanceof Error ? e.message : 'error');
    return evCache?.rows ?? [];
  }
}

// ── 访客身份 ─────────────────────────────────────────────────────────

export async function audienceFor(contactId: string | null): Promise<{ audience: Audience; name: string | null }> {
  if (!contactId) return { audience: 'visitor', name: null };
  const pool = getPool();
  try {
    const m = await memberStatus(pool, contactId);
    const name = m.name && m.name !== '微信用户' ? m.name : null;
    if (m.isMember) return { audience: 'member', name };
    const { rows } = await pool.query(`SELECT 1 FROM registrations WHERE contact_id = $1 AND status <> 'cancelled' LIMIT 1`, [contactId]);
    return { audience: rows[0] ? 'registered' : 'logged_in', name };
  } catch {
    return { audience: 'logged_in', name: null };
  }
}

export async function markRegistered(conversationId: string, slug: string): Promise<void> {
  await getPool().query(
    `UPDATE agent_conversations SET registered_slugs = array_append(registered_slugs, $2), last_message_at = now()
      WHERE id = $1 AND NOT ($2 = ANY(registered_slugs))`,
    [conversationId, slug.slice(0, 200)]
  );
}

export async function markLead(conversationId: string, followupId: string, inquiryId: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    `UPDATE agent_conversations SET followup_id = $2, inquiry_id = $3, lead_at = COALESCE(lead_at, now()), is_lead = true
      WHERE id = $1 AND lead_at IS NULL`,
    [conversationId, followupId, inquiryId]
  );
  return (rowCount ?? 0) > 0;
}
