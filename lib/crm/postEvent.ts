/**
 * 1.3 J：活动后自动运营流程（每天的定时任务跑；每场活动只跑一次，工作人员只在最后审核）。
 *
 *  签到和照片汇总 → 照片去重、分组、精选建议 → 回顾文章初稿、分享文案、服务号推文初稿、感谢
 *  → 助理在后台一次审核 → 发布（网站回顾 + 小程序相册；服务号推文复制粘贴）
 *  → 汇总活动中留下的需求、生成跟进任务和联系草稿 → 给到场的人推荐下一场合适的活动。
 *
 * 分工：固定规则负责上传、去重、计数、通知、状态更新；AI 只写初稿（回顾、分享、推文），必须人工审核才发布。
 * AI 调用规则（1.3 第 3 节）：有明确用途；每场一次、单次输出上限 1200 token；记 ai_task_log；计入月预算（agent_daily）；
 * 预算到“限制 / 停止”档或没配 key 时改用模板，不空转、不重试。
 */
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import { publishAlbum } from './photos';
import { scanFollowups } from './followups';

const MAX_PHOTOS = 400;
const AI_MAX_TOKENS = 1200;

type Stats = { registered: number; arrived: number; companions: number; newPeople: number; staffPhotos: number; guestPhotos: number; referrers: { name: string; brought: number }[] };

function hamming(a: string, b: string): number {
  // 逐个十六进制位数 1 的个数（不用 BigInt 字面量，兼容当前编译目标）
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let v = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (v) { n += v & 1; v >>= 1; }
  }
  return n;
}

async function dHashFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const px = await sharp(Buffer.from(await res.arrayBuffer()), { failOn: 'none' }).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
    let bits = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? '1' : '0';
    return BigInt('0b' + bits).toString(16).padStart(16, '0');
  } catch {
    return null;
  }
}

/** 照片分组：相似（dHash 汉明距离 ≤ 6）的归一组，每组挑一张精选（工作人员照片优先、尺寸大的优先） */
async function groupPhotos(eventId: string) {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; thumb_url: string; phash: string | null; by_customer: boolean; width: number | null }>(
    `SELECT id, thumb_url, phash, uploader_contact_id IS NOT NULL AS by_customer, width FROM event_photos
      WHERE event_id = $1 AND variant_of IS NULL AND NOT is_hidden AND (uploader_contact_id IS NULL OR visibility = 'album')
      ORDER BY created_at LIMIT $2`,
    [eventId, MAX_PHOTOS]
  );
  for (const r of rows) {
    if (!r.phash && r.thumb_url) {
      r.phash = await dHashFromUrl(r.thumb_url);
      if (r.phash) await pool.query(`UPDATE event_photos SET phash = $2 WHERE id = $1`, [r.id, r.phash]);
    }
  }
  const groups: { pick: string; members: string[] }[] = [];
  const used = new Set<string>();
  const sorted = [...rows].sort((a, b) => Number(a.by_customer) - Number(b.by_customer) || (b.width ?? 0) - (a.width ?? 0));
  for (const r of sorted) {
    if (used.has(r.id)) continue;
    const members = [r.id];
    used.add(r.id);
    if (r.phash) for (const o of sorted) if (!used.has(o.id) && o.phash && hamming(r.phash, o.phash) <= 6) { members.push(o.id); used.add(o.id); }
    groups.push({ pick: r.id, members });
  }
  return { groups, picks: groups.slice(0, 12).map((g) => g.pick) };
}

async function stats(eventId: string): Promise<Stats> {
  const pool = getPool();
  const { rows } = await pool.query<Omit<Stats, 'referrers'>>(
    `SELECT
       count(*) FILTER (WHERE r.status <> 'cancelled')::int AS registered,
       count(*) FILTER (WHERE r.arrival_status = 'checked_in')::int AS arrived,
       count(*) FILTER (WHERE r.source = 'companion' AND r.status <> 'cancelled')::int AS companions,
       count(*) FILTER (WHERE r.status <> 'cancelled' AND NOT EXISTS (
         SELECT 1 FROM registrations o JOIN events oe ON oe.id = o.event_id WHERE o.contact_id = r.contact_id AND o.event_id <> r.event_id AND oe.starts_at < (SELECT starts_at FROM events WHERE id = $1)))::int AS "newPeople",
       (SELECT count(*)::int FROM event_photos p WHERE p.event_id = $1 AND p.uploader_contact_id IS NULL AND NOT p.is_hidden) AS "staffPhotos",
       (SELECT count(*)::int FROM event_photos p WHERE p.event_id = $1 AND p.uploader_contact_id IS NOT NULL AND p.variant_of IS NULL AND NOT p.is_hidden) AS "guestPhotos"
     FROM registrations r WHERE r.event_id = $1`,
    [eventId]
  );
  const { rows: refs } = await pool.query<{ name: string; brought: number }>(
    `SELECT c.name, count(*)::int AS brought FROM registrations r JOIN contacts c ON c.id = r.ref_contact_id
      WHERE r.event_id = $1 AND r.status <> 'cancelled' AND r.ref_contact_id IS NOT NULL GROUP BY c.name ORDER BY brought DESC LIMIT 10`,
    [eventId]
  );
  return { ...rows[0], referrers: refs };
}

