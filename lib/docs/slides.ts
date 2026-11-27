/**
 * 指令 103 / 104「讲座课件」：每场讲座的课件挂到活动上，大家能看、能下、能转发。不加迁移，用现有表：
 * - 课件就是 chamber_docs 里挂了 event_id 的那份（后台「内容 › 商会资料」同一张表），默认所有人能看能下（audience = all），
 *   每份保留「仅会员看完整版」开关（audience = members，口径不变：注册用户看前几页、不给 PDF）。
 * - 原稿 / 手机版 / 小程序码 / 上传时间记在 crm_settings.doc_files（{ [docId]: { full, fullBytes, qr, channel, at } }）：
 *   chamber_docs.pdf_url = 手机版（压缩过、最后加了扫码页），原稿留给电脑下载。
 * - 小程序码用渠道码那一套：channels 表一条「课件·标题」（note = doc:<id>），码进这份课件页并带 channel，扫码人数在「渠道码」里看。
 *   测试站没配微信时出测试码（SAREC-TEST:…），和渠道码一样。
 * - 讲座结束 2 小时后、14 天内还没挂课件 → 工作台「今天」出「上传这场的课件」；点「这场没有课件」记在 crm_settings.slides_skip，不再提醒。
 * - 上传后看板自动出「11/27 讲座课件已上传 · 可下载」（board.ts 的 docs_new，7 天后撤，后台看板开关能关）。
 * 订阅消息「讲座课件已上传」这次没做：event_reminder_subs.kind 有 CHECK 约束，加新种类要迁移，另外要在公众平台申请新模板（见交付文档）。
 */
import { randomUUID } from 'node:crypto';
import { del, list, put } from '@vercel/blob';
import QRCode from 'qrcode';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { getSetting, setSetting } from '@/lib/crm/orders';
import { BLOB_PREFIX, blobConfigured } from '@/lib/crm/photos';
import { createChannel } from '@/lib/crm/channels';
import { wxConfigured } from '@/lib/crm/wechat';
import type { Staff } from '@/lib/crm/auth';
import { processPdf, siteFileUrl, type DocRow } from './service';
import { appendQrPage, mobilePdf } from './lecturePdf';

export const FILES_KEY = 'doc_files';
export const SKIP_KEY = 'slides_skip';
export type DocFiles = { full?: string; fullBytes?: number; qr?: string; channel?: string; at?: string; compressed?: boolean };
const TZ = 'America/Los_Angeles';

export async function docFilesAll(): Promise<Record<string, DocFiles>> {
  const v = await getSetting<Record<string, DocFiles>>(getPool(), FILES_KEY, {});
  return v && typeof v === 'object' ? v : {};
}
export async function docFiles(id: string): Promise<DocFiles> {
  return (await docFilesAll())[id] ?? {};
}
async function setDocFiles(id: string, patch: DocFiles, by: string) {
  const all = await docFilesAll();
  all[id] = { ...(all[id] ?? {}), ...patch };
  // 删掉的资料顺手清掉
  const { rows } = await getPool().query<{ id: string }>(`SELECT id::text FROM chamber_docs WHERE id = ANY($1::uuid[])`, [Object.keys(all)]);
  const alive = new Set(rows.map((r) => r.id));
  for (const k of Object.keys(all)) if (!alive.has(k)) delete all[k];
  await setSetting(getPool(), FILES_KEY, all, by);
}

const cut = (s: string, n: number) => (Array.from(s).length > n ? Array.from(s).slice(0, n - 1).join('') + '…' : s);
export const md = (d: Date | string) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'numeric', day: 'numeric' }).format(new Date(d));
/** 转发卡片 / 文件名：「课件｜讲座名」 */
export const shareTitleFor = (eventTitle: string) => `课件｜${cut(eventTitle.trim(), 30)}`;

type Ev = { id: string; slug: string; title: string; starts_at: Date; ends_at: Date | null; event_status: string };
async function eventById(id: string): Promise<Ev> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new CrmError('not_found', '找不到这场活动');
  const { rows } = await getPool().query<Ev>(`SELECT id, slug, title, starts_at, ends_at, event_status FROM events WHERE id = $1`, [id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  return rows[0];
}
const endOf = (e: Pick<Ev, 'starts_at' | 'ends_at'>) => e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 2 * 3600_000);

