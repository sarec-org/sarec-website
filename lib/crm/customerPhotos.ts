/**
 * 1.3 C：客户上传照片（秒级分享 + 去重 + 默认不公开）。
 * - 小程序先在手机上生成“分享成片”直接给用户转发（不等服务器）；同时后台上传压缩版（长边 1600），原图稍后再传。
 * - 去重：完全相同的照片（内容哈希）不重复存，直接返回已有那张；相似照片记 phash，后台分组、精选时用，不挡分享。
 * - 1.4.0（东哥定）：上传 = 进本场活动相册，所有人立刻能看到，不用工作人员批准、不用再点“放进相册”。
 *   只对 1.4.0 及以上的小程序生效；1.3.x 仍按旧规则（默认私人），见 uploadMyPhoto 的 opts.toAlbum。
 *   管理改成事后：工作人员可下架某张、禁止某人上传；上传的人可以删自己的。（1.3.x 以前传的“只有自己看得见”的照片不动。）
 * - 美颜版：只作为本人的分享版存一份（variant_of 指向原照片），不覆盖相册原图，去重时不当成两张。
 * - 服务器单次请求上限约 4.5MB：所谓“原图”是手机端压到长边 2560、质量 0.9 的高清版。
 */
import { createHash, randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import { BLOB_PREFIX, blobConfigured, isPhotoBanned, watermark } from './photos';

const MAX_BYTES = 4 * 1024 * 1024;

async function eventBySlug(slug: string) {
  const { rows } = await getPool().query<{ id: string; slug: string; title: string; starts_at: Date }>(`SELECT id, slug, title, starts_at FROM events WHERE slug = $1`, [slug]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  return rows[0];
}

/** 64 位差值哈希（9×8 灰度），相似照片的汉明距离小 */
async function dHash(buf: Buffer): Promise<string> {
  const px = await sharp(buf, { failOn: 'none' }).rotate().greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? '1' : '0';
  return BigInt('0b' + bits).toString(16).padStart(16, '0');
}

export type MyPhoto = { id: string; url: string; thumb: string; visibility: string; review: string; hasOriginal: boolean; duplicate?: boolean };

const toMine = (r: { id: string; url: string; thumb_url: string; visibility: string; review_status: string; original_url: string | null }, duplicate = false): MyPhoto => ({
  id: r.id, url: r.url, thumb: r.thumb_url, visibility: r.visibility, review: r.review_status, hasOriginal: !!r.original_url, ...(duplicate ? { duplicate: true } : {})
});

/**
 * opts.toAlbum：1.4.0 及以上的小程序 = true（上传即进相册）；1.3.x 及更早 = false（保持旧规则：默认只有自己看得见，
 * 勾了“放进活动相册”才公开）。1.3.4 的页面上写着“照片默认只有你自己看得到”，不能让它的用户以为私人、实际已公开。
 */
export async function uploadMyPhoto(contactId: string, slug: string, data: Buffer, opts: { toAlbum?: boolean } = {}): Promise<MyPhoto> {
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '照片存储暂时不可用，请稍后再试');
  if (!data.length) throw new CrmError('bad_request', '没有收到照片，请再试一次');
  if (data.length > MAX_BYTES) throw new CrmError('too_large', '这张照片太大了，请换一张');
  const ev = await eventBySlug(slug);
  if (await isPhotoBanned(contactId)) throw new CrmError('photo_banned', '您暂时不能上传照片。有疑问请在「联系商会」里找工作人员。');
  const pool = getPool();
  const hash = createHash('sha256').update(data).digest('hex');
  // 完全相同的照片：直接返回已有那张（谁传的都算，不重复存）
  const { rows: dup } = await pool.query(
    `SELECT id, url, thumb_url, visibility, review_status, original_url FROM event_photos WHERE event_id = $1 AND content_hash = $2 AND variant_of IS NULL`,
    [ev.id, hash]
  );
  if (dup[0]) return toMine(dup[0], true);
  const [w, ph] = await Promise.all([watermark(data), dHash(data).catch(() => null)]);
  const id = randomUUID();
  const dir = `${BLOB_PREFIX}/events/${ev.id}/u`;
  const [full, thumb] = await Promise.all([
    put(`${dir}/${id}.jpg`, w.full, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false }),
    put(`${dir}/${id}-t.jpg`, w.thumb, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false })
  ]);
  const { rows } = await pool.query(
    `INSERT INTO event_photos (id, event_id, url, thumb_url, width, height, sort_order, uploaded_by, uploader_contact_id, visibility, review_status, content_hash, phash)
     VALUES ($1, $2, $3, $4, $5, $6, 100000, 'customer', $7, $10, 'ok', $8, $9)
     ON CONFLICT (event_id, content_hash) WHERE content_hash IS NOT NULL AND variant_of IS NULL DO NOTHING
     RETURNING id, url, thumb_url, visibility, review_status, original_url`,
    [id, ev.id, full.url, thumb.url, w.width, w.height, contactId, hash, ph, opts.toAlbum ? 'album' : 'private']
  );
  if (rows[0]) return toMine(rows[0]);
  // 并发上传同一张：另一条请求先存进去了
  const { rows: again } = await pool.query(
    `SELECT id, url, thumb_url, visibility, review_status, original_url FROM event_photos WHERE event_id = $1 AND content_hash = $2 AND variant_of IS NULL`,
    [ev.id, hash]
  );
  return toMine(again[0], true);
}