function templateDrafts(ev: { title: string; summary: string | null }, s: Stats) {
  const recap = `${ev.title}已圆满结束。本场共 ${s.registered} 人报名，${s.arrived} 人到场${s.companions ? `，其中 ${s.companions} 位是会员带来的朋友` : ''}。${ev.summary ? `\n\n活动内容：${ev.summary}` : ''}\n\n感谢每一位到场的朋友。现场照片已整理进活动相册，欢迎查看、转发。下一场活动开放报名后会第一时间通知大家。`;
  const share = `「${ev.title}」现场照片出来了，${s.arrived} 位朋友到场交流。照片在商会小程序“活动相册”里，下一场一起来？`;
  const oa = `【活动回顾】${ev.title}\n\n${recap}\n\n—— 中美房地产商会 SAREC`;
  const thanks = s.referrers.length
    ? s.referrers.map((r) => `${r.name}您好，感谢您邀请 ${r.brought} 位朋友参加「${ev.title}」，有您的推荐，交流更热闹了。下一场见！`).join('\n')
    : '';
  return { recap, share, oa, thanks };
}

/** AI 写初稿：一场活动一次调用；没 key / 预算不够 → 返回 null，用模板 */
async function aiDrafts(ev: { id: string; title: string; summary: string | null }, s: Stats) {
  const { providerAvailable, callModel } = await import('@/lib/agent/providers');
  const { budgetState } = await import('@/lib/agent/budget');
  const { bumpDaily } = await import('@/lib/agent/store');
  const { isMockMode } = await import('@/lib/agent/config');
  if (!providerAvailable(1) || isMockMode()) return null;
  const b = await budgetState();
  if (b.level === 'restrict' || b.level === 'stop') return null;
  const system =
    '你是中美房地产商会（SAREC）的运营编辑。根据给定的活动信息写三段中文初稿，供工作人员审核后发布。要求：事实只用给定信息，不编造嘉宾、观点、数字；不写任何投资回报、收益、价格、奖励承诺；不写“转发有奖”之类诱导分享的话；语气专业、温和、简洁。按格式输出：\n【回顾】300 字以内的活动回顾文章\n【分享】60 字以内的群聊分享文案\n【推文】服务号推文正文，400 字以内';
  const user = `活动名称：${ev.title}\n活动简介：${ev.summary ?? '（无）'}\n报名 ${s.registered} 人，到场 ${s.arrived} 人，会员带来的朋友 ${s.companions} 人，第一次来的 ${s.newPeople} 人；现场照片 ${s.staffPhotos + s.guestPhotos} 张。`;
  const r = await callModel({ tier: 1, system, history: [], user, maxTokens: AI_MAX_TOKENS, json: false });
  await getPool().query(
    `INSERT INTO ai_task_log (task, ref, model, ok, input_tokens, output_tokens, cost_micros, error) VALUES ('post_event_drafts', $1, $2, $3, $4, $5, $6, $7)`,
    [ev.id, r.model, r.ok, r.usage.input, r.usage.output, r.costMicros, r.ok ? null : (r.error ?? 'error').slice(0, 200)]
  );
  await bumpDaily({ model_calls: 1, cost_micros: r.costMicros, input_tokens: r.usage.input, output_tokens: r.usage.output });
  if (!r.ok) return null;
  const part = (k: string) => (r.text.split(`【${k}】`)[1] ?? '').split(/【(回顾|分享|推文)】/)[0].trim();
  const recap = part('回顾');
  if (!recap) return null;
  return { recap, share: part('分享'), oa: part('推文'), model: r.model };
}

