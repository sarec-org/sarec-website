/**
 * AI 海报主流程（东哥 11/10）：后台活动页「生成海报」
 *   选活动类型 + 风格（+ 可选画面主题）→ 一次出 4 张候选主视觉 → 东哥点选一张（不满意“再来一批”）
 *   → 文案（片名 + 宣传语，可让文字模型给 5 组备选）→ 叠字出竖版 / 方版 / 公众号头图。
 * 每场默认最多 12 张主视觉（crm_settings.poster_image_cap，单场可在 event_posters.image_cap 调），每次调用记 poster_gens（指令、服务商、花费）。
 * 生成的图存自己的 Blob（正式站 prod/、预览 test/）。AI 海报只在网站后台生成和下载，不进小程序。
 */
import { randomUUID } from 'node:crypto';
import { head, put } from '@vercel/blob';
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
import { audit } from '@/lib/crm/staff';
import { gatewayBalance, imageProvider, normalize, providerChoices, redactSecrets, SWITCHABLE } from './providers';
import { suggestCopy } from './copy';
import { composeCover, composePoster, defaultCoverPos, fillText, focusFromCoverPos, markPng, type PosterExtra, type PosterSize } from './compose';
import { DEFAULT_STYLE, EVENT_TYPES, STYLES, buildPrompt, styleOf, typeOf } from './styles';

export const DEFAULT_CAP = 12;
export const BATCH = 4;
const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');

type EvRow = { id: string; slug: string; title: string; summary: string | null; starts_at: Date; checkin_starts_at: Date | null; timezone: string; location_name: string | null; address: string | null; cover_url?: string | null };
export type PosterRow = { event_id: string; gen_id: string | null; style: string | null; film_title: string | null; tagline: string | null; host: string | null; speaker: string | null; co_host: string | null; speaker_photo_url: string | null; image_cap: number | null; texts?: PosterTexts | null; official?: Official | null; cover_pos?: number | null; prev_cover_url?: string | null };
/** 官方海报快照：主视觉 + 全部排字 + 画面上移；日期地点仍随活动信息自动更新 */
export type Official = { genId: string; style: string | null; texts: PosterTexts; filmTitle: string | null; tagline: string | null; host: string | null; speaker: string | null; coHost: string | null; speakerPhotoUrl: string | null; lift: number; ai: boolean; setAt: string; setBy: string };
/** 海报上每一处字（后台 / 手机上直接改；空 = 按活动信息自动） + 画面上移 */
export type PosterTexts = { tagline?: string; filmTitle?: string; filmSubtitle?: string; titleEn?: string; subtitle?: string; bigDate?: string; dateNote?: string; place?: string; billing?: string; extras?: PosterExtra[]; lift?: number };
const TEXT_MAX: Record<Exclude<keyof PosterTexts, 'extras' | 'lift'>, number> = { tagline: 30, filmTitle: 12, filmSubtitle: 12, titleEn: 40, subtitle: 40, bigDate: 12, dateNote: 40, place: 80, billing: 140 };
/** 校验后台传来的文字；自由加字是东哥自己写的内容，不套“免费 / 价格”的禁用词（其余字样照旧检查） */
export function parseTexts(v: unknown): PosterTexts {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const out: PosterTexts = {};
  for (const [k, max] of Object.entries(TEXT_MAX) as [keyof typeof TEXT_MAX, number][]) {
    const x = typeof o[k] === 'string' ? (o[k] as string).trim().slice(0, max) : '';
    if (x) out[k] = x;
  }
  const bad = forbidden(Object.values(out).join(' '));
  if (bad) throw new CrmError('bad_request', bad);
  if (Array.isArray(o.extras)) {
    out.extras = (o.extras as Record<string, unknown>[]).slice(0, 2).flatMap((e) => {
      const text = typeof e?.text === 'string' ? e.text.trim().slice(0, 24) : '';
      if (!text) return [];
      const pos = (['aboveTitle', 'belowSubtitle', 'bottom'] as const).find((p) => p === e.pos) ?? 'belowSubtitle';
      const size = (['L', 'M', 'S'] as const).find((p) => p === e.size) ?? 'M';
      return [{ text, pos, size }];
    });
  }
  const lift = Number(o.lift);
  if (Number.isFinite(lift) && lift > 0) out.lift = Math.min(0.25, Math.round(lift * 100) / 100);
  return out;
}
export type GenRow = { id: string; batch_id: string; kind: string; event_type: string | null; style: string | null; provider: string; model: string | null; prompt: string; image_url: string | null; cost_usd: string; status: string; error: string | null; created_at: Date; ai_generated?: boolean };