async function ownPhoto(contactId: string, photoId: string) {
  if (!/^[0-9a-f-]{36}$/.test(photoId)) throw new CrmError('not_found', '找不到这张照片');
  const { rows } = await getPool().query<{ id: string; event_id: string; uploader_contact_id: string | null }>(
    `SELECT id, event_id, uploader_contact_id FROM event_photos WHERE id = $1 AND variant_of IS NULL`,
    [photoId]
  );
  if (!rows[0] || rows[0].uploader_contact_id !== contactId) throw new CrmError('not_found', '找不到这张照片');
  return rows[0];
}

/** 原图（高清版）稍后上传：只存一份地址，不进相册列表 */
export async function attachOriginal(contactId: string, photoId: string, data: Buffer) {
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '照片存储暂时不可用');
  if (data.length > MAX_BYTES) throw new CrmError('too_large', '原图太大，只保留了分享版');
  const p = await ownPhoto(contactId, photoId);
  const r = await put(`${BLOB_PREFIX}/events/${p.event_id}/u/${photoId}-o.jpg`, data, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false });
  await getPool().query(`UPDATE event_photos SET original_url = $2 WHERE id = $1`, [photoId, r.url]);
  return { ok: true };
}

/** 美颜版：本人分享用，关联原照片；不进相册、不参与去重 */
export async function attachVariant(contactId: string, photoId: string, data: Buffer) {
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '照片存储暂时不可用');
  if (data.length > MAX_BYTES) throw new CrmError('too_large', '这张太大了');
  const p = await ownPhoto(contactId, photoId);
  const id = randomUUID();
  const r = await put(`${BLOB_PREFIX}/events/${p.event_id}/u/${photoId}-b-${id.slice(0, 8)}.jpg`, data, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false });
  await getPool().query(
    `INSERT INTO event_photos (id, event_id, url, thumb_url, sort_order, uploaded_by, uploader_contact_id, visibility, review_status, variant_of, variant)
     VALUES ($1, $2, $3, $3, 100000, 'customer', $4, 'private', 'ok', $5, 'beauty')`,
    [id, p.event_id, r.url, contactId, photoId]
  );
  return { ok: true };
}

/** 放进活动相册 / 收回：本场已报名（未取消）的人自动通过；其他情况进后台待办 */
export async function setMyPhotoVisibility(contactId: string, photoId: string, toAlbum: boolean): Promise<MyPhoto> {
  const p = await ownPhoto(contactId, photoId);
  const pool = getPool();
  let review = 'ok';
  if (toAlbum) {
    const { rows } = await pool.query(`SELECT 1 FROM registrations WHERE event_id = $1 AND contact_id = $2 AND status <> 'cancelled'`, [p.event_id, contactId]);
    review = rows[0] ? 'ok' : 'review';
  }
  const { rows } = await pool.query(
    `UPDATE event_photos SET visibility = $2, review_status = CASE WHEN $2 = 'album' THEN $3 ELSE review_status END
      WHERE id = $1 RETURNING id, url, thumb_url, visibility, review_status, original_url`,
    [photoId, toAlbum ? 'album' : 'private', review]
  );
  return toMine(rows[0]);
}

