/**
 * AI 海报主流程（东哥 11/10）：后台活动页「生成海报」
 *   选活动类型 + 风格（+ 可选画面主题）→ 一次出 4 张候选主视觉 → 东哥点选一张（不满意“再来一批”）
 *   → 文案（片名 + 宣传语，可让文字模型给 5 组备选）→ 叠字出竖版 / 方版 / 公众号头图。
 * 每场默认最多 12 张主视觉（crm_settings.poster_image_cap，单场可在 event_posters.image_cap 调），每次调用记 poster_gens（指令、服务商、花费）。
 * 生成的图存自己的 Blob（正式站 prod/、预览 test/）。AI 海报只在网站后台生成和下载，不进小程序。
 */
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import QRCode from 'qrcode';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { getSetting, setSetting } from '@/lib/crm/orders';
import { BLOB_PREFIX, blobConfigured } from '@/lib/crm/photos';
import { checkinLine } from '@/lib/crm/checkinTime';
import { fullDate } from '@/lib/crm/home131';
import { tzLabel } from '@/lib/crm/regions';
import { eventRegisterCode, wxConfigured } from '@/lib/crm/wechat';
import type { Staff } from '@/lib/crm/auth';
import { imageProvider, normalize, providerChoices, redactSecrets, SWITCHABLE } from './providers';
import { suggestCopy } from './copy';
import { composePoster, type PosterSize } from './compose';
import { EVENT_TYPES, STYLES, buildPrompt, styleOf, typeOf } from './styles';

export const DEFAULT_CAP = 12;
export const BATCH = 4;
const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');

type EvRow = { id: string; slug: string; title: string; summary: string | null; starts_at: Date; checkin_starts_at: Date | null; timezone: string; location_name: string | null; address: string | null };
export type PosterRow = { event_id: string; gen_id: string | null; style: string | null; film_title: string | null; tagline: string | null; host: string | null; speaker: string | null; co_host: string | null; speaker_photo_url: string | null; image_cap: number | null };
export type GenRow = { id: string; batch_id: string; kind: string; event_type: string | null; style: string | null; provider: string; model: string | null; prompt: string; image_url: string | null; cost_usd: string; status: string; error: string | null; created_at: Date };

async function eventOf(id: string): Promise<EvRow> {
  const { rows } = await getPool().query<EvRow>(
    `SELECT id, slug, title, summary, starts_at, checkin_starts_at, timezone, location_name, address FROM events WHERE id = $1`,
    [id]
  );
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  return rows[0];
}

/** 后台选的画图服务（空 = 按环境变量） */
export async function chosenProvider(): Promise<string | null> {
  const v = await getSetting<string | null>(getPool(), 'poster_image_provider', null);
  return typeof v === 'string' && v ? v : null;
}
export async function setChosenProvider(s: Staff, value: unknown) {
  if (!(typeof value === 'string' && (SWITCHABLE as readonly string[]).includes(value))) throw new CrmError('bad_request', '请选择画图服务');
  await setSetting(getPool(), 'poster_image_provider', value, s.contactId);
}

export async function defaultCap(): Promise<number> {
  const v = Number(await getSetting(getPool(), 'poster_image_cap', DEFAULT_CAP));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : DEFAULT_CAP;
}