async function eventOf(id: string): Promise<EvRow> {
  const { rows } = await getPool().query<EvRow>(
    `SELECT id, slug, title, summary, starts_at, checkin_starts_at, timezone, location_name, address, cover_url FROM events WHERE id = $1`,
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
    db.query<GenRow>(`SELECT * FROM poster_gens WHERE event_id = $1 ORDER BY created_at DESC`, [eventId]),
    defaultCap()
  ]);
  const poster = p[0] ?? null;
  const cap = poster?.image_cap ?? cap0;
  // 上传的图不占“每场上限”（不花钱）
  const images = gens.filter((g) => g.status === 'ok' && g.image_url && g.provider !== 'upload');
  const choice = await chosenProvider();
  const { p: prov, note } = imageProvider(choice);
  const auto = posterText(ev, poster ? { ...poster, texts: null } : null);
  return {
    event: { id: ev.id, title: ev.title, slug: ev.slug },
    poster,
    gens: gens.map((g) => ({ id: g.id, batch_id: g.batch_id, kind: g.kind, event_type: g.event_type, style: g.style, provider: g.provider, model: g.model, prompt: g.prompt, image_url: g.image_url, cost_usd: Number(g.cost_usd), status: g.status, error: g.error, created_at: g.created_at, ai: g.ai_generated !== false })),
    official: poster?.official ? { genId: poster.official.genId, setAt: poster.official.setAt, setBy: poster.official.setBy, ai: poster.official.ai } : null,
    cover: { url: ev.cover_url ?? null, pos: poster?.cover_pos ?? null, autoPos: defaultCoverPos() },
    used: images.length,
    cap,
    defaultCap: cap0,
    spentUsd: Math.round(gens.reduce((s, g) => s + Number(g.cost_usd), 0) * 10000) / 10000,
    provider: { key: prov.key, label: prov.label, model: prov.model, costPerImage: prov.costPerImage, note, chosen: choice },
    providers: providerChoices(),
    /** 每一处字“自动”时是什么（后台输入框里灰字提示） */
    textDefaults: { tagline: auto.tagline, filmTitle: auto.filmTitle, subtitle: auto.subtitle, place: auto.place, ...fillText(auto) },
    balanceUsd: prov.key === 'gateway' ? await gatewayBalance() : null,
    types: EVENT_TYPES.map(({ key, label }) => ({ key, label })),
    styles: STYLES.map(({ key, group, label }) => ({ key, group, label }))
  };
}