export async function listMyPhotos(contactId: string, slug: string): Promise<MyPhoto[]> {
  const ev = await eventBySlug(slug);
  const { rows } = await getPool().query(
    `SELECT id, url, thumb_url, visibility, review_status, original_url FROM event_photos
      WHERE event_id = $1 AND uploader_contact_id = $2 AND variant_of IS NULL AND NOT is_hidden ORDER BY created_at DESC LIMIT 200`,
    [ev.id, contactId]
  );
  return rows.map((r) => toMine(r));
}

/** 1.4.0「我的照片」：我在所有活动传的照片，按活动分组（最新的活动在上） */
export async function listAllMyPhotos(contactId: string) {
  const { rows } = await getPool().query<{ id: string; url: string; thumb_url: string; visibility: string; review_status: string; original_url: string | null; slug: string; title: string; starts_at: Date }>(
    `SELECT p.id, p.url, p.thumb_url, p.visibility, p.review_status, p.original_url, e.slug, e.title, e.starts_at
       FROM event_photos p JOIN events e ON e.id = p.event_id
      WHERE p.uploader_contact_id = $1 AND p.variant_of IS NULL AND NOT p.is_hidden
      ORDER BY e.starts_at DESC, p.created_at DESC LIMIT 500`,
    [contactId]
  );
  const groups: { slug: string; title: string; startsAt: Date; photos: MyPhoto[] }[] = [];
  for (const r of rows) {
    let g = groups.find((x) => x.slug === r.slug);
    if (!g) groups.push((g = { slug: r.slug, title: r.title, startsAt: r.starts_at, photos: [] }));
    g.photos.push(toMine(r));
  }
  return groups;
}

export async function deleteMyPhoto(contactId: string, photoId: string) {
  await ownPhoto(contactId, photoId);
  await getPool().query(`UPDATE event_photos SET is_hidden = true, visibility = 'private' WHERE id = $1 OR variant_of = $1`, [photoId]);
  return { ok: true };
}

// ── 后台：照片待审（和名片审核放在同一个“内容审核”页）──────────────────

export async function listPhotosForReview(filter: string | null) {
  const { rows } = await getPool().query(
    `SELECT p.id, p.url, p.thumb_url, p.visibility, p.review_status, p.created_at, e.title AS event_title, e.slug, c.name AS uploader, c.member_no::int AS member_no
       FROM event_photos p JOIN events e ON e.id = p.event_id LEFT JOIN contacts c ON c.id = p.uploader_contact_id
      WHERE p.uploader_contact_id IS NOT NULL AND p.variant_of IS NULL AND NOT p.is_hidden
        AND ($1::text = 'all' OR ($1::text = 'review' AND p.review_status = 'review' AND p.visibility = 'album') OR ($1::text = 'album' AND p.visibility = 'album' AND p.review_status = 'ok'))
      ORDER BY (p.review_status = 'review') DESC, p.created_at DESC LIMIT 300`,
    [filter === 'all' || filter === 'album' ? filter : 'review']
  );
  const { rows: cnt } = await getPool().query<{ n: number }>(
    `SELECT count(*)::int AS n FROM event_photos WHERE review_status = 'review' AND visibility = 'album' AND variant_of IS NULL AND NOT is_hidden`
  );
  return { photos: rows, pending: cnt[0]?.n ?? 0 };
}

export async function reviewPhoto(photoId: string, action: string) {
  if (!/^[0-9a-f-]{36}$/.test(photoId)) throw new CrmError('bad_request', '找不到这张照片');
  if (action === 'approve') await getPool().query(`UPDATE event_photos SET review_status = 'ok' WHERE id = $1`, [photoId]);
  else if (action === 'reject') await getPool().query(`UPDATE event_photos SET review_status = 'rejected', visibility = 'private' WHERE id = $1`, [photoId]);
  else if (action === 'hide') await getPool().query(`UPDATE event_photos SET is_hidden = true, visibility = 'private' WHERE id = $1`, [photoId]);
  else throw new CrmError('bad_request', '不支持的操作');
  return { done: action };
}