export async function posterState(eventId: string) {
  const db = getPool();
  const ev = await eventOf(eventId);
  const [{ rows: p }, { rows: gens }, cap0] = await Promise.all([
    db.query<PosterRow>(`SELECT * FROM event_posters WHERE event_id = $1`, [eventId]),
    db.query<GenRow>(`SELECT id, batch_id, kind, event_type, style, provider, model, prompt, image_url, cost_usd, status, error, created_at FROM poster_gens WHERE event_id = $1 ORDER BY created_at DESC`, [eventId]),
    defaultCap()
  ]);
  const poster = p[0] ?? null;
  const cap = poster?.image_cap ?? cap0;
  const images = gens.filter((g) => g.status === 'ok' && g.image_url);
  const choice = await chosenProvider();
  const { p: prov, note } = imageProvider(choice);
  return {
    event: { id: ev.id, title: ev.title, slug: ev.slug },
    poster,
    gens: gens.map((g) => ({ ...g, cost_usd: Number(g.cost_usd) })),
    used: images.length,
    cap,
    defaultCap: cap0,
    spentUsd: Math.round(gens.reduce((s, g) => s + Number(g.cost_usd), 0) * 10000) / 10000,
    provider: { key: prov.key, label: prov.label, model: prov.model, costPerImage: prov.costPerImage, note, chosen: choice },
    providers: providerChoices(),
    types: EVENT_TYPES.map(({ key, label }) => ({ key, label })),
    styles: STYLES.map(({ key, group, label }) => ({ key, group, label }))
  };
}

/** 一批 4 张（剩余额度不足 4 张时出剩下的）。失败的也记一行（不占额度、不计费） */
export async function generateBatch(s: Staff, eventId: string, input: { type?: string; style?: string; subject?: string }) {
  const db = getPool();
  await eventOf(eventId);
  const type = typeOf(input.type).key;
  const style = styleOf(input.style).key;
  const st = await posterState(eventId);
  const left = st.cap - st.used;
  if (left <= 0) throw new CrmError('conflict', `这场活动已经生成了 ${st.used} 张主视觉，到上限了（${st.cap} 张）。可以在下面调高本场上限。`);
  const n = Math.min(BATCH, left);
  const { p } = imageProvider(await chosenProvider());
  const prompt = buildPrompt({ type, style, subject: input.subject });
  const batch = randomUUID();
  const seeds = Array.from({ length: n }, () => Math.floor(Math.random() * 2_000_000_000));
  const one = async (seed: number) => {
    const id = randomUUID();
    try {
      const t0 = Date.now();
      const img = await p.generate(prompt, seed);
      console.log(`[ai-poster] ${p.key} generate ${Date.now() - t0}ms`);
      const jpg = await normalize(img);
      console.log(`[ai-poster] normalize ${Date.now() - t0}ms`);
      let url: string;
      // 存图限时 45 秒：存储偶尔卡住时不要把整个请求拖到 300 秒超时
      if (blobConfigured()) url = (await put(`${BLOB_PREFIX}/ai-poster/${eventId}/${id}.jpg`, jpg, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false, abortSignal: AbortSignal.timeout(45_000) })).url;
      else if (p.key === 'placeholder') url = `data:image/jpeg;base64,${jpg.toString('base64')}`; // 本地没配存储时只用于测试
      else throw new CrmError('storage_unconfigured', '图片存储还没有配置');
      console.log(`[ai-poster] ${id.slice(0, 6)} stored ${Date.now() - t0}ms`);
      await db.query(
        `INSERT INTO poster_gens (id, event_id, batch_id, kind, event_type, style, provider, model, prompt, image_url, result, cost_usd, status, created_by)
         VALUES ($1, $2, $3, 'image', $4, $5, $6, $7, $8, $9, $10, $11, 'ok', $12)`,
        [id, eventId, batch, type, style, p.key, p.model, prompt, url, JSON.stringify({ seed }), p.costPerImage, s.contactId]
      );
      console.log(`[ai-poster] ${id.slice(0, 6)} saved ${Date.now() - t0}ms`);
    } catch (e) {
      const msg = redactSecrets(e instanceof Error ? e.message : 'unknown').slice(0, 300);
      console.log(`[ai-poster] ${id.slice(0, 6)} failed: ${msg}`);
      await db.query(
        `INSERT INTO poster_gens (id, event_id, batch_id, kind, event_type, style, provider, model, prompt, result, cost_usd, status, error, created_by)
         VALUES ($1, $2, $3, 'image', $4, $5, $6, $7, $8, $9, 0, 'failed', $10, $11)`,
        [id, eventId, batch, type, style, p.key, p.model, prompt, JSON.stringify({ seed }), msg, s.contactId]
      );
    }
  };
  // 匿名 Pollinations 限速（约 15 秒一张），一张一张来；其余服务并发
  if (p.key === 'pollinations') for (const seed of seeds) await one(seed);
  else await Promise.all(seeds.map(one));
  console.log(`[ai-poster] batch done`);
  const after = await posterState(eventId);
  const made = after.gens.filter((g) => g.batch_id === batch);
  if (!made.some((g) => g.status === 'ok')) throw new CrmError('wx_error', `这一批没画出来：${made[0]?.error ?? '画图服务没响应'}。过一会儿再试。`);
  return after;
}