/** 一批 4 张（剩余额度不足 4 张时出剩下的）。失败的也记一行（不占额度、不计费） */
export async function generateBatch(s: Staff, eventId: string, input: { type?: string; style?: string; subject?: string; count?: number }) {
  const db = getPool();
  await eventOf(eventId);
  const type = typeOf(input.type).key;
  const style = styleOf(input.style).key;
  const st = await posterState(eventId);
  const left = st.cap - st.used;
  if (left <= 0) throw new CrmError('conflict', `这场活动已经生成了 ${st.used} 张主视觉，到上限了（${st.cap} 张）。可以在下面调高本场上限。`);
  const want = Number.isInteger(input.count) && input.count! >= 1 && input.count! <= BATCH ? input.count! : BATCH;
  const n = Math.min(want, left);
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
  if (b.texts !== undefined) {
    const texts = parseTexts(b.texts);
    try {
      await db.query(`UPDATE event_posters SET texts = $2 WHERE event_id = $1`, [eventId, JSON.stringify(texts)]);
    } catch (e) {
      if ((e as { code?: string }).code === '42703') throw new CrmError('conflict', '数据库还差一步（迁移 0031），改字功能暂时存不了，请联系管理员');
      throw e;
    }
  }
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

/**
 * 报名码：配了微信就必须是正式版小程序码。
 * 生成成功的码存一份到 Blob；微信接口出错时用存好的那份；两样都没有就报错、不出图
 * （以前会悄悄换成网页码，海报印出去扫到的是网页，11/12 测试发现）。
 * 没配微信（本地 / 测试站）才用网页报名页二维码。
 */
const regQrPath = (slug: string) => `${BLOB_PREFIX}/wxacode/register/${encodeURIComponent(slug)}.png`;
async function registerQr(slug: string): Promise<Buffer> {
  if (!wxConfigured()) return QRCode.toBuffer(`${SITE()}/zh/e/${slug}`, { margin: 1, width: 480 });
  try {
    const buf = await eventRegisterCode(slug);
    if (blobConfigured()) await put(regQrPath(slug), buf, { access: 'public', contentType: 'image/png', addRandomSuffix: false }).catch((e) => console.log('[wxacode] cache put failed', (e as Error).message));
    return buf;
  } catch (e) {
    if (blobConfigured()) {
      const cached = await head(regQrPath(slug)).then((h) => fetch(h.url)).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
      if (cached) {
        console.log(`[wxacode] register slug=${slug} wechat failed, using cached code`);
        return Buffer.from(cached);
      }
    }
    const why = e instanceof CrmError ? e.message : '微信接口没响应';
    throw new CrmError('wx_error', `小程序报名码这会儿生成不了（${why.replace(/，请稍后再试$/, '')}），海报没有出图，免得印成网页码。请稍后再试；一直不行请找技术。`);
  }
}

export function posterText(ev: EvRow, p: Partial<PosterRow> | null) {
  const tz = ev.timezone || 'America/Los_Angeles';
  const x = p?.texts ?? {};
  return {
    tagline: x.tagline ?? p?.tagline ?? '',
    filmTitle: x.filmTitle || p?.film_title || ev.title,
    filmSubtitle: x.filmSubtitle ?? null,
    titleEn: x.titleEn ?? null,
    subtitle: x.subtitle || ev.title,
    credits: { host: p?.host ?? 'SAREC 中美房地产商会', speaker: p?.speaker ?? null, coHost: p?.co_host ?? null },
    dateLine: fullDate(ev.starts_at, tz),
    timeLine: `${checkinLine(ev, tz)}（${tzLabel(tz)}）`,
    place: x.place || [ev.location_name, ev.address].filter(Boolean).join(' · '),
    bigDate: x.bigDate ?? null,
    dateNote: x.dateNote ?? null,
    billing: x.billing ?? null,
    extras: x.extras ?? []
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
  const ai = g[0].ai_generated !== false;
  const png = await composePoster({ bg, size, style: styleOf(p?.style || g[0].style), text: posterText(ev, p), qr, speakerPhoto: photo, lift: p?.texts?.lift ?? 0, aiLabel: ai, focus: focusFromCoverPos(p?.cover_pos) });
  return { png: ai ? markPng(png, g[0].id) : png, slug: ev.slug };
}

// ── 上传自己的图（ChatGPT 等别处生成的也行）：不花钱、不占每场上限；默认算 AI 生成 ──────────
export async function uploadMainImage(s: Staff, eventId: string, data: Buffer, ai: boolean) {
  await eventOf(eventId);
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  const sharp = (await import('sharp')).default;
  const jpg = await sharp(data, { failOn: 'none' }).rotate().resize(1536, 2304, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  const m = await sharp(jpg).metadata();
  if ((m.width ?? 0) < 500 || (m.height ?? 0) < 500) throw new CrmError('bad_request', '图片太小了，请用宽和高都在 500 像素以上的图');
  const id = randomUUID();
  const url = (await put(`${BLOB_PREFIX}/ai-poster/${eventId}/upload-${id}.jpg`, jpg, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false })).url;
  const db = getPool();
  await db.query(
    `INSERT INTO poster_gens (id, event_id, batch_id, kind, style, provider, model, prompt, image_url, result, cost_usd, status, created_by, ai_generated)
     VALUES ($1, $2, $3, 'image', $4, 'upload', NULL, '后台上传的图片', $5, $6, 0, 'ok', $7, $8)`,
    [id, eventId, randomUUID(), DEFAULT_STYLE, url, JSON.stringify({ width: m.width, height: m.height }), s.contactId, ai]
  );
  await db.query(
    `INSERT INTO event_posters (event_id, gen_id, style, updated_by, updated_at) VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (event_id) DO UPDATE SET gen_id = EXCLUDED.gen_id, style = COALESCE(event_posters.style, EXCLUDED.style), updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [eventId, id, DEFAULT_STYLE, s.contactId]
  );
  return posterState(eventId);
}

// ── 官方海报：每场一张；设了之后活动封面、“活动海报”三个下载、小程序邀请海报都用它 ──────────
function officialAsRow(o: Official): Partial<PosterRow> {
  return { texts: o.texts, film_title: o.filmTitle, tagline: o.tagline, host: o.host, speaker: o.speaker, co_host: o.coHost, speaker_photo_url: o.speakerPhotoUrl };
}
async function officialOf(eventId: string): Promise<{ ev: EvRow; p: PosterRow; o: Official; gen: GenRow } | null> {
  const db = getPool();
  const ev = await eventOf(eventId);
  const { rows } = await db.query<PosterRow>(`SELECT * FROM event_posters WHERE event_id = $1`, [eventId]);
  const p = rows[0];
  if (!p?.official?.genId) return null;
  const { rows: g } = await db.query<GenRow>(`SELECT * FROM poster_gens WHERE id = $1 AND event_id = $2 AND status = 'ok'`, [p.official.genId, eventId]);
  if (!g[0]?.image_url) return null;
  return { ev, p, o: p.official, gen: g[0] };
}
async function makeCover(eventId: string, imageUrl: string, ai: boolean, pos: number | null | undefined, id: string): Promise<string> {
  const jpg = await composeCover(await fetchBuf(imageUrl), { pos, ai, id });
  return (await put(`${BLOB_PREFIX}/cover/official-${eventId}-${Date.now()}.jpg`, jpg, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false })).url;
}

export async function setOfficial(s: Staff, eventId: string, on: boolean) {
  const db = getPool();
  const ev = await eventOf(eventId);
  const { rows } = await db.query<PosterRow>(`SELECT * FROM event_posters WHERE event_id = $1`, [eventId]);
  const p = rows[0];
  if (!on) {
    if (p?.official) {
      await db.query(`UPDATE events SET cover_url = $2, updated_at = now() WHERE id = $1`, [eventId, p.prev_cover_url ?? null]);
      await db.query(`UPDATE event_posters SET official = NULL, prev_cover_url = NULL, updated_by = $2, updated_at = now() WHERE event_id = $1`, [eventId, s.contactId]);
      await audit(db, s, 'poster_official_off', 'event', eventId, { before: { genId: p.official.genId } });
    }
    return posterState(eventId);
  }
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  if (!p?.gen_id) throw new CrmError('bad_request', '先在候选图里点选一张主视觉');
  const { rows: g } = await db.query<GenRow>(`SELECT * FROM poster_gens WHERE id = $1 AND event_id = $2 AND status = 'ok'`, [p.gen_id, eventId]);
  if (!g[0]?.image_url) throw new CrmError('not_found', '找不到这张主视觉');
  const ai = g[0].ai_generated !== false;
  const o: Official = {
    genId: g[0].id, style: p.style || g[0].style, texts: p.texts ?? {}, filmTitle: p.film_title, tagline: p.tagline, host: p.host, speaker: p.speaker, coHost: p.co_host,
    speakerPhotoUrl: p.speaker_photo_url, lift: p.texts?.lift ?? 0, ai, setAt: new Date().toISOString(), setBy: s.name || s.email
  };
  const cover = await makeCover(eventId, g[0].image_url, ai, p.cover_pos, g[0].id);
  await db.query(
    `UPDATE event_posters SET official = $2, prev_cover_url = CASE WHEN official IS NULL THEN $3 ELSE prev_cover_url END, updated_by = $4, updated_at = now() WHERE event_id = $1`,
    [eventId, JSON.stringify(o), ev.cover_url ?? null, s.contactId]
  );
  await db.query(`UPDATE events SET cover_url = $2, updated_at = now() WHERE id = $1`, [eventId, cover]);
  await audit(db, s, 'poster_official_on', 'event', eventId, { after: { genId: o.genId, cover } });
  return posterState(eventId);
}

/** 封面取景位置（0–1）；设了官方海报的立刻按新位置重出封面 */
export async function setCoverPos(s: Staff, eventId: string, v: unknown) {
  const pos = v === null || v === '' ? null : Number(v);
  if (pos !== null && !(Number.isFinite(pos) && pos >= 0 && pos <= 1)) throw new CrmError('bad_request', '封面位置不对');
  const db = getPool();
  await db.query(`UPDATE event_posters SET cover_pos = $2, updated_by = $3, updated_at = now() WHERE event_id = $1`, [eventId, pos, s.contactId]);
  const off = await officialOf(eventId);
  if (off) {
    const cover = await makeCover(eventId, off.gen.image_url!, off.o.ai, pos, off.gen.id);
    await db.query(`UPDATE events SET cover_url = $2, updated_at = now() WHERE id = $1`, [eventId, cover]);
  }
  return posterState(eventId);
}

/** 封面预览（不保存）：后台拖动位置时看效果 */
export async function previewCover(eventId: string, pos: number | null): Promise<Buffer> {
  const db = getPool();
  const { rows } = await db.query<PosterRow>(`SELECT * FROM event_posters WHERE event_id = $1`, [eventId]);
  const gid = rows[0]?.official?.genId || rows[0]?.gen_id;
  if (!gid) throw new CrmError('bad_request', '先在候选图里点选一张主视觉');
  const { rows: g } = await db.query<GenRow>(`SELECT * FROM poster_gens WHERE id = $1 AND event_id = $2 AND status = 'ok'`, [gid, eventId]);
  if (!g[0]?.image_url) throw new CrmError('not_found', '找不到这张主视觉');
  return composeCover(await fetchBuf(g[0].image_url), { pos, ai: g[0].ai_generated !== false, id: g[0].id });
}

/**
 * 官方海报出图（“活动海报”三个下载、小程序邀请海报共用）。没设官方海报返回 null（调用方退回老样式）。
 * inviter 给了就是邀请海报：右下角换成这位会员的专属码，片名和日期之间加“某某 邀请您”。
 */
export async function renderOfficial(eventId: string, size: PosterSize, invite?: { qr: Buffer; name: string; label?: string | null; avatar?: Buffer | null } | null): Promise<{ png: Buffer; slug: string; ai: boolean } | null> {
  const off = await officialOf(eventId);
  if (!off) return null;
  const { ev, o, gen } = off;
  const row = officialAsRow(o);
  const [bg, qr, photo] = await Promise.all([
    fetchBuf(gen.image_url!),
    invite ? Promise.resolve(invite.qr) : registerQr(ev.slug),
    o.speakerPhotoUrl && !invite ? fetchBuf(o.speakerPhotoUrl).catch(() => null) : Promise.resolve(null)
  ]);
  const png = await composePoster({
    bg, size, style: styleOf(o.style || gen.style), text: posterText(ev, row), qr, speakerPhoto: photo, lift: o.lift ?? 0, aiLabel: o.ai, focus: focusFromCoverPos(off.p.cover_pos),
    inviter: invite ? { name: invite.name, label: invite.label, avatar: invite.avatar } : null
  });
  return { png: o.ai ? markPng(png, gen.id) : png, slug: ev.slug, ai: o.ai };
}
/** 官方海报的版本指纹（邀请海报缓存用：换图 / 改字 / 改活动信息都会变） */
export async function officialVersion(eventId: string): Promise<string | null> {
  const { rows } = await getPool().query<{ official: Official | null; updated_at: Date; ev_updated: Date }>(
    `SELECT p.official, p.updated_at, e.updated_at AS ev_updated FROM event_posters p JOIN events e ON e.id = p.event_id WHERE p.event_id = $1`,
    [eventId]
  );
  const r = rows[0];
  if (!r?.official) return null;
  return `${r.official.genId}:${r.official.setAt}:${new Date(r.ev_updated).getTime()}`;
}