async function nextRecommendations(eventId: string) {
  const { rows } = await getPool().query<{ slug: string; title: string; n: number }>(
    `WITH me AS (SELECT topic_tags, starts_at FROM events WHERE id = $1),
          nxt AS (SELECT e.id, e.slug, e.title, e.topic_tags, e.starts_at FROM events e, me
                   WHERE e.is_listed AND e.event_status = 'scheduled' AND e.registration_open AND e.starts_at > now()
                   ORDER BY (CASE WHEN e.topic_tags && me.topic_tags THEN 0 ELSE 1 END), e.starts_at LIMIT 1)
     SELECT nxt.slug, nxt.title,
            (SELECT count(*)::int FROM registrations r WHERE r.event_id = $1 AND r.arrival_status = 'checked_in'
               AND NOT EXISTS (SELECT 1 FROM registrations x WHERE x.event_id = nxt.id AND x.contact_id = r.contact_id AND x.status <> 'cancelled')) AS n
       FROM nxt`,
    [eventId]
  );
  return rows[0] ?? null;
}

async function needsSummary(eventId: string) {
  const { rows } = await getPool().query<{ name: string | null; need: string | null; status: string }>(
    `SELECT name, need, status FROM followups WHERE event_id = $1 ORDER BY created_at LIMIT 50`,
    [eventId]
  );
  return { count: rows.length, items: rows.map((r) => ({ name: r.name, need: (r.need ?? '').slice(0, 120), status: r.status })) };
}

export async function buildRecap(eventId: string, opts: { force?: boolean } = {}) {
  const pool = getPool();
  const { rows: evr } = await pool.query<{ id: string; title: string; summary: string | null }>(`SELECT id, title, summary FROM events WHERE id = $1`, [eventId]);
  const ev = evr[0];
  if (!ev) throw new CrmError('not_found', '找不到这场活动');
  const { rows: ex } = await pool.query(`SELECT status FROM event_recaps WHERE event_id = $1`, [eventId]);
  if (ex[0] && !opts.force) return { skipped: 'exists' };
  if (ex[0]?.status === 'published') return { skipped: 'published' };
  const s = await stats(eventId);
  const g = await groupPhotos(eventId);
  // 需求 → 跟进任务（活动后希望了解）：复用每日扫描，幂等
  await scanFollowups().catch(() => undefined);
  const needs = await needsSummary(eventId);
  const t = templateDrafts(ev, s);
  const ai = await aiDrafts(ev, s).catch(() => null);
  const next = await nextRecommendations(eventId);
  await pool.query(
    `INSERT INTO event_recaps (event_id, status, stats, photo_groups, picks, recap_draft, share_draft, oa_draft, thanks_draft, needs, next_recs, drafted_by, drafted_at)
     VALUES ($1, 'drafted', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     ON CONFLICT (event_id) DO UPDATE SET stats = EXCLUDED.stats, photo_groups = EXCLUDED.photo_groups, picks = EXCLUDED.picks,
       recap_draft = EXCLUDED.recap_draft, share_draft = EXCLUDED.share_draft, oa_draft = EXCLUDED.oa_draft, thanks_draft = EXCLUDED.thanks_draft,
       needs = EXCLUDED.needs, next_recs = EXCLUDED.next_recs, drafted_by = EXCLUDED.drafted_by, drafted_at = now()
       WHERE event_recaps.status <> 'published'`,
    [eventId, JSON.stringify(s), JSON.stringify(g.groups), g.picks, ai?.recap ?? t.recap, ai?.share || t.share, ai?.oa || t.oa, t.thanks || null, JSON.stringify(needs), next ? JSON.stringify(next) : null, ai ? `ai:${ai.model}` : 'template']
  );
  return { drafted: true, by: ai ? 'ai' : 'template', photos: g.picks.length };
}

