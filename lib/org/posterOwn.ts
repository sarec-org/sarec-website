/**
 * 1.7.0「传自己的海报」（开关 crm_settings.poster_upload_on，默认关；迁移 0053 的 org_poster_uploads / org_events.poster_own）。
 * ------------------------------------------------------------------
 * - 主办方（负责人 / 帮手）在小程序里传一张自己的图当海报底图：压缩后存 Blob（正式站 prod/、测试站 test/ 下的 org-poster/），
 *   同时交微信图片检测（imageGate.submitImage，target = org_poster:<id>，和头像、相册同一套：不通过的不能用、后台「内容管理 › 机器拦下的」能看到）。
 * - 必须说明这张图是不是 AI 生成的（aiGenerated）：是 → 成品图右上角照样画「AI 生成」标识；不是 → 不画
 *   （依据 ~/WeChatProjects/AI海报_微信规则核实.md 第一节 (c)）。
 * - ⚠ 二维码拦截还没做：仓库里没有二维码识别库，微信 mediaCheckAsync 也不查二维码。**打开开关前要补**（微信 imgQrcode 或本地识别库），
 *   否则主办方可以在自己的图里放别的二维码（收款码、群码）。
 * - 检测状态：还在检测（pending）的照常能出图（测试站没有微信密钥，一直是 pending）；不通过（risky / rejected）的不能用。
 */
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { BLOB_PREFIX } from '@/lib/crm/photos';
import { submitImage, urlStates } from '@/lib/crm/imageGate';
import type { Db } from '@/lib/crm/profile';
import { uploadOn } from './posterTemplates';
import { myOrgs } from './service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type OwnPoster = { id: string; contact_id: string; organizer_id: string | null; url: string; width: number | null; height: number | null; ai_generated: boolean };

/** 给小程序看的地址：走本站 /files/*（next.config.js 把它转到图片存储），小程序只认本站域名 */
export function ownPublicUrl(base: string, blobUrl: string): string {
  try {
    const u = new URL(blobUrl);
    if (u.hostname.endsWith('.public.blob.vercel-storage.com')) return `${base.replace(/\/$/, '')}/files${u.pathname}`;
  } catch { /* 原样 */ }
  return blobUrl;
}

export async function uploadOwnPoster(contactId: string, f: { file: Buffer; aiGenerated: unknown; org?: string | null }, base: string) {
  if (!(await uploadOn())) throw new CrmError('forbidden', '暂未开放');
  const orgs = await myOrgs(contactId);
  const m = f.org ? orgs.find((o) => o.id === f.org) : orgs[0];
  if (!m) throw new CrmError('forbidden', '您还不是开通的主办方');
  if (m.status !== 'active') throw new CrmError('forbidden', '主办方已停用，不能传海报');
  const ai = f.aiGenerated === true || f.aiGenerated === 'true' ? true : f.aiGenerated === false || f.aiGenerated === 'false' ? false : null;
  if (ai === null) throw new CrmError('bad_request', '请选这张图是不是 AI 生成的');
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  const meta = await sharp(f.file, { failOn: 'none' }).metadata().catch(() => null);
  if (!meta?.width || !meta?.height) throw new CrmError('bad_request', '这不是能识别的图片，请换一张（JPG / PNG）');
  if (Math.min(meta.width, meta.height) < 500) throw new CrmError('bad_request', '图片太小，请换一张清楚一点的（短边至少 500 像素）');
  const { data, info } = await sharp(f.file, { failOn: 'none' }).rotate().resize({ width: 1080, height: 2400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const id = randomUUID();
  const r = await put(`${BLOB_PREFIX}/org-poster/${id}.jpg`, data, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false });
  await getPool().query(
    `INSERT INTO org_poster_uploads (id, contact_id, organizer_id, url, width, height, ai_generated) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, contactId, m.id, r.url, info.width, info.height, ai]
  );
  // 微信图片检测（和头像、相册同一套）；没跑 0048 / 测试站没有微信密钥时只记 pending，不挡上传
  await submitImage(r.url, `org_poster:${id}`, contactId).catch((e) => console.error('[poster-upload] 检测没交上', e instanceof Error ? e.message : ''));
  return { ownId: id, url: ownPublicUrl(base, r.url) };
}

export async function getOwnPoster(id: string, db: Db = getPool()): Promise<OwnPoster | null> {
  if (!UUID.test(id)) return null;
  const { rows } = await db.query<OwnPoster>(`SELECT * FROM org_poster_uploads WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** 检测不通过的不能用 */
export async function ownPosterBlocked(p: OwnPoster): Promise<boolean> {
  const st = (await urlStates([p.url]).catch(() => new Map())).get(p.url);
  return st === 'risky' || st === 'rejected';
}

/**
 * 发布 / 改活动时带的 posterOwn（上传返回的 ownId，或上传返回的 url）：开关关着 → 403 暂未开放；
 * 只能用同一主办方（或本人）传的图；检测不通过的不能用。空 = 不用。
 */
export async function checkOwnForEvent(raw: unknown, contactId: string, organizerId: string, db: Db = getPool()): Promise<string | null> {
  if (raw == null || raw === '') return null;
  if (!(await uploadOn(db))) throw new CrmError('forbidden', '暂未开放');
  const v = String(raw).trim();
  let p: OwnPoster | null = null;
  if (UUID.test(v)) p = await getOwnPoster(v, db);
  else {
    const m = /\/org-poster\/([0-9a-f-]{36})\.jpg/i.exec(v);
    if (m) p = await getOwnPoster(m[1], db);
  }
  if (!p || (p.organizer_id !== organizerId && p.contact_id !== contactId)) throw new CrmError('bad_request', '找不到这张海报图，请重新传一张');
  if (await ownPosterBlocked(p)) throw new CrmError('bad_request', '这张图没通过微信的图片检测，请换一张');
  return p.id;
}