// ── 小程序码（渠道码那一套） ─────────────────────────────────────────
async function channelFor(doc: Pick<DocRow, 'id' | 'title'>, actor: string): Promise<string> {
  const note = `doc:${doc.id}`;
  const { rows } = await getPool().query<{ code: string }>(`SELECT code FROM channels WHERE note = $1 ORDER BY id LIMIT 1`, [note]);
  if (rows[0]) return rows[0].code;
  return (await createChannel(actor, { name: cut(`课件·${doc.title.replace(/^课件｜/, '')}`, 60), kind: 'other', note })).code;
}
export function docCodePath(slug: string, channel: string) {
  return `pages/doc/doc?slug=${encodeURIComponent(slug)}&channel=${channel}`;
}
async function docCodePng(slug: string, channel: string): Promise<Buffer> {
  const p = docCodePath(slug, channel);
  if (!wxConfigured()) return QRCode.toBuffer(`SAREC-TEST:${p}`, { margin: 1, width: 900 });
  const { miniProgramPathCode } = await import('@/lib/crm/wechat');
  return miniProgramPathCode(p, `doc ${channel}`);
}
/** 这份课件的小程序码（PNG）：有存的直接给；没有现生成并存起来 */
export async function ensureQr(doc: Pick<DocRow, 'id' | 'slug' | 'title'>, actor: string): Promise<{ png: Buffer; url: string | null; channel: string }> {
  const f = await docFiles(doc.id);
  const channel = f.channel || (await channelFor(doc, actor));
  if (f.qr && f.channel === channel) {
    const r = await fetch(f.qr).catch(() => null);
    if (r?.ok) return { png: Buffer.from(await r.arrayBuffer()), url: f.qr, channel };
  }
  const png = await docCodePng(doc.slug, channel);
  let url: string | null = null;
  if (blobConfigured()) {
    url = (await put(`${BLOB_PREFIX}/docs/${doc.id}/qr-${channel}.png`, png, { access: 'public', contentType: 'image/png', addRandomSuffix: true })).url;
    await setDocFiles(doc.id, { qr: url, channel }, actor);
  }
  return { png, url, channel };
}

// ── 课件 PDF 加工：原稿留着 → 手机版（压图）→ 最后加扫码页 → 逐页转图 ───────────
export async function processLecture(doc: DocRow, pdf: Buffer, fullUrl: string, actor: string, eventTitle: string) {
  const notes: string[] = [];
  const m = await mobilePdf(pdf).catch(() => ({ buf: pdf, compressed: false, images: 0 }));
  let mobile = m.buf;
  if (m.compressed) notes.push(`手机版已压到 ${(mobile.length / 1048576).toFixed(1)} MB（原稿 ${(pdf.length / 1048576).toFixed(1)} MB 留给电脑下载）`);
  try {
    const qr = await ensureQr(doc, actor);
    mobile = await appendQrPage(mobile, qr.png, eventTitle);
    notes.push('最后加了一页「扫码下载本场课件」');
  } catch (e) {
    console.error('[slides] qr page', e instanceof Error ? e.message : 'error');
    notes.push('扫码页没加上（小程序码暂时生成不了），课件本身照常');
  }
  const mobileUrl = (await put(`${BLOB_PREFIX}/docs/${doc.id}/${randomUUID().slice(0, 8)}-mobile.pdf`, mobile, { access: 'public', contentType: 'application/pdf', addRandomSuffix: false })).url;
  const out = await processPdf(doc.id, mobile, mobileUrl);
  await setDocFiles(doc.id, { full: fullUrl, fullBytes: pdf.length, at: new Date().toISOString(), compressed: m.compressed }, actor);
  return { doc: out, notes };
}