/** 定时任务：结束 2 小时到 3 天内、还没生成回顾的活动，每次最多处理 2 场 */
export async function runPostEvent(): Promise<{ processed: string[] }> {
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT e.id FROM events e
      WHERE e.event_status <> 'cancelled' AND coalesce(e.ends_at, e.starts_at + interval '3 hours') < now() - interval '2 hours'
        AND coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '3 days'
        AND NOT EXISTS (SELECT 1 FROM event_recaps r WHERE r.event_id = e.id)
      ORDER BY e.starts_at LIMIT 2`
  );
  const processed: string[] = [];
  for (const r of rows) {
    await buildRecap(r.id);
    processed.push(r.id);
  }
  return { processed };
}

export async function getRecap(eventId: string) {
  const pool = getPool();
  const { rows } = await pool.query(`SELECT r.*, e.title, e.slug, e.album_published_at, e.recap AS published_recap FROM event_recaps r JOIN events e ON e.id = r.event_id WHERE r.event_id = $1`, [eventId]);
  if (!rows[0]) return null;
  const { rows: ph } = await pool.query(`SELECT id, thumb_url, url, uploader_contact_id IS NOT NULL AS by_customer FROM event_photos WHERE id = ANY($1::uuid[])`, [rows[0].picks ?? []]);
  return { ...rows[0], pickPhotos: ph };
}

export async function listRecaps() {
  const { rows } = await getPool().query(
    `SELECT r.event_id, r.status, r.drafted_by, r.drafted_at, r.published_at, r.stats, e.title, e.starts_at FROM event_recaps r JOIN events e ON e.id = r.event_id ORDER BY e.starts_at DESC LIMIT 50`
  );
  return rows;
}

/** 助理一次审核：改好的回顾 / 分享 / 推文 + 精选照片 → 发布网站回顾和小程序相册（并通知到场的人）；推文页面上一键复制 */
export async function publishRecap(actor: string, eventId: string, b: { recap?: unknown; share?: unknown; oa?: unknown; thanks?: unknown; picks?: unknown }) {
  const recap = typeof b.recap === 'string' ? b.recap.trim().slice(0, 4000) : '';
  if (!recap) throw new CrmError('bad_request', '回顾文章不能为空');
  const pool = getPool();
  const picks = Array.isArray(b.picks) ? b.picks.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/.test(x)) : null;
  await pool.query(
    `UPDATE event_recaps SET recap_draft = $2, share_draft = COALESCE($3, share_draft), oa_draft = COALESCE($4, oa_draft), thanks_draft = COALESCE($5, thanks_draft),
            picks = COALESCE($6::uuid[], picks), status = 'published', approved_by = $7, published_at = now() WHERE event_id = $1`,
    [eventId, recap, typeof b.share === 'string' ? b.share : null, typeof b.oa === 'string' ? b.oa : null, typeof b.thanks === 'string' ? b.thanks : null, picks, actor]
  );
  // 精选照片排在相册最前面
  if (picks?.length) await pool.query(`UPDATE event_photos SET sort_order = array_position($2::uuid[], id) - 1000 WHERE event_id = $1 AND id = ANY($2::uuid[])`, [eventId, picks]);
  const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM event_photos WHERE event_id = $1 AND NOT is_hidden AND variant_of IS NULL AND visibility = 'album' AND review_status = 'ok'`, [eventId]);
  let notices = null;
  if (rows[0].n) notices = await publishAlbum(eventId, recap.slice(0, 600));
  else await pool.query(`UPDATE events SET recap = $2, updated_at = now() WHERE id = $1`, [eventId, recap.slice(0, 600)]);
  return { published: true, notices };
}

/** 后台每天看四个结果（昨天，洛杉矶时间） */
export async function dailyResults() {
  const { rows } = await getPool().query<{ visits: number; newArrived: number; joined: number; inquiries: number }>(
    `WITH d AS (SELECT (date_trunc('day', now() AT TIME ZONE 'America/Los_Angeles') - interval '1 day') AT TIME ZONE 'America/Los_Angeles' AS s,
                       date_trunc('day', now() AT TIME ZONE 'America/Los_Angeles') AT TIME ZONE 'America/Los_Angeles' AS e)
     SELECT
       (SELECT count(*)::int FROM track_events, d WHERE name = 'visit' AND created_at >= d.s AND created_at < d.e) AS visits,
       (SELECT count(DISTINCT r.contact_id)::int FROM registrations r, d WHERE r.arrival_status = 'checked_in' AND r.checked_in_at >= d.s AND r.checked_in_at < d.e
          AND NOT EXISTS (SELECT 1 FROM registrations o WHERE o.contact_id = r.contact_id AND o.created_at < r.created_at AND o.status <> 'cancelled')) AS "newArrived",
       (SELECT count(*)::int FROM applications a, d WHERE a.membership_start_date IS NOT NULL AND a.updated_at >= d.s AND a.updated_at < d.e AND a.payment_status IN ('paid', 'partially_paid')) AS joined,
       (SELECT count(*)::int FROM inquiries i, d WHERE i.created_at >= d.s AND i.created_at < d.e
          AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.inquiry_id = i.id AND f.status = 'dropped')) AS inquiries`
  );
  return rows[0];
}
