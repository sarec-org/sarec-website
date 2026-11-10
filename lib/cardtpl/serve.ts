/**
 * 名片卡面图（服务器出图）：按名片资料 + 模板出图，结果存 Blob（内容一变指纹就变，自动重出）。
 * fmt=share 转发用 5:4；thumb=1 模板库小图（同样是本人资料）；own=1 本人看（资料没填时中部有引导）。
 */
import { createHash } from 'node:crypto';
import { head, put } from '@vercel/blob';
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';
import { cardCodePng, cardTplBatches, publicCard } from '@/lib/crm/cards';
import { BLOB_PREFIX, blobConfigured } from '@/lib/crm/photos';
import { DEFAULT_TEMPLATE, findTemplate, templateHash } from './registry';
import { renderCard, type FitReport } from './render';
import { cardView } from './view';

const RENDER_V = 1; // 改了出图方式（尺寸、自检规则）就加 1，旧缓存作废

export async function qrDataUri(token: string): Promise<string | null> {
  try {
    const raw = await cardCodePng(token);
    // 微信小程序码转成 8 位 RGB 标准 PNG、白底（真机白方块的修正）
    const png = await sharp(raw).flatten({ background: '#FFFFFF' }).resize(480, 480, { fit: 'contain', background: '#FFFFFF' }).png({ palette: false }).toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (e) {
    console.log(`[card-image] qr failed token=${token.slice(0, 6)} ${(e as Error).message}`);
    return null;
  }
}

export type CardImageOpts = { tpl?: string | null; own?: boolean; share?: boolean; thumb?: boolean };

export async function cardImage(token: string, o: CardImageOpts): Promise<{ buf: Buffer; type: string; fit: FitReport | null; cached: boolean; tpl: number }> {
  const c = await publicCard(token);
  const batches = await cardTplBatches(getPool());
  let t = findTemplate(o.tpl) ?? findTemplate(c.template) ?? findTemplate(DEFAULT_TEMPLATE)!;
  if (t.batch > batches) t = findTemplate(DEFAULT_TEMPLATE)!;
  const qr = await qrDataUri(token);
  const v = cardView(
    {
      name: c.name, nameEn: c.nameEn, title: c.title, titleEn: c.titleEn, company: c.company, companyEn: c.companyEn,
      phone: c.phone, wechatId: c.wechatId, email: c.email, website: c.website, address: c.address ?? c.region,
      tierName: c.tierName, avatarUrl: c.avatarUrl, logoUrl: c.logoUrl
    },
    qr
  );
  const type = o.share || o.thumb ? 'jpeg' : 'png';
  const opts = o.share ? { fmt: 'share' as const, type: 'jpeg' as const } : o.thumb ? { width: 510, scale: 1, type: 'jpeg' as const } : { scale: 1.25, type: 'png' as const };
  const { qr: _q, qrImg: _qi, ...plain } = v;
  const key = createHash('sha256')
    .update(JSON.stringify({ RENDER_V, id: t.id, h: templateHash(t), plain, qr: qr ? createHash('sha1').update(qr).digest('hex') : null, own: !!o.own, opts }))
    .digest('hex')
    .slice(0, 40);
  const path = `${BLOB_PREFIX}/cardimg/${key}.${type === 'png' ? 'png' : 'jpg'}`;
  if (blobConfigured()) {
    try {
      const h = await head(path);
      const r = await fetch(h.url);
      if (r.ok) return { buf: Buffer.from(await r.arrayBuffer()), type: `image/${type}`, fit: null, cached: true, tpl: t.id };
    } catch {
      /* 还没出过 */
    }
  }
  const { buf, fit, ms } = await renderCard(t, v, { ...opts, own: !!o.own });
  console.log(`[card-image] tpl=${t.id} ${o.share ? 'share' : o.thumb ? 'thumb' : 'card'} ${ms}ms fit=${fit.ok ? 'ok' : 'overflow:' + fit.overflow.join('|')}`);
  if (blobConfigured()) await put(path, buf, { access: 'public', contentType: `image/${type}`, addRandomSuffix: false }).catch(() => undefined);
  return { buf, type: `image/${type}`, fit, cached: false, tpl: t.id };
}
