/**
 * 活动相册（SAREC 1.2 第 C 节）
 * ------------------------------------------------------------------
 * - 工作人员在后台上传现场照片 → 自动转正方向、压缩、右下角加商会印章水印 → 存 Vercel Blob（大图 + 缩略图）。
 *   正式站存 prod/，预览 / 本地存 test/（测试数据方便清理，永远不混进正式相册）。
 * - 发布相册后：到场的人生成“照片已上传”通知。授权过订阅消息（photos 模板已配置）的推送服务通知；
 *   没授权或模板未配置的，在首页状态卡看到。重复发布、重试都不会重复推送。
 * - 照片授权：签到时勾选“同意现场照片用于商会宣传”（默认不勾），后台上传页显示谁同意了。
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { put, del } from '@vercel/blob';
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import { recordException, resolveException } from './followups';
import { pushPhotosNotice, subscribeTemplates } from './reminders';
import { wxConfigured } from './wechat';

export const BLOB_PREFIX = process.env.VERCEL_ENV === 'production' ? 'prod' : 'test';

export function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

let sealCache: Buffer | null = null;
async function seal(): Promise<Buffer> {
  if (!sealCache) sealCache = await readFile(path.join(process.cwd(), 'public', 'brand', 'sarec-seal-wm.png')); // 透明底（白底版会在照片上留一块白方块）
  return sealCache;
}

/** 加水印 + 压缩：长边 2000，JPEG q82；缩略图长边 640 */
export async function watermark(input: Buffer): Promise<{ full: Buffer; thumb: Buffer; width: number; height: number }> {
  const base = sharp(input, { failOn: 'none' }).rotate();
  const { data: big, info } = await base.resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const markW = Math.max(90, Math.round(Math.min(info.width, info.height) * 0.16));
  const sized = await sharp(await seal()).resize({ width: markW }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const markH = sized.info.height;
  const pad = Math.round(markW * 0.18);
  const left = Math.max(0, info.width - markW - pad);
  const top = Math.max(0, info.height - markH - pad);
  // 看右下角这块照片的亮度：偏暗（晚上活动照片常见）用象牙白印章，否则用深蓝印章
  const corner = await sharp(big).extract({ left, top, width: Math.min(markW, info.width - left), height: Math.min(markH, info.height - top) }).greyscale().stats();
  const dark = (corner.channels[0]?.mean ?? 255) < 120;
  const px = Buffer.from(sized.data);
  for (let i = 0; i < px.length; i += 4) {
    if (dark) { px[i] = 245; px[i + 1] = 238; px[i + 2] = 222; }
    px[i + 3] = Math.round(px[i + 3] * (dark ? 0.8 : 0.72));
  }
  const mark = await sharp(px, { raw: { width: markW, height: markH, channels: 4 } }).png().toBuffer();
  const full = await sharp(big)
    .composite([{ input: mark, left, top }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const thumb = await sharp(full).resize({ width: 640, height: 640, fit: 'inside' }).jpeg({ quality: 76, mozjpeg: true }).toBuffer();
  return { full, thumb, width: info.width, height: info.height };
}

/** 任意图片上传（活动封面、商会微信二维码、头像）：压缩后存 Blob，返回地址 */
export async function uploadImage(kind: 'cover' | 'qr' | 'avatar' | 'room' | 'prep', input: Buffer, opts: { maxSide?: number; png?: boolean } = {}): Promise<string> {
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  const max = opts.maxSide ?? 1600;
  const img = sharp(input, { failOn: 'none' }).rotate().resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true });
  const buf = opts.png ? await img.png().toBuffer() : await img.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  const ext = opts.png ? 'png' : 'jpg';
  const r = await put(`${BLOB_PREFIX}/${kind}/${randomUUID()}.${ext}`, buf, { access: 'public', contentType: opts.png ? 'image/png' : 'image/jpeg', addRandomSuffix: false });
  return r.url;
}

export async function uploadEventPhotos(actor: string, eventId: string, files: { name: string; data: Buffer }[]) {
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  const pool = getPool();
  const { rows: ev } = await pool.query(`SELECT id FROM events WHERE id = $1`, [eventId]);
  if (!ev[0]) throw new CrmError('not_found', '找不到这场活动');
  const { rows: maxSort } = await pool.query<{ n: number }>(`SELECT coalesce(max(sort_order), 0)::int AS n FROM event_photos WHERE event_id = $1`, [eventId]);
  let sort = maxSort[0].n;
  const saved: { id: string; url: string; thumbUrl: string }[] = [];
  const failed: string[] = [];
  for (const f of files) {
    try {
      const w = await watermark(f.data);
      const id = randomUUID();
      const dir = `${BLOB_PREFIX}/events/${eventId}`;
      const [full, thumb] = await Promise.all([
        put(`${dir}/${id}.jpg`, w.full, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false }),
        put(`${dir}/${id}-t.jpg`, w.thumb, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false })
      ]);
      sort += 1;
      await pool.query(
        `INSERT INTO event_photos (id, event_id, url, thumb_url, width, height, sort_order, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, eventId, full.url, thumb.url, w.width, w.height, sort, actor]
      );
      saved.push({ id, url: full.url, thumbUrl: thumb.url });
    } catch (e) {
      failed.push(f.name);
      await recordException('photo_upload', `photo_upload:${eventId}:${f.name}:${f.data.length}`, eventId, e instanceof Error ? e.message : 'upload failed');
    }
  }
  return { saved, failed };
}

export async function listEventPhotos(eventId: string, includeHidden = false) {
  const { rows } = await getPool().query(
    // 1.3：客户上传的照片默认不公开；只有“放进活动相册”且审核通过的才进相册；美颜版永远不进相册
    `SELECT id, url, thumb_url, width, height, caption, sort_order, is_hidden, created_at,
            uploader_contact_id IS NOT NULL AS by_customer, visibility, review_status
       FROM event_photos
      WHERE event_id = $1 AND variant_of IS NULL AND ($2 OR (NOT is_hidden AND visibility = 'album' AND review_status = 'ok'))
      ORDER BY sort_order, created_at`,
    [eventId, includeHidden]
  );
  return rows;
}

export async function updatePhoto(id: string, b: { hidden?: boolean; caption?: string | null; sort?: number }) {
  await getPool().query(
    `UPDATE event_photos SET is_hidden = COALESCE($2, is_hidden), caption = CASE WHEN $3::boolean THEN $4 ELSE caption END,
            sort_order = COALESCE($5, sort_order) WHERE id = $1`,
    [id, b.hidden ?? null, b.caption !== undefined, b.caption?.trim() || null, b.sort ?? null]
  );
}

export async function deletePhoto(id: string) {
  const { rows } = await getPool().query<{ url: string; thumb_url: string }>(`DELETE FROM event_photos WHERE id = $1 RETURNING url, thumb_url`, [id]);
  if (rows[0] && blobConfigured()) await del([rows[0].url, rows[0].thumb_url]).catch(() => undefined);
}

/** 照片授权名单：到场的人里谁同意了（后台上传页提示用） */
export async function consentSummary(eventId: string) {
  const { rows } = await getPool().query<{ name: string; photo_consent: boolean }>(
    `SELECT c.name, r.photo_consent FROM registrations r JOIN contacts c ON c.id = r.contact_id
      WHERE r.event_id = $1 AND r.arrival_status = 'checked_in' ORDER BY r.photo_consent DESC, c.name`,
    [eventId]
  );
  return { agreed: rows.filter((r) => r.photo_consent).map((r) => r.name), notAgreed: rows.filter((r) => !r.photo_consent).length };
}

/** 发布相册：记录发布时间 → 为到场的人生成通知 → 推送（幂等） */
export async function publishAlbum(eventId: string, recap?: string | null) {
  const pool = getPool();
  const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM event_photos WHERE event_id = $1 AND NOT is_hidden`, [eventId]);
  if (!rows[0].n) throw new CrmError('no_photos', '还没有可发布的照片');
  await pool.query(
    `UPDATE events SET album_published_at = COALESCE(album_published_at, now()), recap = COALESCE($2, recap), updated_at = now() WHERE id = $1`,
    [eventId, recap?.trim() || null]
  );
  return sendPhotoNotices(eventId);
}

/**
 * 生成并推送“照片已上传”通知。
 * - 授权过 photos 订阅（event_reminder_subs.kind = 'photos'，未用过）且模板已配置 → 推送服务通知，channel = subscribe；
 * - 其余 → channel = home（首页状态卡显示，看过即 seen）。
 * 每人每场只一条；已 sent 的不再推。失败记 failed 并进待处理，重试会再推失败的。
 */
export async function sendPhotoNotices(eventId: string): Promise<{ sent: number; home: number; failed: number }> {
  const pool = getPool();
  const { rows: ev } = await pool.query<{ slug: string; title: string; starts_at: Date; timezone: string; location_name: string | null; address: string | null }>(
    `SELECT slug, title, starts_at, timezone, location_name, address FROM events WHERE id = $1 AND album_published_at IS NOT NULL`,
    [eventId]
  );
  if (!ev[0]) return { sent: 0, home: 0, failed: 0 };
  await pool.query(
    `INSERT INTO event_photo_notices (event_id, contact_id, channel)
     SELECT r.event_id, r.contact_id,
            CASE WHEN EXISTS (SELECT 1 FROM event_reminder_subs s WHERE s.event_id = r.event_id AND s.contact_id = r.contact_id AND s.kind = 'photos' AND s.status = 'pending')
                 THEN 'subscribe' ELSE 'home' END
       FROM registrations r WHERE r.event_id = $1 AND r.arrival_status = 'checked_in'
     ON CONFLICT (event_id, contact_id) DO NOTHING`,
    [eventId]
  );
  const tmpl = subscribeTemplates().photos;
  const canPush = !!tmpl && wxConfigured();
  const { rows: due } = await pool.query<{ contact_id: string; openid: string; sub_id: string }>(
    `SELECT n.contact_id, s.openid, s.id AS sub_id FROM event_photo_notices n
       JOIN event_reminder_subs s ON s.event_id = n.event_id AND s.contact_id = n.contact_id AND s.kind = 'photos' AND s.status IN ('pending','failed')
      WHERE n.event_id = $1 AND n.channel = 'subscribe' AND n.status IN ('pending','failed')`,
    [eventId]
  );
  let sent = 0;
  let failed = 0;
  for (const d of due) {
    if (!canPush) {
      // 模板没配置：改为首页显示，不算失败
      await pool.query(`UPDATE event_photo_notices SET channel = 'home', status = 'pending' WHERE event_id = $1 AND contact_id = $2`, [eventId, d.contact_id]);
      continue;
    }
    // 先占位再推，避免并发重复推送
    const lock = await pool.query(`UPDATE event_reminder_subs SET status = 'sent', sent_at = now() WHERE id = $1 AND status IN ('pending','failed') RETURNING id`, [d.sub_id]);
    if (!lock.rowCount) continue;
    try {
      await pushPhotosNotice(tmpl!, d.openid, ev[0]);
      await pool.query(`UPDATE event_photo_notices SET status = 'sent', sent_at = now(), error = NULL WHERE event_id = $1 AND contact_id = $2`, [eventId, d.contact_id]);
      sent++;
    } catch (e) {
      const msg = (e instanceof Error ? e.message : 'error').slice(0, 200);
      await pool.query(`UPDATE event_reminder_subs SET status = 'failed', error = $2 WHERE id = $1`, [d.sub_id, msg]);
      await pool.query(`UPDATE event_photo_notices SET status = 'failed', error = $3 WHERE event_id = $1 AND contact_id = $2`, [eventId, d.contact_id, msg]);
      failed++;
    }
  }
  const key = `photo_notice:${eventId}`;
  if (failed) await recordException('photo_notice', key, eventId, `${failed} 条“照片已上传”通知推送失败`);
  else await resolveException(key, 'system');
  const { rows: h } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM event_photo_notices WHERE event_id = $1 AND channel = 'home'`, [eventId]);
  return { sent, home: h[0].n, failed };
}

/** 首页状态卡：没看过的相册通知（最近 30 天） */
export async function unseenAlbums(contactId: string) {
  const { rows } = await getPool().query<{ slug: string; title: string; cover: string | null; n: number }>(
    `SELECT e.slug, e.title, (SELECT p.thumb_url FROM event_photos p WHERE p.event_id = e.id AND NOT p.is_hidden ORDER BY p.sort_order LIMIT 1) AS cover,
            (SELECT count(*)::int FROM event_photos p WHERE p.event_id = e.id AND NOT p.is_hidden) AS n
       FROM event_photo_notices n JOIN events e ON e.id = n.event_id
      WHERE n.contact_id = $1 AND n.seen_at IS NULL AND e.album_published_at > now() - interval '30 days'
      ORDER BY e.album_published_at DESC LIMIT 3`,
    [contactId]
  );
  return rows;
}

export async function markAlbumSeen(contactId: string, slug: string) {
  await getPool().query(
    `UPDATE event_photo_notices n SET seen_at = now(), status = CASE WHEN n.status = 'pending' THEN 'seen' ELSE n.status END
       FROM events e WHERE e.id = n.event_id AND e.slug = $2 AND n.contact_id = $1 AND n.seen_at IS NULL`,
    [contactId, slug]
  );
}

/** 签到页：同意 / 不同意现场照片用于商会宣传（默认不同意；可随时改） */
export async function setPhotoConsent(contactId: string, slug: string, consent: boolean) {
  const { rowCount } = await getPool().query(
    `UPDATE registrations r SET photo_consent = $3, photo_consent_at = now(), updated_at = now()
       FROM events e WHERE e.id = r.event_id AND e.slug = $2 AND r.contact_id = $1 AND r.status <> 'cancelled'`,
    [contactId, slug, consent]
  );
  if (!rowCount) throw new CrmError('not_registered', '没有找到您这场的报名');
  return { consent };
}