export async function copyIdeas(s: Staff, eventId: string, type?: string) {
  const ev = await eventOf(eventId);
  const r = await suggestCopy(ev, typeOf(type).label, await chosenProvider());
  await getPool().query(
    `INSERT INTO poster_gens (event_id, batch_id, kind, event_type, provider, model, prompt, result, cost_usd, status, error, created_by)
     VALUES ($1, $2, 'copy', $3, $4, $5, $6, $7, 0, $8, $9, $10)`,
    [eventId, randomUUID(), typeOf(type).key, r.provider, r.model || null, r.prompt, JSON.stringify({ ideas: r.ideas }), r.ideas.length ? 'ok' : 'failed', r.note, s.contactId]
  );
  return { ideas: r.ideas, note: r.note };
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null;
/** 海报上禁止出现的字样（价格、免费、报名人数） */
export function forbidden(text: string): string | null {
  if (/免费|免單|免单|\$\s?\d|¥\s?\d|\d+\s*(元|美元|刀)|已报名|已報名|人已报|名额仅剩/.test(text)) return '海报上不能出现价格、“免费”或报名人数，请改一下';
  return null;
}

export async function savePoster(s: Staff, eventId: string, b: Record<string, unknown>) {
  const db = getPool();
  await eventOf(eventId);
  const film = clean(b.filmTitle, 12);
  const tagline = clean(b.tagline, 30);
  const host = clean(b.host, 30);
  const speaker = clean(b.speaker, 30);
  const coHost = clean(b.coHost, 30);
  const bad = forbidden([film, tagline, host, speaker, coHost].filter(Boolean).join(' '));
  if (bad) throw new CrmError('bad_request', bad);
  let genId: string | null = typeof b.genId === 'string' ? b.genId : null;
  let genStyle: string | null = null;
  if (genId) {
    const { rows } = await db.query<{ style: string | null }>(`SELECT style FROM poster_gens WHERE id = $1 AND event_id = $2 AND status = 'ok' AND kind = 'image'`, [genId, eventId]);
    if (!rows[0]) genId = null;
    else genStyle = rows[0].style;
  }
  let cap: number | null = null;
  if (b.imageCap !== undefined && b.imageCap !== null && b.imageCap !== '') {
    cap = Math.floor(Number(b.imageCap));
    if (!Number.isFinite(cap) || cap < 1 || cap > 100) throw new CrmError('bad_request', '本场上限请填 1–100 之间的数字');
  }
  const style = typeof b.style === 'string' && STYLES.some((x) => x.key === b.style) ? b.style : genStyle;
  await db.query(
    `INSERT INTO event_posters (event_id, gen_id, style, film_title, tagline, host, speaker, co_host, image_cap, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (event_id) DO UPDATE SET
       gen_id = COALESCE(EXCLUDED.gen_id, event_posters.gen_id), style = COALESCE(EXCLUDED.style, event_posters.style),
       film_title = EXCLUDED.film_title, tagline = EXCLUDED.tagline, host = EXCLUDED.host, speaker = EXCLUDED.speaker, co_host = EXCLUDED.co_host,
       image_cap = EXCLUDED.image_cap, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [eventId, genId, style, film, tagline, host, speaker, coHost, cap, s.contactId]
  );
  return posterState(eventId);
}

export async function setDefaultCap(s: Staff, n: unknown) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 1 || v > 100) throw new CrmError('bad_request', '默认上限请填 1–100 之间的数字');
  await setSetting(getPool(), 'poster_image_cap', v, s.email);
  return v;
}

/** 主讲人真实照片（后台上传，不让 AI 画） */
export async function setSpeakerPhoto(s: Staff, eventId: string, data: Buffer | null) {
  await eventOf(eventId);
  let url: string | null = null;
  if (data) {
    if (!blobConfigured()) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
    const sharp = (await import('sharp')).default;
    const jpg = await sharp(data, { failOn: 'none' }).rotate().resize(800, 800, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
    url = (await put(`${BLOB_PREFIX}/ai-poster/${eventId}/speaker-${randomUUID()}.jpg`, jpg, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false })).url;
  }
  await getPool().query(
    `INSERT INTO event_posters (event_id, speaker_photo_url, updated_by, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (event_id) DO UPDATE SET speaker_photo_url = EXCLUDED.speaker_photo_url, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [eventId, url, s.contactId]
  );
  return posterState(eventId);
}

async function fetchBuf(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) return Buffer.from(url.split(',')[1] ?? '', 'base64');
  const r = await fetch(url);
  if (!r.ok) throw new CrmError('not_found', '主视觉图片取不到了，请重新选一张');
  return Buffer.from(await r.arrayBuffer());
}

/** 报名码：配了微信用正式版小程序码，否则用网页报名页二维码 */
async function registerQr(slug: string): Promise<Buffer> {
  if (wxConfigured()) {
    try { return await eventRegisterCode(slug); } catch { /* 微信接口没响应就退回网页码 */ }
  }
  return QRCode.toBuffer(`${SITE()}/zh/e/${slug}`, { margin: 1, width: 480 });
}

export function posterText(ev: EvRow, p: Partial<PosterRow> | null) {
  const tz = ev.timezone || 'America/Los_Angeles';
  return {
    tagline: p?.tagline ?? '',
    filmTitle: p?.film_title || ev.title,
    subtitle: ev.title,
    credits: { host: p?.host ?? 'SAREC 中美房地产商会', speaker: p?.speaker ?? null, coHost: p?.co_host ?? null },
    dateLine: fullDate(ev.starts_at, tz),
    timeLine: `${checkinLine(ev, tz)}（${tzLabel(tz)}）`,
    place: [ev.location_name, ev.address].filter(Boolean).join(' · ')
  };
}

/** 出图：gen 不传就用已选的那张 */
export async function renderPoster(eventId: string, size: PosterSize, genId?: string | null): Promise<{ png: Buffer; slug: string }> {
  const db = getPool();
  const ev = await eventOf(eventId);
  const { rows } = await db.query<PosterRow>(`SELECT * FROM event_posters WHERE event_id = $1`, [eventId]);
  const p = rows[0] ?? null;
  const gid = genId || p?.gen_id;
  if (!gid) throw new CrmError('bad_request', '先在候选图里点选一张主视觉');
  const { rows: g } = await db.query<GenRow>(`SELECT * FROM poster_gens WHERE id = $1 AND event_id = $2 AND status = 'ok'`, [gid, eventId]);
  if (!g[0]?.image_url) throw new CrmError('not_found', '找不到这张主视觉');
  const [bg, qr, photo] = await Promise.all([fetchBuf(g[0].image_url), registerQr(ev.slug), p?.speaker_photo_url ? fetchBuf(p.speaker_photo_url).catch(() => null) : Promise.resolve(null)]);
  const png = await composePoster({ bg, size, style: styleOf(p?.style || g[0].style), text: posterText(ev, p), qr, speakerPhoto: photo });
  return { png, slug: ev.slug };
}