// ── 手机分块上传（函数请求体限 4.5MB；每块 ≤ 3.5MB 先存图片存储，传完拼起来） ─────────
const UP_RE = /^[a-z0-9]{16,32}$/;
const MAX_PARTS = 24;
export async function putChunk(up: string, i: number, buf: Buffer) {
  if (!UP_RE.test(up) || !Number.isInteger(i) || i < 0 || i >= MAX_PARTS) throw new CrmError('bad_request', '上传编号不对，请重新选文件');
  if (!buf.length || buf.length > 3.6 * 1024 * 1024) throw new CrmError('bad_request', '这一段太大了，请更新小程序后再传');
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  await put(`${BLOB_PREFIX}/docs/tmp/${up}/${String(i).padStart(3, '0')}`, buf, { access: 'public', contentType: 'application/octet-stream', addRandomSuffix: false });
}
export async function joinChunks(up: string, parts: number): Promise<Buffer> {
  if (!UP_RE.test(up) || !Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) throw new CrmError('bad_request', '上传编号不对，请重新选文件');
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}/docs/tmp/${up}/`, limit: 100 });
  const byName = new Map(blobs.map((b) => [b.pathname.split('/').pop()!, b.url]));
  const bufs: Buffer[] = [];
  for (let i = 0; i < parts; i++) {
    const u = byName.get(String(i).padStart(3, '0'));
    if (!u) throw new CrmError('bad_request', `第 ${i + 1} 段没传上，请重新传`);
    const r = await fetch(u, { cache: 'no-store' });
    if (!r.ok) throw new CrmError('bad_request', `第 ${i + 1} 段取不到，请重新传`);
    bufs.push(Buffer.from(await r.arrayBuffer()));
  }
  del(blobs.map((b) => b.url)).catch(() => undefined);
  return Buffer.concat(bufs);
}

export function isPdf(buf: Buffer) {
  return buf.length > 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
}
export function pptHint(name: string): string | null {
  return /\.(pptx?|key|potx?)$/i.test(name) ? '这是 PPT：请先另存为 PDF 再传（Mac 上用桌面的『双击我_PPT转PDF』，或 PowerPoint「文件 › 导出 › PDF」）。' : null;
}

// ── 活动页「传课件」 ───────────────────────────────────────────────
export type SlideItem = { id: string; slug: string; title: string; isPublic: boolean; audience: 'all' | 'members'; pageCount: number; pdfBytes: number | null; fullBytes: number | null; qrUrl: string | null; pdfUrl: string | null; fullUrl: string | null; redFlags: DocRow['red_flags']; textReadable: boolean | null; createdAt: string };
export async function eventSlides(eventId: string, base: string) {
  const e = await eventById(eventId);
  const { rows } = await getPool().query<DocRow>(`SELECT * FROM chamber_docs WHERE event_id = $1 ORDER BY created_at`, [eventId]);
  const files = await docFilesAll();
  const skip = await getSetting<string[]>(getPool(), SKIP_KEY, []);
  const docs: SlideItem[] = rows.map((d) => ({
    id: d.id, slug: d.slug, title: d.title, isPublic: d.is_public, audience: d.audience === 'members' ? 'members' : 'all', pageCount: d.pages.length,
    pdfBytes: d.pdf_bytes, fullBytes: files[d.id]?.fullBytes ?? null, qrUrl: d.pages.length ? `/api/v1/staff/docs/${d.id}/qr` : null,
    pdfUrl: siteFileUrl(d.pdf_url, base), fullUrl: siteFileUrl(files[d.id]?.full ?? null, base), redFlags: d.red_flags, textReadable: d.text_readable, createdAt: new Date(d.created_at).toISOString()
  }));
  return {
    event: { id: e.id, slug: e.slug, title: e.title, startsAt: new Date(e.starts_at).toISOString(), ended: endOf(e).getTime() < Date.now(), skipped: Array.isArray(skip) && skip.includes(e.id) },
    docs
  };
}

/** 新传一份课件：建资料（挂这场、默认所有人能看能下、直接公开）→ 加工 → 返回 */
export async function uploadSlides(s: Staff, eventId: string, pdf: Buffer, fullUrl: string | null, name: string, opts: { isPublic?: boolean; audience?: 'all' | 'members' } = {}) {
  const e = await eventById(eventId);
  if (!isPdf(pdf)) throw new CrmError('bad_request', pptHint(name) ?? '只能传 PDF（PPT 请先另存为 PDF）');
  if (pdf.length > 60 * 1024 * 1024) throw new CrmError('bad_request', 'PDF 太大了（最多 60MB）');
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  const db = getPool();
  const { rows: same } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM chamber_docs WHERE event_id = $1`, [eventId]);
  const title = cut(shareTitleFor(e.title) + (same[0].n ? `（${same[0].n + 1}）` : ''), 40);
  const slug = `slides-${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const { rows } = await db.query<DocRow>(
    `INSERT INTO chamber_docs (slug, title, summary, sort_order, is_public, created_by, audience, event_id, preview_pages)
     VALUES ($1, $2, $3, 0, false, $4, $5, $6, 3) RETURNING *`,
    [slug, title, `${md(e.starts_at)} 讲座课件`, s.contactId, opts.audience === 'members' ? 'members' : 'all', eventId]
  );
  const doc = rows[0];
  try {
    if (!fullUrl) fullUrl = (await put(`${BLOB_PREFIX}/docs/${doc.id}/${randomUUID().slice(0, 8)}-full.pdf`, pdf, { access: 'public', contentType: 'application/pdf', addRandomSuffix: false })).url;
    const r = await processLecture(doc, pdf, fullUrl, s.name || s.email, e.title);
    const pub = opts.isPublic !== false;
    const { rows: fin } = await db.query<DocRow>(`UPDATE chamber_docs SET is_public = $2, updated_at = now() WHERE id = $1 RETURNING *`, [doc.id, pub]);
    (await import('@/lib/crm/board')).clearBoardCache();
    const fl = fin[0].red_flags;
    const message = [
      `课件已${pub ? '上传并公开' : '上传（还没公开）'}：${fin[0].pages.length} 页。`,
      ...r.notes,
      pub ? '小程序活动页、「讲座课件」列表、看板都能看到了。' : '',
      fl.length ? `注意：这几页有可能影响小程序审核的字样（金额 / 会费 / 收益等）——${fl.map((x) => `第 ${x.page} 页：${x.words.join('、')}`).join('；')}。要撤下就点「先不公开」。` : '',
      fin[0].text_readable === false ? '这份是图片做的 PDF，系统读不到字，请自己翻一遍有没有金额、会费、收款方式、收益承诺。' : ''
    ].filter(Boolean).join('');
    return { doc: fin[0], message };
  } catch (err) {
    // 加工失败：这份半成品删掉，不留空壳
    await db.query(`DELETE FROM chamber_docs WHERE id = $1`, [doc.id]).catch(() => undefined);
    throw err;
  }
}

/** 活动页上改一份课件：公开 / 先不公开、所有人 / 仅会员（ops 能改；只改挂在这场上的） */
export async function updateSlide(eventId: string, docId: string, b: { isPublic?: unknown; audience?: unknown }) {
  const db = getPool();
  const { rows } = await db.query<DocRow>(
    `UPDATE chamber_docs SET is_public = CASE WHEN $3::boolean IS NULL THEN is_public ELSE $3 AND jsonb_array_length(pages) > 0 END,
            audience = COALESCE($4, audience), updated_at = now()
      WHERE id = $1 AND event_id = $2 RETURNING *`,
    [docId, eventId, typeof b.isPublic === 'boolean' ? b.isPublic : null, b.audience === 'members' || b.audience === 'all' ? b.audience : null]
  );
  if (!rows[0]) throw new CrmError('not_found', '找不到这份课件');
  (await import('@/lib/crm/board')).clearBoardCache();
  return rows[0];
}

export async function skipSlides(s: Staff, eventId: string) {
  await eventById(eventId);
  const cur = await getSetting<string[]>(getPool(), SKIP_KEY, []);
  const next = Array.from(new Set([...(Array.isArray(cur) ? cur : []), eventId])).slice(-200);
  await setSetting(getPool(), SKIP_KEY, next, s.name || s.email);
  return { message: '好的，这场不再提醒传课件' };
}

/** 讲座结束 2 小时后、14 天内、还没挂课件、没点过「这场没有课件」的活动（工作台「今天」用） */
export async function eventsNeedingSlides(now = new Date()) {
  const skip = await getSetting<string[]>(getPool(), SKIP_KEY, []);
  const { rows } = await getPool().query<{ id: string; title: string; starts_at: Date }>(
    `SELECT e.id, e.title, e.starts_at FROM events e
      WHERE e.is_listed AND e.event_status <> 'cancelled'
        AND coalesce(e.ends_at, e.starts_at + interval '2 hours') + interval '2 hours' <= $1
        AND coalesce(e.ends_at, e.starts_at + interval '2 hours') > $1::timestamptz - interval '14 days'
        AND NOT EXISTS (SELECT 1 FROM chamber_docs d WHERE d.event_id = e.id)
        AND NOT (e.id::text = ANY($2::text[]))
      ORDER BY e.starts_at DESC LIMIT 10`,
    [now, Array.isArray(skip) ? skip : []]
  );
  return rows;
}

// ── 发到我的邮箱（104-4）：只发登记并验证过的邮箱；同一份每人每天最多 3 次 ─────────
export async function emailDoc(contactId: string, slug: string, base: string) {
  const db = getPool();
  const { rows } = await db.query<DocRow & { event_title: string | null }>(
    `SELECT d.*, e.title AS event_title FROM chamber_docs d LEFT JOIN events e ON e.id = d.event_id WHERE d.slug = $1 AND d.is_public AND jsonb_array_length(d.pages) > 0`,
    [slug]
  );
  const d = rows[0];
  if (!d) throw new CrmError('not_found', '这份资料不存在或还没公开');
  const { rows: c } = await db.query<{ name: string | null; email: string | null; email_verified_at: Date | null }>(`SELECT name, email, email_verified_at FROM contacts WHERE id = $1`, [contactId]);
  const me = c[0];
  if (!me?.email || !me.email_verified_at) throw new CrmError('email_unverified', '先验证一下邮箱，课件就能发到你的邮箱');
  if (d.audience === 'members') {
    const { memberStatus } = await import('@/lib/crm/membership');
    const { staffFor } = await import('@/lib/crm/auth');
    if (!(await memberStatus(db, contactId)).isMember && !(await staffFor(contactId))) throw new CrmError('locked', '这份是会员资料，入会后可以下载完整版');
  }
  const { rows: n } = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM chamber_doc_events WHERE doc_id = $1 AND contact_id = $2 AND kind = 'pdf' AND channel = 'email' AND created_at > now() - interval '1 day'`,
    [d.id, contactId]
  );
  if (n[0].n >= 3) throw new CrmError('rate_limited', '今天已经发过几次了，请到邮箱里找一找（也看看垃圾邮件）');
  const { getResend, getFromAddress, isEmailConfigured } = await import('@/lib/email/resend-client');
  if (!isEmailConfigured()) throw new CrmError('email_unconfigured', '邮件暂时发不出去，请稍后再试');
  const files = await docFiles(d.id);
  const full = siteFileUrl(files.full ?? d.pdf_url, base);
  const mobile = siteFileUrl(d.pdf_url, base);
  const name = d.event_title ? shareTitleFor(d.event_title) : d.title;
  const res = await getResend().emails.send({
    from: getFromAddress(), to: me.email,
    subject: `【SAREC】${name}`,
    text: `${me.name || ''}您好，\n\n这是您在商会小程序里要的「${name}」：\n\nPDF 下载（原稿，电脑上看）：${full}\n${mobile && mobile !== full ? `手机版（小一些）：${mobile}\n` : ''}\n欢迎转发给朋友。\n\n中美房地产商会 SAREC`
  });
  if (res.error) throw new CrmError('send_failed', '邮件没发出去，请稍后再试');
  await db.query(`INSERT INTO chamber_doc_events (doc_id, kind, contact_id, channel) VALUES ($1, 'pdf', $2, 'email')`, [d.id, contactId]);
  await db.query(`UPDATE chamber_docs SET pdf_count = pdf_count + 1 WHERE id = $1`, [d.id]);
  const masked = me.email.replace(/^(.)[^@]*(@.*)$/, '$1***$2');
  return { to: masked, message: `已发到 ${masked}，几分钟内收到（没看到请看看垃圾邮件）` };
}
